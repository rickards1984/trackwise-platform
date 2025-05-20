import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertTwelveWeeklyReviewSchema } from '@shared/schema';

const router = Router();

// Get a specific review by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await storage.getTwelveWeeklyReview(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    return res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reviews for a learner
router.get('/learner/:learnerId', async (req: Request, res: Response) => {
  try {
    const learnerId = parseInt(req.params.learnerId);
    if (isNaN(learnerId)) {
      return res.status(400).json({ message: 'Invalid learner ID' });
    }

    const reviews = await storage.getTwelveWeeklyReviewsByLearnerId(learnerId);
    return res.json(reviews);
  } catch (error) {
    console.error('Error fetching learner reviews:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get reviews for a tutor
router.get('/tutor/:tutorId', async (req: Request, res: Response) => {
  try {
    const tutorId = parseInt(req.params.tutorId);
    if (isNaN(tutorId)) {
      return res.status(400).json({ message: 'Invalid tutor ID' });
    }

    const reviews = await storage.getTwelveWeeklyReviewsByTutorId(tutorId);
    return res.json(reviews);
  } catch (error) {
    console.error('Error fetching tutor reviews:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get upcoming reviews within a certain timeframe
router.get('/upcoming/:days', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.params.days) || 30; // Default to 30 days if not specified
    const reviews = await storage.getUpcomingTwelveWeeklyReviews(days);
    return res.json(reviews);
  } catch (error) {
    console.error('Error fetching upcoming reviews:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new review
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body against schema
    const validationResult = insertTwelveWeeklyReviewSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid review data', 
        errors: validationResult.error.errors 
      });
    }

    const review = await storage.createTwelveWeeklyReview(validationResult.data);
    return res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an existing review
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    // Validate partial request body against schema
    const partialSchema = insertTwelveWeeklyReviewSchema.partial();
    const validationResult = partialSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid review data', 
        errors: validationResult.error.errors 
      });
    }

    const updatedReview = await storage.updateTwelveWeeklyReview(id, validationResult.data);
    if (!updatedReview) {
      return res.status(404).json({ message: 'Review not found' });
    }

    return res.json(updatedReview);
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Sign a review
router.post('/:id/sign', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const { role, userId } = req.body;
    
    // Get the current session user
    const sessionData = req.session as any;
    if (!sessionData.userId) {
      return res.status(401).json({ message: 'Unauthorized: You must be logged in to sign a review' });
    }
    
    // Ensure the user is signing as themselves or has admin/iqa privileges
    if (userId !== sessionData.userId && !['admin', 'iqa'].includes(sessionData.role)) {
      return res.status(403).json({ message: 'Forbidden: You can only sign as yourself unless you are an admin/IQA' });
    }

    // Validate role using the enum from shared/enums.ts
    if (!['learner', 'employer', 'tutor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be learner, employer, or tutor' });
    }

    // Validate userId
    if (typeof userId !== 'number' || isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Get the review to verify the user is associated with it
    const review = await storage.getTwelveWeeklyReview(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if the user is associated with this review in the specified role
    let authorized = false;
    if (role === 'learner' && review.learnerId === userId) {
      authorized = true;
    } else if (role === 'tutor' && review.tutorId === userId) {
      authorized = true;
    } else if (role === 'employer' && review.employerId === userId) {
      authorized = true;
    } else if (['admin', 'iqa'].includes(sessionData.role)) {
      // Admins and IQAs can sign on behalf of others
      authorized = true;
    }
    
    if (!authorized) {
      return res.status(403).json({ 
        message: `Forbidden: You are not associated with this review as a ${role}` 
      });
    }

    const signedReview = await storage.signTwelveWeeklyReview(id, role, userId);
    if (!signedReview) {
      return res.status(500).json({ message: 'Failed to sign review' });
    }

    return res.json(signedReview);
  } catch (error) {
    console.error('Error signing review:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Reschedule a review
router.post('/:id/reschedule', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const { newDate } = req.body;

    // Validate newDate
    if (!newDate || isNaN(new Date(newDate).getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Get the current session user data
    if (!req.session.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized: You must be logged in to reschedule a review' });
    }
    
    // Verify the review exists
    const review = await storage.getTwelveWeeklyReview(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if user has permission to reschedule the review
    const userId = req.session.user.userId;
    const userRole = req.session.user.role;
    
    // Only tutor, admin, or iqa can reschedule
    const isAuthorized = 
      review.tutorId === userId || 
      ['admin', 'iqa'].includes(userRole);
    
    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Forbidden: Only tutors, admins, or IQAs can reschedule reviews' 
      });
    }

    const rescheduledReview = await storage.rescheduleTwelveWeeklyReview(id, new Date(newDate));
    if (!rescheduledReview) {
      return res.status(500).json({ message: 'Failed to reschedule review' });
    }

    return res.json(rescheduledReview);
  } catch (error) {
    console.error('Error rescheduling review:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;