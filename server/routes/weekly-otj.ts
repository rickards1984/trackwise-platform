import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertWeeklyOtjTrackingSchema } from "../../shared/schema";
import { UserRole } from "../../shared/enums";
import "../../shared/types"; // Import session typing

const router = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session.user?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is an assessor/tutor
const requireTutor = (req: Request, res: Response, next: Function) => {
  const userRole = req.session.user?.role;
  
  if (!req.session.user?.userId || 
      ![UserRole.ASSESSOR, UserRole.TRAINING_PROVIDER, UserRole.ADMIN, UserRole.IQA].includes(userRole as UserRole)) {
    return res.status(403).json({ message: "Forbidden: Tutor access required" });
  }
  next();
};

// Get weekly tracking record by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const weeklyTracking = await storage.getWeeklyOtjTracking(id);
    if (!weeklyTracking) {
      return res.status(404).json({ message: "Weekly OTJ tracking record not found" });
    }

    return res.json(weeklyTracking);
  } catch (error) {
    console.error("Error fetching weekly OTJ tracking:", error);
    return res.status(500).json({ message: "Error fetching weekly OTJ tracking record" });
  }
});

// Get all weekly tracking records for a learner
router.get("/learner/:learnerId", requireAuth, async (req, res) => {
  try {
    const learnerId = parseInt(req.params.learnerId);
    if (isNaN(learnerId)) {
      return res.status(400).json({ message: "Invalid learner ID format" });
    }

    // Check if the requesting user is the learner or has permission
    const currentUserId = req.session.user?.userId;
    const userRole = req.session.user?.role as UserRole;
    
    if (currentUserId !== learnerId && 
        ![UserRole.ASSESSOR, UserRole.TRAINING_PROVIDER, UserRole.ADMIN, UserRole.IQA].includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: You don't have permission to view this data" });
    }

    const weeklyTrackings = await storage.getWeeklyOtjTrackingsByLearnerId(learnerId);
    return res.json(weeklyTrackings);
  } catch (error) {
    console.error("Error fetching weekly OTJ tracking records:", error);
    return res.status(500).json({ message: "Error fetching weekly OTJ tracking records" });
  }
});

// Get weekly tracking record for a specific week
router.get("/learner/:learnerId/week/:weekDate", requireAuth, async (req, res) => {
  try {
    const learnerId = parseInt(req.params.learnerId);
    if (isNaN(learnerId)) {
      return res.status(400).json({ message: "Invalid learner ID format" });
    }

    // Parse the date parameter
    const weekDate = new Date(req.params.weekDate);
    if (isNaN(weekDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD" });
    }

    // Check if the requesting user is the learner or has permission
    const currentUserId = req.session.user?.userId;
    const userRole = req.session.user?.role as UserRole;
    
    if (currentUserId !== learnerId && 
        ![UserRole.ASSESSOR, UserRole.TRAINING_PROVIDER, UserRole.ADMIN, UserRole.IQA].includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: You don't have permission to view this data" });
    }

    const weeklyTracking = await storage.getWeeklyOtjTrackingByLearnerIdAndWeek(learnerId, weekDate);
    if (!weeklyTracking) {
      return res.status(404).json({ message: "Weekly OTJ tracking record not found for this week" });
    }

    return res.json(weeklyTracking);
  } catch (error) {
    console.error("Error fetching weekly OTJ tracking for week:", error);
    return res.status(500).json({ message: "Error fetching weekly OTJ tracking for week" });
  }
});

// Create a new weekly tracking record
router.post("/", requireAuth, async (req, res) => {
  try {
    // Validate the request body
    const validationResult = insertWeeklyOtjTrackingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validationResult.error.format() 
      });
    }

    const weeklyTrackingData = validationResult.data;
    
    // Check if the user is creating a record for themselves or has proper permissions
    const currentUserId = req.session.user?.userId;
    const userRole = req.session.user?.role as UserRole;
    
    if (currentUserId !== weeklyTrackingData.learnerId && 
        ![UserRole.ASSESSOR, UserRole.TRAINING_PROVIDER, UserRole.ADMIN, UserRole.IQA].includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: You don't have permission to create this record" });
    }

    // Calculate if the minimum hours requirement is met
    const metRequirement = weeklyTrackingData.totalHours >= weeklyTrackingData.minimumRequiredHours;
    const status = metRequirement ? 'complete' : 'incomplete';
    
    // Create the weekly tracking record
    const weeklyTracking = await storage.createWeeklyOtjTracking({
      ...weeklyTrackingData,
      metRequirement,
      status,
    });

    return res.status(201).json(weeklyTracking);
  } catch (error) {
    console.error("Error creating weekly OTJ tracking:", error);
    return res.status(500).json({ message: "Error creating weekly OTJ tracking record" });
  }
});

// Update a weekly tracking record
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Get the existing record
    const existingTracking = await storage.getWeeklyOtjTracking(id);
    if (!existingTracking) {
      return res.status(404).json({ message: "Weekly OTJ tracking record not found" });
    }

    // Check if the user is updating their own record or has proper permissions
    const currentUserId = req.session.user?.userId;
    const userRole = req.session.user?.role as UserRole;
    
    if (currentUserId !== existingTracking.learnerId && 
        ![UserRole.ASSESSOR, UserRole.TRAINING_PROVIDER, UserRole.ADMIN, UserRole.IQA].includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: You don't have permission to update this record" });
    }

    // Validate the update data
    const updateSchema = insertWeeklyOtjTrackingSchema.partial();
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid update data", 
        errors: validationResult.error.format() 
      });
    }

    const updateData = validationResult.data;
    
    // Calculate if the minimum hours requirement is met (if hours are being updated)
    let metRequirement = existingTracking.metRequirement;
    let status = existingTracking.status;
    
    if (updateData.totalHours !== undefined) {
      const minimumHours = updateData.minimumRequiredHours || existingTracking.minimumRequiredHours;
      metRequirement = updateData.totalHours >= minimumHours;
      status = metRequirement ? 'complete' : 'incomplete';
    }
    
    // Update the weekly tracking record
    const updatedTracking = await storage.updateWeeklyOtjTracking(id, {
      ...updateData,
      metRequirement,
      status,
    });

    return res.json(updatedTracking);
  } catch (error) {
    console.error("Error updating weekly OTJ tracking:", error);
    return res.status(500).json({ message: "Error updating weekly OTJ tracking record" });
  }
});

// Tutor review of weekly tracking
router.post("/:id/review", requireTutor, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Validate the review notes
    const reviewSchema = z.object({
      notes: z.string().optional(),
    });
    
    const validationResult = reviewSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid review data", 
        errors: validationResult.error.format() 
      });
    }

    const { notes } = validationResult.data;
    const tutorId = req.session.user?.userId;
    
    if (!tutorId) {
      return res.status(401).json({ message: "Unauthorized: Invalid session" });
    }

    // Get the weekly tracking record to check permissions
    const weeklyTracking = await storage.getWeeklyOtjTracking(id);
    if (!weeklyTracking) {
      return res.status(404).json({ message: "Weekly OTJ tracking record not found" });
    }

    // Prevent tutors from reviewing their own logs
    if (tutorId === weeklyTracking.learnerId) {
      return res.status(400).json({ message: "Tutors cannot review their own logs" });
    }

    // Perform the review
    const reviewedTracking = await storage.reviewWeeklyOtjTracking(id, tutorId, notes);
    if (!reviewedTracking) {
      return res.status(404).json({ message: "Weekly OTJ tracking record not found" });
    }

    return res.json(reviewedTracking);
  } catch (error) {
    console.error("Error reviewing weekly OTJ tracking:", error);
    return res.status(500).json({ message: "Error reviewing weekly OTJ tracking record" });
  }
});

export default router;