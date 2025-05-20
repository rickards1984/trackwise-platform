import { Request, Response } from "express";
import { storage } from "../storage";
import { format, subMonths, subDays, startOfMonth, endOfMonth } from "date-fns";

/**
 * Get the date range based on the time range parameter
 */
function getDateRangeFromParam(timeRange: string): { startDate: Date, endDate: Date } {
  const now = new Date();
  let startDate: Date;
  
  switch (timeRange) {
    case '1month':
      startDate = subMonths(now, 1);
      break;
    case '3months':
      startDate = subMonths(now, 3);
      break;
    case '6months':
      startDate = subMonths(now, 6);
      break;
    case '1year':
      startDate = subMonths(now, 12);
      break;
    case 'all':
      startDate = new Date(2000, 0, 1); // Far in the past to get all data
      break;
    default:
      startDate = subMonths(now, 3); // Default to 3 months
  }
  
  return { startDate, endDate: now };
}

/**
 * Register reports routes
 */
export function registerReportsRoutes(app: any) {
  // Get OTJ hours data
  app.get("/api/reports/otj-hours", async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const timeRange = req.query.range as string || '3months';
      const { startDate, endDate } = getDateRangeFromParam(timeRange);
      
      // Get learner profile for the user
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get OTJ log entries for the date range
      const otjEntries = await storage.getOtjLogEntriesByLearnerIdAndDateRange(
        learnerProfile.id,
        startDate,
        endDate
      );
      
      // Get the minimum weekly OTJ hours target
      const providerSettings = await storage.getProviderSettings();
      const minimumWeeklyOtjHours = providerSettings?.minimumWeeklyOtjHours || 6;
      
      // Process the data into weekly format
      const weeklyData = [];
      let currentWeekStart = new Date(startDate);
      let weekNumber = 1;
      
      while (currentWeekStart <= endDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekEntries = otjEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= currentWeekStart && entryDate <= weekEnd;
        });
        
        const totalHours = weekEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
        
        weeklyData.push({
          week: `Week ${weekNumber}`,
          hours: parseFloat(totalHours.toFixed(1)),
          target: minimumWeeklyOtjHours,
          startDate: format(currentWeekStart, 'MMM dd'),
          endDate: format(weekEnd > endDate ? endDate : weekEnd, 'MMM dd')
        });
        
        // Move to next week
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        weekNumber++;
      }
      
      // Calculate summary statistics
      const totalHours = weeklyData.reduce((sum, week) => sum + week.hours, 0);
      const totalTargetHours = weeklyData.reduce((sum, week) => sum + week.target, 0);
      const weekCount = weeklyData.length;
      const weeklyAverage = weekCount > 0 ? parseFloat((totalHours / weekCount).toFixed(1)) : 0;
      
      return res.json({ 
        weeklyData,
        summary: {
          totalHours,
          totalTargetHours,
          weeklyAverage,
          weekCount
        }
      });
    } catch (error) {
      console.error("Error getting OTJ hours report:", error);
      return res.status(500).json({ message: "Failed to get OTJ hours report" });
    }
  });
  
  // Get KSB progress data
  app.get("/api/reports/ksb-progress", async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const timeRange = req.query.range as string || '3months';
      const { startDate, endDate } = getDateRangeFromParam(timeRange);
      
      // Get learner profile
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get KSB elements for the standard
      const ksbElements = await storage.getKsbElementsByStandard(learnerProfile.standardId);
      
      // Group KSBs by type
      const knowledgeKsbs = ksbElements.filter(ksb => ksb.type === 'knowledge');
      const skillKsbs = ksbElements.filter(ksb => ksb.type === 'skill');
      const behaviorKsbs = ksbElements.filter(ksb => ksb.type === 'behavior');
      
      // Get all evidence for the learner
      const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerProfile.id);
      
      // Filter evidence by date range
      const filteredEvidence = evidenceItems.filter(evidence => {
        const submissionDate = new Date(evidence.submissionDate);
        return submissionDate >= startDate && submissionDate <= endDate;
      });
      
      // Get all KSB mappings for the filtered evidence
      const ksbCoverage = new Map<number, boolean>();
      
      for (const evidence of filteredEvidence) {
        if (evidence.status === 'approved') {
          const mappedKsbs = await storage.getKsbsByEvidenceId(evidence.id);
          for (const ksb of mappedKsbs) {
            ksbCoverage.set(ksb.id, true);
          }
        }
      }
      
      // Count achieved KSBs by type
      const knowledgeAchieved = knowledgeKsbs.filter(ksb => ksbCoverage.has(ksb.id)).length;
      const skillsAchieved = skillKsbs.filter(ksb => ksbCoverage.has(ksb.id)).length;
      const behaviorsAchieved = behaviorKsbs.filter(ksb => ksbCoverage.has(ksb.id)).length;
      
      // Generate monthly progress data
      const months = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const monthName = format(monthStart, 'MMM');
        
        // Filter evidence for this month
        const monthEvidence = filteredEvidence.filter(evidence => {
          const submissionDate = new Date(evidence.submissionDate);
          return submissionDate >= monthStart && submissionDate <= monthEnd && evidence.status === 'approved';
        });
        
        // Create monthly KSB coverage map
        const monthlyKsbCoverage = new Map<number, boolean>();
        
        for (const evidence of monthEvidence) {
          const mappedKsbs = await storage.getKsbsByEvidenceId(evidence.id);
          for (const ksb of mappedKsbs) {
            monthlyKsbCoverage.set(ksb.id, true);
          }
        }
        
        // Count KSBs by type for this month
        const monthlyKnowledgeCount = knowledgeKsbs.filter(ksb => monthlyKsbCoverage.has(ksb.id)).length;
        const monthlySkillsCount = skillKsbs.filter(ksb => monthlyKsbCoverage.has(ksb.id)).length;
        const monthlyBehaviorsCount = behaviorKsbs.filter(ksb => monthlyKsbCoverage.has(ksb.id)).length;
        
        months.push({
          month: monthName,
          knowledge: monthlyKnowledgeCount,
          skills: monthlySkillsCount,
          behaviors: monthlyBehaviorsCount
        });
        
        // Move to next month
        currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
      }
      
      // Create KSB progress summary
      const progressData = [
        { name: 'Knowledge', achieved: knowledgeAchieved, total: knowledgeKsbs.length },
        { name: 'Skills', achieved: skillsAchieved, total: skillKsbs.length },
        { name: 'Behaviors', achieved: behaviorsAchieved, total: behaviorKsbs.length }
      ];
      
      const totalAchieved = knowledgeAchieved + skillsAchieved + behaviorsAchieved;
      const totalKsbs = knowledgeKsbs.length + skillKsbs.length + behaviorKsbs.length;
      const completionPercentage = totalKsbs > 0 ? Math.round((totalAchieved / totalKsbs) * 100) : 0;
      
      return res.json({
        progressData,
        monthlyData: months,
        summary: {
          totalAchieved,
          totalKsbs,
          completionPercentage
        }
      });
    } catch (error) {
      console.error("Error getting KSB progress report:", error);
      return res.status(500).json({ message: "Failed to get KSB progress report" });
    }
  });
  
  // Get evidence summary data
  app.get("/api/reports/evidence-summary", async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const timeRange = req.query.range as string || '3months';
      const { startDate, endDate } = getDateRangeFromParam(timeRange);
      
      // Get learner profile
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get evidence items
      const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerProfile.id);
      
      // Filter evidence by date range
      const filteredEvidence = evidenceItems.filter(evidence => {
        const submissionDate = new Date(evidence.submissionDate);
        return submissionDate >= startDate && submissionDate <= endDate;
      });
      
      // Count evidence by status
      const statusCounts = {
        approved: 0,
        inReview: 0,
        rejected: 0,
        draft: 0
      };
      
      // Count evidence by type
      const typeCounts = {
        document: 0,
        image: 0,
        video: 0,
        audio: 0,
        link: 0,
        other: 0
      };
      
      for (const evidence of filteredEvidence) {
        // Count by status
        if (evidence.status === 'approved') {
          statusCounts.approved++;
        } else if (evidence.status === 'submitted') {
          statusCounts.inReview++;
        } else if (evidence.status === 'rejected') {
          statusCounts.rejected++;
        } else if (evidence.status === 'draft') {
          statusCounts.draft++;
        }
        
        // Count by type
        if (evidence.evidenceType === 'document') {
          typeCounts.document++;
        } else if (evidence.evidenceType === 'image') {
          typeCounts.image++;
        } else if (evidence.evidenceType === 'video') {
          typeCounts.video++;
        } else if (evidence.evidenceType === 'audio') {
          typeCounts.audio++;
        } else if (evidence.evidenceType === 'link') {
          typeCounts.link++;
        } else {
          typeCounts.other++;
        }
      }
      
      // Calculate KSB coverage
      const ksbElements = await storage.getKsbElementsByStandard(learnerProfile.standardId);
      const coveredKsbIds = new Set<number>();
      
      for (const evidence of filteredEvidence) {
        if (evidence.status === 'approved') {
          const mappedKsbs = await storage.getKsbsByEvidenceId(evidence.id);
          for (const ksb of mappedKsbs) {
            coveredKsbIds.add(ksb.id);
          }
        }
      }
      
      // Prepare evidence by status data for pie chart
      const evidenceStatusData = [
        { name: 'Approved', value: statusCounts.approved },
        { name: 'In Review', value: statusCounts.inReview },
        { name: 'Needs Revision', value: statusCounts.rejected },
        { name: 'Draft', value: statusCounts.draft }
      ];
      
      // Prepare evidence by type data for pie chart
      const evidenceTypeData = [
        { name: 'Document', value: typeCounts.document },
        { name: 'Image', value: typeCounts.image },
        { name: 'Video', value: typeCounts.video },
        { name: 'Audio', value: typeCounts.audio },
        { name: 'Link', value: typeCounts.link },
        { name: 'Other', value: typeCounts.other }
      ];
      
      // Calculate summary statistics
      const totalEvidence = filteredEvidence.length;
      const approvalRate = totalEvidence > 0 ? Math.round((statusCounts.approved / totalEvidence) * 100) : 0;
      
      // Get average review time (days from submission to approval/rejection)
      let totalReviewDays = 0;
      let reviewedCount = 0;
      
      for (const evidence of filteredEvidence) {
        if ((evidence.status === 'approved' || evidence.status === 'rejected') && evidence.verificationDate) {
          const submissionDate = new Date(evidence.submissionDate);
          const verificationDate = new Date(evidence.verificationDate);
          const reviewDays = Math.ceil((verificationDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          totalReviewDays += reviewDays;
          reviewedCount++;
        }
      }
      
      const averageReviewDays = reviewedCount > 0 ? parseFloat((totalReviewDays / reviewedCount).toFixed(1)) : 0;
      
      return res.json({
        evidenceStatusData,
        evidenceTypeData,
        summary: {
          totalEvidence,
          approvalRate,
          averageReviewDays,
          ksbsCovered: coveredKsbIds.size,
          totalKsbs: ksbElements.length
        },
        recentActivity: {
          submitted: filteredEvidence.filter(e => new Date(e.submissionDate) >= subDays(new Date(), 30)).length,
          approved: filteredEvidence.filter(e => e.status === 'approved' && e.verificationDate && new Date(e.verificationDate) >= subDays(new Date(), 30)).length,
          pendingReview: filteredEvidence.filter(e => e.status === 'submitted').length
        }
      });
    } catch (error) {
      console.error("Error getting evidence summary report:", error);
      return res.status(500).json({ message: "Failed to get evidence summary report" });
    }
  });
  
  // Get activities data
  app.get("/api/reports/activities", async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const timeRange = req.query.range as string || '3months';
      const { startDate, endDate } = getDateRangeFromParam(timeRange);
      
      // Get learner profile
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get OTJ log entries
      const otjEntries = await storage.getOtjLogEntriesByLearnerIdAndDateRange(
        learnerProfile.id,
        startDate,
        endDate
      );
      
      // Count hours by activity type
      const activityHours: Record<string, number> = {};
      let totalHours = 0;
      
      for (const entry of otjEntries) {
        const activityType = entry.activityType || 'Other';
        const hours = parseFloat(entry.hours);
        
        activityHours[activityType] = (activityHours[activityType] || 0) + hours;
        totalHours += hours;
      }
      
      // Prepare activity type data for chart
      const activityTypeData = Object.entries(activityHours).map(([name, hours]) => ({
        name,
        hours: parseFloat(hours.toFixed(1))
      }));
      
      // Sort by hours (descending)
      activityTypeData.sort((a, b) => b.hours - a.hours);
      
      // Determine most and least common activities
      let mostCommonActivity = 'None';
      let leastCommonActivity = 'None';
      
      if (activityTypeData.length > 0) {
        mostCommonActivity = activityTypeData[0].name;
        leastCommonActivity = activityTypeData[activityTypeData.length - 1].name;
      }
      
      return res.json({
        activityTypeData,
        summary: {
          totalHours: parseFloat(totalHours.toFixed(1)),
          mostCommonActivity,
          leastCommonActivity,
          categoryCount: activityTypeData.length
        }
      });
    } catch (error) {
      console.error("Error getting activities report:", error);
      return res.status(500).json({ message: "Failed to get activities report" });
    }
  });
  
  // Get overall progress summary
  app.get("/api/reports/overall-progress", async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get learner profile
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get apprenticeship standard
      const standard = await storage.getApprenticeshipStandard(learnerProfile.standardId);
      if (!standard) {
        return res.status(404).json({ message: "Apprenticeship standard not found" });
      }
      
      // Get KSB elements for the standard
      const ksbElements = await storage.getKsbElementsByStandard(learnerProfile.standardId);
      
      // Get all evidence for the learner
      const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerProfile.id);
      const approvedEvidence = evidenceItems.filter(e => e.status === 'approved');
      
      // Calculate KSB coverage
      const coveredKsbIds = new Set<number>();
      
      for (const evidence of approvedEvidence) {
        const mappedKsbs = await storage.getKsbsByEvidenceId(evidence.id);
        for (const ksb of mappedKsbs) {
          coveredKsbIds.add(ksb.id);
        }
      }
      
      // Get all OTJ log entries
      const otjEntries = await storage.getOtjLogEntriesByLearnerId(learnerProfile.id);
      const totalOtjHours = otjEntries.reduce((sum, entry) => sum + parseFloat(entry.hours), 0);
      
      // Get provider settings for required OTJ hours
      const providerSettings = await storage.getProviderSettings();
      const requiredOtjHours = providerSettings?.requiredOtjHours || 360;
      
      // Calculate overall progress as weighted average of different factors
      // - KSB Coverage: 40%
      // - OTJ Hours Completion: 40%
      // - Evidence Submission: 20%
      
      const ksbCoveragePercent = ksbElements.length > 0 ? 
        (coveredKsbIds.size / ksbElements.length) * 100 : 0;
      
      const otjHoursPercent = requiredOtjHours > 0 ? 
        Math.min(100, (totalOtjHours / requiredOtjHours) * 100) : 0;
      
      // Assume target of at least 1 evidence item per KSB
      const evidenceSubmissionPercent = ksbElements.length > 0 ? 
        Math.min(100, (approvedEvidence.length / ksbElements.length) * 100) : 0;
      
      const overallPercent = Math.round(
        (ksbCoveragePercent * 0.4) + 
        (otjHoursPercent * 0.4) + 
        (evidenceSubmissionPercent * 0.2)
      );
      
      // Format start and end dates
      const startDate = learnerProfile.startDate ? format(new Date(learnerProfile.startDate), 'MMM yyyy') : 'Unknown';
      const expectedEndDate = learnerProfile.expectedEndDate ? format(new Date(learnerProfile.expectedEndDate), 'MMM yyyy') : 'Unknown';
      
      return res.json({
        otjHoursProgress: {
          current: parseFloat(totalOtjHours.toFixed(1)),
          required: requiredOtjHours,
          percentage: Math.round(otjHoursPercent)
        },
        ksbCoverage: {
          covered: coveredKsbIds.size,
          total: ksbElements.length,
          percentage: Math.round(ksbCoveragePercent)
        },
        overallCompletion: {
          percentage: overallPercent,
          startDate,
          expectedEndDate
        }
      });
    } catch (error) {
      console.error("Error getting overall progress report:", error);
      return res.status(500).json({ message: "Failed to get overall progress report" });
    }
  });
  
  // Export report data as CSV
  app.get("/api/reports/export", async (req: Request, res: Response) => {
    try {
      const { userId } = req.session as any;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const timeRange = req.query.range as string || '3months';
      const { startDate, endDate } = getDateRangeFromParam(timeRange);
      
      // Get learner profile
      const learnerProfile = await storage.getLearnerProfileByUserId(userId);
      if (!learnerProfile) {
        return res.status(404).json({ message: "Learner profile not found" });
      }
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get evidence items
      const evidenceItems = await storage.getEvidenceItemsByLearnerId(learnerProfile.id);
      
      // Filter evidence by date range
      const filteredEvidence = evidenceItems.filter(evidence => {
        const submissionDate = new Date(evidence.submissionDate);
        return submissionDate >= startDate && submissionDate <= endDate;
      });
      
      // Get OTJ logs
      const otjEntries = await storage.getOtjLogEntriesByLearnerIdAndDateRange(
        learnerProfile.id,
        startDate,
        endDate
      );
      
      // Generate export filename
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `apprentice_report_${user.firstName}_${user.lastName}_${dateStr}.csv`;
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      
      // Write CSV header
      res.write('Report Type,Date,Title,Status,Hours,Details\n');
      
      // Write evidence data
      for (const evidence of filteredEvidence) {
        const date = format(new Date(evidence.submissionDate), 'yyyy-MM-dd');
        const title = evidence.title.replace(/,/g, ' '); // Remove commas to avoid CSV issues
        const description = evidence.description ? evidence.description.replace(/,/g, ' ').replace(/\n/g, ' ') : '';
        
        res.write(`Evidence,${date},${title},${evidence.status},,${description}\n`);
      }
      
      // Write OTJ data
      for (const entry of otjEntries) {
        const date = format(new Date(entry.date), 'yyyy-MM-dd');
        const description = entry.description ? entry.description.replace(/,/g, ' ').replace(/\n/g, ' ') : '';
        
        res.write(`OTJ,${date},${entry.activityType || 'Activity'},${entry.status},${entry.hours},${description}\n`);
      }
      
      res.end();
    } catch (error) {
      console.error("Error exporting report:", error);
      return res.status(500).json({ message: "Failed to export report" });
    }
  });
}