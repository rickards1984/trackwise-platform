import express from 'express';
import { storage } from '../storage';
import { asyncHandler } from '../middleware/errorHandler';
import { validate } from '../middleware/validate';
import { format, parseISO, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { z } from 'zod';

const router = express.Router();

// Date range validation schema
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeframe: z.enum(['week', 'month', 'quarter', 'year']).optional(),
});

// Helper function to calculate date range based on timeframe
function getDateRange(timeframe?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  
  if (startDate && endDate) {
    return {
      start: parseISO(startDate),
      end: parseISO(endDate)
    };
  }
  
  switch (timeframe) {
    case 'week':
      return {
        start: startOfWeek(now),
        end: endOfWeek(now)
      };
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    case 'quarter':
      const quarterStart = new Date(now);
      quarterStart.setMonth(Math.floor(now.getMonth() / 3) * 3);
      quarterStart.setDate(1);
      
      const quarterEnd = new Date(quarterStart);
      quarterEnd.setMonth(quarterStart.getMonth() + 3);
      quarterEnd.setDate(0);
      
      return {
        start: quarterStart,
        end: quarterEnd
      };
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      return {
        start: yearStart,
        end: yearEnd
      };
    default:
      // Default to last 7 days
      return {
        start: subDays(now, 7),
        end: now
      };
  }
}

// Get weekly OTJ hours
router.get('/weekly-otj', validate(dateRangeSchema), asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query as any;
  const { start, end } = getDateRange(timeframe, startDate, endDate);
  
  // Fetch all OTJ logs within date range from DB
  const otjLogs = await storage.getOtjLogEntriesByDateRange(start, end);
  
  // Process data for weekly view
  const weeklyData = [];
  
  // Process logs into weekly buckets
  // Group by week and calculate totals
  // This is a placeholder implementation - you'll need to adjust based on your actual schema
  
  const summary = {
    totalHours: otjLogs.reduce((acc, log) => acc + parseFloat(log.hours), 0),
    completedEntries: otjLogs.filter(log => log.status === 'approved').length,
    pendingEntries: otjLogs.filter(log => log.status === 'submitted').length,
    rejectedEntries: otjLogs.filter(log => log.status === 'rejected').length,
  };
  
  res.json({
    weeklyData,
    summary,
  });
}));

// Get monthly OTJ hours
router.get('/monthly-otj', validate(dateRangeSchema), asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query as any;
  const { start, end } = getDateRange(timeframe, startDate, endDate);
  
  // Fetch all OTJ logs within date range from DB
  const otjLogs = await storage.getOtjLogEntriesByDateRange(start, end);
  
  // Process data for monthly view
  const monthlyData = [];
  const progressData = [];
  
  // Group by month and calculate totals
  // This is a placeholder implementation - you'll need to adjust based on your actual schema
  
  const summary = {
    totalHours: otjLogs.reduce((acc, log) => acc + parseFloat(log.hours), 0),
    averageHoursPerMonth: 0, // Calculate based on actual data
    completedMonths: 0, // Calculate based on actual data
    remainingMonths: 0, // Calculate based on actual data
  };
  
  res.json({
    monthlyData,
    progressData,
    summary,
  });
}));

// Get evidence status breakdown
router.get('/evidence-status', validate(dateRangeSchema), asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query as any;
  const { start, end } = getDateRange(timeframe, startDate, endDate);
  
  // Fetch evidence items within date range
  // This will need to be adjusted based on your actual schema
  const evidenceItems = await storage.getEvidenceItemsByDateRange(start, end);
  
  // Process status data
  const statusCounts = {
    draft: 0,
    submitted: 0,
    in_review: 0,
    approved: 0,
    needs_revision: 0,
  };
  
  // Count items by status
  evidenceItems.forEach(item => {
    statusCounts[item.status] += 1;
  });
  
  // Format for chart display
  const evidenceStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }));
  
  // Calculate summary statistics
  const summary = {
    totalEvidence: evidenceItems.length,
    approvedEvidence: statusCounts.approved,
    pendingEvidence: statusCounts.submitted + statusCounts.in_review,
    rejectedEvidence: statusCounts.needs_revision,
  };
  
  res.json({
    evidenceStatusData,
    summary,
  });
}));

// Get recent activity
router.get('/recent-activity', validate(dateRangeSchema), asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query as any;
  const { start, end } = getDateRange(timeframe, startDate, endDate);
  
  // Fetch recent activities
  // This is a placeholder - you'll need to implement based on your schema
  // Typically this would combine multiple activity types (OTJ logs, evidence submissions, etc.)
  
  const recentActivity = []; // Placeholder for actual data
  
  res.json({
    recentActivity,
  });
}));

// Get OTJ activity breakdown by type
router.get('/otj-activity-types', validate(dateRangeSchema), asyncHandler(async (req, res) => {
  const { timeframe, startDate, endDate } = req.query as any;
  const { start, end } = getDateRange(timeframe, startDate, endDate);
  
  // Fetch OTJ logs within date range
  const otjLogs = await storage.getOtjLogEntriesByDateRange(start, end);
  
  // Process activity type data
  const activityTypes = {};
  
  // Group by activity type and calculate hours
  otjLogs.forEach(log => {
    const type = log.activityType || 'Other';
    if (!activityTypes[type]) {
      activityTypes[type] = 0;
    }
    activityTypes[type] += parseFloat(log.hours);
  });
  
  // Format for chart display
  const activityTypeData = Object.entries(activityTypes).map(([type, hours]) => ({
    type,
    hours,
  }));
  
  // Calculate summary statistics
  const totalHours = otjLogs.reduce((acc, log) => acc + parseFloat(log.hours), 0);
  
  const summary = {
    totalHours,
    topActivityType: activityTypeData.length > 0 
      ? activityTypeData.sort((a, b) => b.hours - a.hours)[0]?.type 
      : 'None',
    activityTypesCount: activityTypeData.length,
    averageHoursPerType: activityTypeData.length > 0 
      ? totalHours / activityTypeData.length 
      : 0,
  };
  
  res.json({
    activityTypeData,
    summary,
  });
}));

// Get OTJ hours progress towards target
router.get('/otj-hours-progress', asyncHandler(async (req, res) => {
  // Get settings for OTJ hours target
  const settings = await storage.getProviderSettings();
  const requiredOtjHours = settings?.requiredOtjHours || 1000; // Default to 1000 if not set
  
  // Get all completed OTJ hours for the current user
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Get learner profile for this user
  const learnerProfile = await storage.getLearnerProfileByUserId(userId);
  if (!learnerProfile) {
    return res.status(404).json({ message: 'Learner profile not found' });
  }
  
  // Get all approved OTJ logs
  const otjLogs = await storage.getOtjLogEntriesByLearnerId(learnerProfile.id);
  const approvedLogs = otjLogs.filter(log => log.status === 'approved');
  
  // Calculate total hours
  const totalHours = approvedLogs.reduce((acc, log) => acc + parseFloat(log.hours), 0);
  
  // Calculate percentage complete
  const percentComplete = Math.min(100, (totalHours / requiredOtjHours) * 100);
  
  // Format response
  const otjHoursProgress = {
    currentHours: totalHours,
    targetHours: requiredOtjHours,
    percentComplete,
    remaining: Math.max(0, requiredOtjHours - totalHours),
  };
  
  res.json({
    otjHoursProgress,
  });
}));

// Get KSB coverage statistics
router.get('/ksb-coverage', asyncHandler(async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Get learner profile for this user
  const learnerProfile = await storage.getLearnerProfileByUserId(userId);
  if (!learnerProfile) {
    return res.status(404).json({ message: 'Learner profile not found' });
  }
  
  // Get all KSBs for the selected standard
  const ksbElements = await storage.getKsbElementsByStandard(learnerProfile.standardId);
  
  // Get all evidence for this learner
  const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerProfile.id);
  
  // For each KSB, check if it's covered by evidence
  const ksbCoverage = {
    totalKsbs: ksbElements.length,
    coveredKsbs: 0,
    percentCovered: 0,
    uncoveredKsbs: [],
  };
  
  // Track which KSBs are covered by evidence
  const coveredKsbIds = new Set();
  
  // Check each evidence item for KSB coverage
  for (const evidence of evidenceItems) {
    const ksbsForEvidence = await storage.getKsbsByEvidenceId(evidence.id);
    ksbsForEvidence.forEach(ksb => coveredKsbIds.add(ksb.id));
  }
  
  // Calculate coverage statistics
  ksbCoverage.coveredKsbs = coveredKsbIds.size;
  ksbCoverage.percentCovered = Math.round((coveredKsbIds.size / ksbElements.length) * 100) || 0;
  
  // Find uncovered KSBs
  ksbCoverage.uncoveredKsbs = ksbElements
    .filter(ksb => !coveredKsbIds.has(ksb.id))
    .map(ksb => ksb.code);
  
  res.json({
    ksbCoverage,
  });
}));

// Get overall program completion status
router.get('/overall-completion', asyncHandler(async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Get learner profile
  const learnerProfile = await storage.getLearnerProfileByUserId(userId);
  if (!learnerProfile) {
    return res.status(404).json({ message: 'Learner profile not found' });
  }
  
  // Get settings for OTJ hours target
  const settings = await storage.getProviderSettings();
  const requiredOtjHours = settings?.requiredOtjHours || 1000;
  
  // Get OTJ logs
  const otjLogs = await storage.getOtjLogEntriesByLearnerId(learnerProfile.id);
  const approvedHours = otjLogs
    .filter(log => log.status === 'approved')
    .reduce((acc, log) => acc + parseFloat(log.hours), 0);
  
  // Get KSBs
  const ksbElements = await storage.getKsbElementsByStandard(learnerProfile.standardId);
  
  // Get evidence
  const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerProfile.id);
  
  // Calculate KSB coverage
  const coveredKsbIds = new Set();
  for (const evidence of evidenceItems) {
    if (evidence.status === 'approved') {
      const ksbsForEvidence = await storage.getKsbsByEvidenceId(evidence.id);
      ksbsForEvidence.forEach(ksb => coveredKsbIds.add(ksb.id));
    }
  }
  
  // Calculate overall completion percentage
  const otjCompletion = Math.min(100, (approvedHours / requiredOtjHours) * 100);
  const ksbCompletion = Math.round((coveredKsbIds.size / ksbElements.length) * 100) || 0;
  
  // Calculate weighted average completion
  const overallCompletion = {
    otjCompletion,
    ksbCompletion,
    overallPercent: Math.round((otjCompletion * 0.5) + (ksbCompletion * 0.5)),
    estimatedCompletionDate: null, // Would require more sophisticated calculation
  };
  
  res.json({
    overallCompletion,
  });
}));

// Download report data as CSV
router.get('/export', asyncHandler(async (req, res) => {
  const { reportType, startDate, endDate } = req.query as any;
  const { start, end } = getDateRange(undefined, startDate, endDate);
  
  // Get user and validation
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Different logic based on report type
  let csvData = '';
  let filename = '';
  
  switch (reportType) {
    case 'otj-logs':
      // Get learner profile
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: 'Learner profile not found' });
      }
      
      // Get OTJ logs
      const otjLogs = await storage.getOtjLogEntriesByDateRange(start, end, learnerProfile.id);
      
      // Format as CSV
      csvData = 'Date,Hours,Category,Activity Type,Description,Status\n';
      otjLogs.forEach(log => {
        csvData += `${format(new Date(log.date), 'yyyy-MM-dd')},${log.hours},${log.category},${log.activityType},"${log.description.replace(/"/g, '""')}",${log.status}\n`;
      });
      
      filename = `otj-logs-${format(start, 'yyyy-MM-dd')}-to-${format(end, 'yyyy-MM-dd')}.csv`;
      break;
      
    case 'evidence':
      // Similar implementation for evidence export
      filename = `evidence-${format(start, 'yyyy-MM-dd')}-to-${format(end, 'yyyy-MM-dd')}.csv`;
      break;
      
    default:
      return res.status(400).json({ message: 'Invalid report type' });
  }
  
  // Set response headers for file download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  // Send CSV data
  res.send(csvData);
}));

export function registerReportsRoutes(app) {
  app.use('/api/reports', router);
}

export default router;