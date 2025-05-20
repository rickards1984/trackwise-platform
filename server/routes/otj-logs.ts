import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated, hasRole, isResourceOwner, canVerifyOtjLog } from "../middleware/auth";
import { insertOtjLogEntrySchema } from "../../shared/schema";

const router = Router();

// Get all OTJ logs for current user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    // @ts-ignore: session property added by express-session
    const userId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    let logs;
    
    // If learner, only get their own logs
    if (userRole === 'learner') {
      logs = await storage.getOtjLogEntriesByLearnerId(userId);
    } 
    // For assessors, training providers, IQAs, get logs for learners they're associated with
    else if (['assessor', 'training_provider', 'iqa'].includes(userRole)) {
      // Get all learner profiles associated with this user
      const associatedProfiles = await getLearnerProfilesForUser(userId, userRole);
      const learnerIds = associatedProfiles.map(profile => profile.userId);
      
      // Get logs for each learner
      logs = [];
      for (const learnerId of learnerIds) {
        const learnerLogs = await storage.getOtjLogEntriesByLearnerId(learnerId);
        logs = [...logs, ...learnerLogs];
      }
    }
    // For admins and operations, get all logs (with pagination)
    else {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      logs = await getAllOtjLogs(page, limit);
    }
    
    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching OTJ logs:", error);
    return res.status(500).json({ message: "An error occurred while fetching OTJ logs" });
  }
});

// Get OTJ logs for a specific learner (protected by role and association)
router.get("/learner/:learnerId", isAuthenticated, async (req, res) => {
  try {
    const learnerId = parseInt(req.params.learnerId);
    if (isNaN(learnerId)) {
      return res.status(400).json({ message: "Invalid learner ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const userId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    // Learners can only view their own logs
    if (userRole === 'learner' && userId !== learnerId) {
      return res.status(403).json({ message: "Forbidden - You can only view your own logs" });
    }
    
    // For assessors, training providers, IQAs, check if they're associated with this learner
    if (['assessor', 'training_provider', 'iqa'].includes(userRole) && userId !== learnerId) {
      const learnerProfile = await storage.getLearnerProfileByUserId(learnerId);
      
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      const isAssociated = 
        learnerProfile.tutorId === userId || 
        learnerProfile.iqaId === userId || 
        learnerProfile.trainingProviderId === userId;
        
      if (!isAssociated) {
        return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
      }
    }
    
    const logs = await storage.getOtjLogEntriesByLearnerId(learnerId);
    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching learner OTJ logs:", error);
    return res.status(500).json({ message: "An error occurred while fetching learner OTJ logs" });
  }
});

// Get OTJ logs for a date range (for a specific learner)
router.get("/date-range", isAuthenticated, async (req, res) => {
  try {
    const learnerId = parseInt(req.query.learnerId as string);
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    if (isNaN(learnerId) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid parameters" });
    }
    
    // @ts-ignore: session property added by express-session
    const userId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    // Learners can only view their own logs
    if (userRole === 'learner' && userId !== learnerId) {
      return res.status(403).json({ message: "Forbidden - You can only view your own logs" });
    }
    
    // For assessors, training providers, IQAs, check if they're associated with this learner
    if (['assessor', 'training_provider', 'iqa'].includes(userRole) && userId !== learnerId) {
      const learnerProfile = await storage.getLearnerProfileByUserId(learnerId);
      
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      const isAssociated = 
        learnerProfile.tutorId === userId || 
        learnerProfile.iqaId === userId || 
        learnerProfile.trainingProviderId === userId;
        
      if (!isAssociated) {
        return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
      }
    }
    
    const logs = await storage.getOtjLogEntriesByLearnerIdAndDateRange(learnerId, startDate, endDate);
    return res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching OTJ logs by date range:", error);
    return res.status(500).json({ message: "An error occurred while fetching OTJ logs by date range" });
  }
});

// Get a specific OTJ log by ID
router.get("/:id", isAuthenticated, isResourceOwner('otj-log'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    const log = await storage.getOtjLogEntry(logId);
    if (!log) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    return res.status(200).json(log);
  } catch (error) {
    console.error("Error fetching OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while fetching OTJ log" });
  }
});

// Create a new OTJ log entry
router.post("/", isAuthenticated, async (req, res) => {
  try {
    // @ts-ignore: session property added by express-session
    const userId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    const logData = insertOtjLogEntrySchema.parse(req.body);
    
    // Ensure learner can only create logs for themselves
    if (userRole === 'learner' && logData.learnerId !== userId) {
      return res.status(403).json({ message: "Forbidden - You can only create logs for yourself" });
    }
    
    // For non-learners creating logs for a learner, check association
    if (userRole !== 'learner' && userRole !== 'admin' && userRole !== 'operations') {
      const learnerProfile = await storage.getLearnerProfileByUserId(logData.learnerId);
      
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      const isAssociated = 
        learnerProfile.tutorId === userId || 
        learnerProfile.iqaId === userId || 
        learnerProfile.trainingProviderId === userId;
        
      if (!isAssociated) {
        return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
      }
    }
    
    const newLog = await storage.createOtjLogEntry(logData);
    return res.status(201).json(newLog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while creating OTJ log" });
  }
});

// Update an OTJ log entry
router.patch("/:id", isAuthenticated, isResourceOwner('otj-log'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const userRole = req.session.user.role;
    
    // Get the existing log
    const existingLog = await storage.getOtjLogEntry(logId);
    if (!existingLog) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    // Only allow updates to draft logs or if user is admin/operations
    if (existingLog.status !== 'draft' && userRole !== 'admin' && userRole !== 'operations') {
      return res.status(403).json({ message: "Forbidden - Cannot update a submitted or verified log" });
    }
    
    const updateData = req.body;
    const updatedLog = await storage.updateOtjLogEntry(logId, updateData);
    
    return res.status(200).json(updatedLog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while updating OTJ log" });
  }
});

// Delete an OTJ log entry (only for draft status)
router.delete("/:id", isAuthenticated, isResourceOwner('otj-log'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const userRole = req.session.user.role;
    
    // Get the existing log
    const existingLog = await storage.getOtjLogEntry(logId);
    if (!existingLog) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    // Only allow deletion of draft logs or if user is admin/operations
    if (existingLog.status !== 'draft' && userRole !== 'admin' && userRole !== 'operations') {
      return res.status(403).json({ message: "Forbidden - Cannot delete a submitted or verified log" });
    }
    
    await storage.deleteOtjLogEntry(logId);
    
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while deleting OTJ log" });
  }
});

// Submit an OTJ log for verification
router.post("/:id/submit", isAuthenticated, isResourceOwner('otj-log'), async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    // Get the existing log
    const existingLog = await storage.getOtjLogEntry(logId);
    if (!existingLog) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    // Only allow submission of draft logs
    if (existingLog.status !== 'draft') {
      return res.status(400).json({ message: "Only draft logs can be submitted" });
    }
    
    const updatedLog = await storage.updateOtjLogEntry(logId, { status: 'submitted' });
    
    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error("Error submitting OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while submitting OTJ log" });
  }
});

// Verify an OTJ log (first level verification - by assessor/training provider)
router.post("/:id/verify", isAuthenticated, canVerifyOtjLog, async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const verifierId = req.session.user.userId;
    
    // Get the existing log
    const existingLog = await storage.getOtjLogEntry(logId);
    if (!existingLog) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    // Only allow verification of submitted logs
    if (existingLog.status !== 'submitted') {
      return res.status(400).json({ message: "Only submitted logs can be verified" });
    }
    
    // Check if verifier is associated with the learner
    const learnerProfile = await storage.getLearnerProfileByUserId(existingLog.learnerId);
    if (!learnerProfile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }
    
    // Prevent users from verifying their own logs
    if (verifierId === existingLog.learnerId) {
      return res.status(403).json({ message: "Forbidden - You cannot verify your own logs" });
    }
    
    const isAssociated = 
      learnerProfile.tutorId === verifierId || 
      learnerProfile.trainingProviderId === verifierId;
      
    if (!isAssociated) {
      return res.status(403).json({ message: "Forbidden - You are not authorized to verify this learner's logs" });
    }
    
    const updatedLog = await storage.verifyOtjLogEntry(logId, verifierId);
    
    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error("Error verifying OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while verifying OTJ log" });
  }
});

// IQA Verify an OTJ log (second level verification - by IQA)
router.post("/:id/iqa-verify", isAuthenticated, canVerifyOtjLog, async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const iqaVerifierId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    // Only IQAs can perform IQA verification
    if (userRole !== 'iqa') {
      return res.status(403).json({ message: "Forbidden - Only IQAs can perform IQA verification" });
    }
    
    // Get the existing log
    const existingLog = await storage.getOtjLogEntry(logId);
    if (!existingLog) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    // Only allow IQA verification of already verified logs
    if (existingLog.status !== 'approved' || !existingLog.verifierId) {
      return res.status(400).json({ message: "Log must be verified by an assessor/training provider first" });
    }
    
    // Check if IQA is associated with the learner
    const learnerProfile = await storage.getLearnerProfileByUserId(existingLog.learnerId);
    if (!learnerProfile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }
    
    // Prevent IQAs from verifying their own logs
    if (iqaVerifierId === existingLog.learnerId) {
      return res.status(403).json({ message: "Forbidden - You cannot verify your own logs" });
    }
    
    if (learnerProfile.iqaId !== iqaVerifierId) {
      return res.status(403).json({ message: "Forbidden - You are not the IQA for this learner" });
    }
    
    const updatedLog = await storage.iqaVerifyOtjLogEntry(logId, iqaVerifierId);
    
    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error("Error IQA verifying OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while IQA verifying OTJ log" });
  }
});

// Reject an OTJ log
router.post("/:id/reject", isAuthenticated, canVerifyOtjLog, async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    if (isNaN(logId)) {
      return res.status(400).json({ message: "Invalid log ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const verifierId = req.session.user.userId;
    
    // Get the existing log
    const existingLog = await storage.getOtjLogEntry(logId);
    if (!existingLog) {
      return res.status(404).json({ message: "OTJ log not found" });
    }
    
    // Only allow rejection of submitted logs
    if (existingLog.status !== 'submitted') {
      return res.status(400).json({ message: "Only submitted logs can be rejected" });
    }
    
    // Check if verifier is associated with the learner
    const learnerProfile = await storage.getLearnerProfileByUserId(existingLog.learnerId);
    if (!learnerProfile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }
    
    const isAssociated = 
      learnerProfile.tutorId === verifierId || 
      learnerProfile.trainingProviderId === verifierId || 
      learnerProfile.iqaId === verifierId;
      
    if (!isAssociated) {
      return res.status(403).json({ message: "Forbidden - You are not authorized to reject this learner's logs" });
    }
    
    // Require feedback for rejected entries
    const { feedbackMessage } = req.body;
    if (!feedbackMessage || feedbackMessage.trim() === '') {
      return res.status(400).json({ message: "Feedback message is required when rejecting a log" });
    }
    
    // Update log status to rejected
    const updatedLog = await storage.updateOtjLogEntry(logId, { status: 'rejected' });
    
    // Create feedback entry
    await storage.createFeedbackItem({
      senderId: verifierId,
      recipientId: existingLog.learnerId,
      message: feedbackMessage,
      date: new Date(),
      relatedItemType: 'otj_log',
      relatedItemId: logId,
    });
    
    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error("Error rejecting OTJ log:", error);
    return res.status(500).json({ message: "An error occurred while rejecting OTJ log" });
  }
});

// Get summary statistics for OTJ logs by learner
router.get("/stats/:learnerId", isAuthenticated, async (req, res) => {
  try {
    const learnerId = parseInt(req.params.learnerId);
    if (isNaN(learnerId)) {
      return res.status(400).json({ message: "Invalid learner ID" });
    }
    
    // @ts-ignore: session property added by express-session
    const userId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    // Learners can only view their own stats
    if (userRole === 'learner' && userId !== learnerId) {
      return res.status(403).json({ message: "Forbidden - You can only view your own stats" });
    }
    
    // For non-admin roles, check association with learner
    if (!['admin', 'operations'].includes(userRole) && userId !== learnerId) {
      const learnerProfile = await storage.getLearnerProfileByUserId(learnerId);
      
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      const isAssociated = 
        learnerProfile.tutorId === userId || 
        learnerProfile.iqaId === userId || 
        learnerProfile.trainingProviderId === userId;
        
      if (!isAssociated) {
        return res.status(403).json({ message: "Forbidden - You are not associated with this learner" });
      }
    }
    
    // Get all logs for this learner
    const logs = await storage.getOtjLogEntriesByLearnerId(learnerId);
    
    // Get learner's apprenticeship standard to determine minimum required hours
    const learnerProfile = await storage.getLearnerProfileByUserId(learnerId);
    if (!learnerProfile) {
      return res.status(404).json({ message: "Learner profile not found" });
    }
    
    const standard = await storage.getApprenticeshipStandard(learnerProfile.standardId);
    if (!standard) {
      return res.status(404).json({ message: "Apprenticeship standard not found" });
    }
    
    const minimumWeeklyHours = standard.minimumOtjHours;
    
    // Calculate statistics
    const totalHours = logs.reduce((sum, log) => sum + log.hours, 0);
    const verifiedHours = logs
      .filter(log => log.status === 'approved')
      .reduce((sum, log) => sum + log.hours, 0);
    
    // Group logs by week and calculate progress against weekly targets
    const weeklyStats = calculateWeeklyStats(logs, learnerProfile.startDate, minimumWeeklyHours);
    
    // Group logs by KSB
    const ksbStats = calculateKsbStats(logs);
    
    return res.status(200).json({
      totalHours,
      verifiedHours,
      weeklyStats,
      ksbStats,
      minimumWeeklyHours,
    });
  } catch (error) {
    console.error("Error fetching OTJ log stats:", error);
    return res.status(500).json({ message: "An error occurred while fetching OTJ log stats" });
  }
});

// Helper functions
async function getLearnerProfilesForUser(userId: number, role: string) {
  let profiles = [];
  
  if (role === 'assessor') {
    profiles = await storage.getLearnerProfilesByTutorId(userId);
  } else if (role === 'training_provider') {
    profiles = await storage.getLearnerProfilesByProviderId(userId);
  } else if (role === 'iqa') {
    profiles = await storage.getLearnerProfilesByIqaId(userId);
  }
  
  return profiles;
}

async function getAllOtjLogs(page: number, limit: number) {
  // This would be implemented in the storage layer
  // For now, we'll return an empty array as a placeholder
  return [];
}

function calculateWeeklyStats(logs: any[], startDate: Date, minimumWeeklyHours: number) {
  // Placeholder implementation - this would calculate weekly progress
  return [];
}

function calculateKsbStats(logs: any[]) {
  // Placeholder implementation - this would calculate KSB coverage
  return [];
}

export default router;