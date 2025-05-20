import express, { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { handleUserMessage, generateResourceRecommendations, analyzeApprenticeshipStandard } from '../ai-assistant';
import { insertAiAssistantConversationSchema } from '@shared/schema';

const router = express.Router();

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

/**
 * Send a message to the AI assistant
 */
router.post('/message', requireAuth, async (req, res) => {
  try {
    // Validate request body
    const messageData = z.object({
      message: z.string().min(1, "Message cannot be empty"),
    }).parse(req.body);

    const userId = req.session.userId!;

    // Get learning goals and KSB elements for context
    const learnerProfile = await storage.getLearnerProfileByUserId(userId);
    let ksbElements = [];
    let learningGoals = [];

    if (learnerProfile) {
      ksbElements = await storage.getKsbElementsByStandard(learnerProfile.standardId);
      learningGoals = await storage.getLearningGoalsByLearnerId(learnerProfile.id);
    }

    // Get weekly OTJ data if available
    const currentDate = new Date();
    const firstDayOfWeek = new Date(currentDate);
    firstDayOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Start with Monday
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // End with Sunday

    let otjHoursThisWeek = 0;
    let minimumWeeklyOtjHours = 6; // Default

    if (learnerProfile) {
      const weeklyTracking = await storage.getWeeklyOtjTrackingByLearnerIdAndWeek(
        learnerProfile.id,
        firstDayOfWeek,
        lastDayOfWeek
      );
      
      if (weeklyTracking) {
        otjHoursThisWeek = weeklyTracking.totalHours;
        minimumWeeklyOtjHours = weeklyTracking.minimumRequiredHours;
      }

      const standard = await storage.getApprenticeshipStandard(learnerProfile.standardId);
      if (standard) {
        minimumWeeklyOtjHours = Math.floor(standard.minimumOtjHours / 52); // Divide annual hours by 52 weeks
      }
    }

    // Call the AI assistant handler
    const response = await handleUserMessage({
      userId,
      message: messageData.message,
      ksbElements,
      learningGoals,
      otjHoursThisWeek,
      minimumWeeklyOtjHours
    });

    // Save the conversation
    await storage.createAiAssistantConversation({
      userId,
      message: messageData.message,
      response: response.text,
      metadata: response.metadata
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error("AI Assistant message error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid message data", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to process message" });
  }
});

/**
 * Get conversation history for a user
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const conversations = await storage.getAiAssistantConversationsByUserId(userId);
    
    return res.status(200).json(conversations);
  } catch (error) {
    console.error("Get AI conversation history error:", error);
    return res.status(500).json({ message: "Failed to fetch conversation history" });
  }
});

/**
 * Get/update AI assistant configuration for a user
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const config = await storage.getAiAssistantConfig(userId);
    
    if (!config) {
      // Create default config if none exists
      const newConfig = await storage.createOrUpdateAiAssistantConfig({
        userId,
        enabled: true,
        reminderFrequency: 'weekly',
        reminderChannels: ['email', 'in_app']
      });
      return res.status(200).json(newConfig);
    }
    
    return res.status(200).json(config);
  } catch (error) {
    console.error("Get AI assistant config error:", error);
    return res.status(500).json({ message: "Failed to fetch AI assistant configuration" });
  }
});

router.put('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    
    // Validate config data
    const configData = z.object({
      enabled: z.boolean().optional(),
      reminderFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      reminderChannels: z.array(z.string()).optional(),
      personalizedSettings: z.any().optional(),
    }).parse(req.body);
    
    const config = await storage.createOrUpdateAiAssistantConfig({
      userId,
      ...configData
    });
    
    return res.status(200).json(config);
  } catch (error) {
    console.error("Update AI assistant config error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to update AI assistant configuration" });
  }
});

/**
 * Generate resource recommendations based on KSBs
 */
router.post('/recommend-resources', requireAuth, async (req, res) => {
  try {
    const data = z.object({
      ksbIds: z.array(z.number()).min(1, "At least one KSB ID is required"),
    }).parse(req.body);
    
    const userId = req.session.userId!;
    const recommendations = await generateResourceRecommendations(userId, data.ksbIds);
    
    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error("Resource recommendation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to generate resource recommendations" });
  }
});

/**
 * Analyze an apprenticeship standard document (admin only)
 */
router.post('/analyze-standard', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.session.role !== 'admin' && req.session.role !== 'training_provider') {
      return res.status(403).json({ message: "Forbidden: Only admins and training providers can analyze standards" });
    }
    
    const data = z.object({
      standardText: z.string().min(1, "Standard text cannot be empty"),
    }).parse(req.body);
    
    const analysis = await analyzeApprenticeshipStandard(data.standardText);
    
    return res.status(200).json(analysis);
  } catch (error) {
    console.error("Standard analysis error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    return res.status(500).json({ message: "Failed to analyze apprenticeship standard" });
  }
});

export default router;