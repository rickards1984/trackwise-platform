import {
  User, InsertUser,
  EmailVerification, InsertEmailVerification,
  KsbElement, InsertKsbElement,
  ApprenticeshipStandard, InsertApprenticeshipStandard,
  LearnerProfile, InsertLearnerProfile,
  EvidenceItem, InsertEvidenceItem,
  EvidenceKsbMapping, InsertEvidenceKsbMapping,
  OtjLogEntry, InsertOtjLogEntry,
  WeeklyOtjTracking, InsertWeeklyOtjTracking,
  FeedbackItem, InsertFeedbackItem,
  Task, InsertTask,
  LearningGoal, InsertLearningGoal,
  AiAssistantConfig, InsertAiAssistantConfig,
  AiAssistantConversation, InsertAiAssistantConversation,
  LearningResource, InsertLearningResource,
  ProviderSettings, InsertProviderSettings,
  CourseBuilderTemplate, InsertCourseBuilderTemplate,
  TwelveWeeklyReview, InsertTwelveWeeklyReview
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserStatus(id: number, status: 'unverified' | 'pending_approval' | 'active' | 'suspended' | 'deactivated'): Promise<User | undefined>;
  
  // Email verification operations
  createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification>;
  getEmailVerificationByToken(token: string): Promise<EmailVerification | undefined>;
  getEmailVerificationByUserId(userId: number): Promise<EmailVerification | undefined>;
  updateEmailVerification(id: number, verification: Partial<InsertEmailVerification>): Promise<EmailVerification | undefined>;
  
  // KSB Element operations
  getKsbElement(id: number): Promise<KsbElement | undefined>;
  getKsbElementsByStandard(standardId: number): Promise<KsbElement[]>;
  createKsbElement(ksbElement: InsertKsbElement): Promise<KsbElement>;
  
  // Apprenticeship Standard operations
  getApprenticeshipStandard(id: number): Promise<ApprenticeshipStandard | undefined>;
  getAllApprenticeshipStandards(): Promise<ApprenticeshipStandard[]>;
  createApprenticeshipStandard(standard: InsertApprenticeshipStandard): Promise<ApprenticeshipStandard>;
  
  // Learner Profile operations
  getLearnerProfile(id: number): Promise<LearnerProfile | undefined>;
  getLearnerProfileByUserId(userId: number): Promise<LearnerProfile | undefined>;
  createLearnerProfile(profile: InsertLearnerProfile): Promise<LearnerProfile>;
  updateLearnerProfile(id: number, profile: Partial<InsertLearnerProfile>): Promise<LearnerProfile | undefined>;
  
  // Evidence Item operations
  getEvidenceItem(id: number): Promise<EvidenceItem | undefined>;
  getEvidenceItemsByLearnerId(learnerId: number, status?: string | null, limit?: number, offset?: number): Promise<EvidenceItem[]>;
  countEvidenceItemsByLearnerId(learnerId: number, status?: string | null): Promise<number>;
  getEvidenceItemsByDateRange(startDate: Date, endDate: Date): Promise<EvidenceItem[]>;
  createEvidenceItem(item: InsertEvidenceItem): Promise<EvidenceItem>;
  updateEvidenceItem(id: number, item: Partial<InsertEvidenceItem>): Promise<EvidenceItem | undefined>;
  deleteEvidenceItem(id: number): Promise<void>;
  
  // Evidence-KSB Mapping operations
  createEvidenceKsbMapping(mapping: InsertEvidenceKsbMapping): Promise<EvidenceKsbMapping>;
  getKsbsByEvidenceId(evidenceId: number): Promise<KsbElement[]>;
  deleteEvidenceKsbMappingsByEvidenceId(evidenceId: number): Promise<void>;
  
  // OTJ Log Entry operations
  getOtjLogEntry(id: number): Promise<OtjLogEntry | undefined>;
  getOtjLogEntriesByLearnerId(learnerId: number, status?: string | null, limit?: number, offset?: number): Promise<OtjLogEntry[]>;
  countOtjLogEntriesByLearnerId(learnerId: number, status?: string | null): Promise<number>;
  getOtjLogEntriesByLearnerIdAndDateRange(
    learnerId: number, 
    startDate: Date, 
    endDate: Date, 
    status?: string | null,
    limit?: number, 
    offset?: number
  ): Promise<OtjLogEntry[]>;
  countOtjLogEntriesByLearnerIdAndDateRange(
    learnerId: number, 
    startDate: Date, 
    endDate: Date,
    status?: string | null
  ): Promise<number>;
  createOtjLogEntry(entry: InsertOtjLogEntry): Promise<OtjLogEntry>;
  updateOtjLogEntry(id: number, entry: Partial<InsertOtjLogEntry>): Promise<OtjLogEntry | undefined>;
  verifyOtjLogEntry(id: number, verifierId: number): Promise<OtjLogEntry | undefined>;
  iqaVerifyOtjLogEntry(id: number, iqaVerifierId: number): Promise<OtjLogEntry | undefined>;
  
  // Weekly OTJ Hour Tracking operations
  getWeeklyOtjTracking(id: number): Promise<WeeklyOtjTracking | undefined>;
  getWeeklyOtjTrackingsByLearnerId(
    learnerId: number, 
    startDate?: Date, 
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<WeeklyOtjTracking[]>;
  countWeeklyOtjTrackingsByLearnerId(
    learnerId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<number>;
  getWeeklyOtjTrackingByLearnerIdAndWeek(learnerId: number, weekStartDate: Date): Promise<WeeklyOtjTracking | undefined>;
  createWeeklyOtjTracking(tracking: InsertWeeklyOtjTracking): Promise<WeeklyOtjTracking>;
  updateWeeklyOtjTracking(id: number, tracking: Partial<InsertWeeklyOtjTracking>): Promise<WeeklyOtjTracking | undefined>;
  reviewWeeklyOtjTracking(id: number, tutorId: number, notes?: string): Promise<WeeklyOtjTracking | undefined>;
  
  // Feedback Item operations
  createFeedbackItem(feedback: InsertFeedbackItem): Promise<FeedbackItem>;
  getFeedbackItem(id: number): Promise<FeedbackItem | undefined>;
  getFeedbackItemsByRecipientId(recipientId: number): Promise<FeedbackItem[]>;
  getFeedbackItemsByRelatedItem(itemType: string, itemId: number): Promise<FeedbackItem[]>;
  
  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasksByAssignedToId(assignedToId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  
  // Learning Goals operations
  getLearningGoal(id: number): Promise<LearningGoal | undefined>;
  getLearningGoalsByLearnerId(learnerId: number): Promise<LearningGoal[]>;
  createLearningGoal(goal: InsertLearningGoal): Promise<LearningGoal>;
  updateLearningGoal(id: number, goal: Partial<InsertLearningGoal>): Promise<LearningGoal | undefined>;
  
  // AI Assistant operations
  getAiAssistantConfig(userId: number): Promise<AiAssistantConfig | undefined>;
  createOrUpdateAiAssistantConfig(config: InsertAiAssistantConfig): Promise<AiAssistantConfig>;
  createAiAssistantConversation(conversation: InsertAiAssistantConversation): Promise<AiAssistantConversation>;
  getAiAssistantConversationsByUserId(userId: number): Promise<AiAssistantConversation[]>;
  
  // Learning Resources operations
  getLearningResource(id: number): Promise<LearningResource | undefined>;
  getAllLearningResources(): Promise<LearningResource[]>;
  getLearningResourcesByStandardId(standardId: number): Promise<LearningResource[]>;
  createLearningResource(resource: InsertLearningResource): Promise<LearningResource>;
  
  // Provider Settings operations
  getProviderSettings(): Promise<ProviderSettings | undefined>;
  updateProviderSettings(settings: InsertProviderSettings): Promise<ProviderSettings>;
  
  // Course Builder Templates operations
  getCourseBuilderTemplate(id: number): Promise<CourseBuilderTemplate | undefined>;
  getCourseBuilderTemplatesByStandardId(standardId: number): Promise<CourseBuilderTemplate[]>;
  getCourseBuilderTemplatesByCreator(creatorId: number): Promise<CourseBuilderTemplate[]>;
  getPublicCourseBuilderTemplates(): Promise<CourseBuilderTemplate[]>;
  createCourseBuilderTemplate(template: InsertCourseBuilderTemplate): Promise<CourseBuilderTemplate>;
  updateCourseBuilderTemplate(id: number, template: Partial<InsertCourseBuilderTemplate>): Promise<CourseBuilderTemplate | undefined>;
  
  // 12-Weekly Review operations
  getTwelveWeeklyReview(id: number): Promise<TwelveWeeklyReview | undefined>;
  getTwelveWeeklyReviewsByLearnerId(learnerId: number): Promise<TwelveWeeklyReview[]>;
  getTwelveWeeklyReviewsByTutorId(tutorId: number): Promise<TwelveWeeklyReview[]>;
  getUpcomingTwelveWeeklyReviews(days: number): Promise<TwelveWeeklyReview[]>; // Get reviews scheduled within next X days
  createTwelveWeeklyReview(review: InsertTwelveWeeklyReview): Promise<TwelveWeeklyReview>;
  updateTwelveWeeklyReview(id: number, review: Partial<InsertTwelveWeeklyReview>): Promise<TwelveWeeklyReview | undefined>;
  signTwelveWeeklyReview(id: number, role: 'learner' | 'employer' | 'tutor' | 'admin' | 'iqa', userId: number): Promise<TwelveWeeklyReview | undefined>;
  rescheduleTwelveWeeklyReview(id: number, newDate: Date): Promise<TwelveWeeklyReview | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private emailVerifications: Map<number, EmailVerification>;
  private ksbElements: Map<number, KsbElement>;
  private apprenticeshipStandards: Map<number, ApprenticeshipStandard>;
  private learnerProfiles: Map<number, LearnerProfile>;
  private evidenceItems: Map<number, EvidenceItem>;
  private evidenceKsbMappings: Map<number, EvidenceKsbMapping>;
  private otjLogEntries: Map<number, OtjLogEntry>;
  private weeklyOtjTrackings: Map<number, WeeklyOtjTracking>;
  private feedbackItems: Map<number, FeedbackItem>;
  private tasks: Map<number, Task>;
  private twelveWeeklyReviews: Map<number, TwelveWeeklyReview>;
  
  private currentUserId: number;
  private currentEmailVerificationId: number;
  private currentKsbElementId: number;
  private currentStandardId: number;
  private currentProfileId: number;
  private currentEvidenceId: number;
  private currentMappingId: number;
  private currentOtjLogId: number;
  private currentWeeklyOtjTrackingId: number;
  private currentFeedbackId: number;
  private currentTaskId: number;
  private currentTwelveWeeklyReviewId: number;

  constructor() {
    this.users = new Map();
    this.emailVerifications = new Map();
    this.ksbElements = new Map();
    this.apprenticeshipStandards = new Map();
    this.learnerProfiles = new Map();
    this.evidenceItems = new Map();
    this.evidenceKsbMappings = new Map();
    this.otjLogEntries = new Map();
    this.weeklyOtjTrackings = new Map();
    this.feedbackItems = new Map();
    this.tasks = new Map();
    this.twelveWeeklyReviews = new Map();
    
    this.currentUserId = 1;
    this.currentEmailVerificationId = 1;
    this.currentKsbElementId = 1;
    this.currentStandardId = 1;
    this.currentProfileId = 1;
    this.currentEvidenceId = 1;
    this.currentMappingId = 1;
    this.currentOtjLogId = 1;
    this.currentWeeklyOtjTrackingId = 1;
    this.currentFeedbackId = 1;
    this.currentTaskId = 1;
    this.currentTwelveWeeklyReviewId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create apprenticeship standard
    const standard: InsertApprenticeshipStandard = {
      title: "Digital Marketing Specialist",
      level: 4,
      description: "The primary role of a digital marketer is to define, design, build and implement digital campaigns across a variety of online and social media platforms to drive customer acquisition, customer engagement and customer retention.",
      minimumOtjHours: 6
    };
    const createdStandard = this.createApprenticeshipStandard(standard);

    // Create KSB elements
    const ksbElements: InsertKsbElement[] = [
      {
        type: "knowledge",
        code: "K1",
        description: "Digital Marketing Principles",
        standardId: createdStandard.id
      },
      {
        type: "knowledge",
        code: "K2",
        description: "Content Strategy Development",
        standardId: createdStandard.id
      },
      {
        type: "knowledge",
        code: "K3",
        description: "SEO Fundamentals",
        standardId: createdStandard.id
      },
      {
        type: "skill",
        code: "S1",
        description: "Social Media Management",
        standardId: createdStandard.id
      },
      {
        type: "skill",
        code: "S2",
        description: "Analytics and Reporting",
        standardId: createdStandard.id
      },
      {
        type: "behavior",
        code: "B1",
        description: "Professional Communication",
        standardId: createdStandard.id
      },
      {
        type: "behavior",
        code: "B2",
        description: "Time Management",
        standardId: createdStandard.id
      }
    ];
    
    ksbElements.forEach(element => this.createKsbElement(element));

    // Create users
    const users: InsertUser[] = [
      {
        username: "admin",
        password: "password", // In a real app, this would be hashed
        firstName: "Admin",
        lastName: "User",
        email: "admin@skilltrack.com",
        role: "admin",
        avatarUrl: null
      },
      {
        username: "tutor",
        password: "password",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@skilltrack.com",
        role: "assessor",
        avatarUrl: null
      },
      {
        username: "iqa",
        password: "password",
        firstName: "Robert",
        lastName: "Blake",
        email: "robert@skilltrack.com",
        role: "iqa",
        avatarUrl: null
      },
      {
        username: "provider",
        password: "password",
        firstName: "Training",
        lastName: "Provider",
        email: "provider@skilltrack.com",
        role: "training_provider",
        avatarUrl: null
      },
      {
        username: "learner",
        password: "password",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        role: "learner",
        avatarUrl: null
      }
    ];
    
    const createdUsers = users.map(user => this.createUser(user));
    
    // Create learner profile
    const learnerProfile: InsertLearnerProfile = {
      userId: createdUsers[4].id, // John Doe
      standardId: createdStandard.id,
      startDate: new Date("2022-09-12"),
      expectedEndDate: new Date("2024-09-11"),
      tutorId: createdUsers[1].id, // Sarah Johnson
      iqaId: createdUsers[2].id, // Robert Blake
      trainingProviderId: createdUsers[3].id // Training Provider
    };
    
    this.createLearnerProfile(learnerProfile);
    
    // Create evidence items
    const evidenceItems: InsertEvidenceItem[] = [
      {
        learnerId: createdUsers[4].id,
        title: "Customer Journey Map Project",
        description: "A comprehensive analysis of the customer journey for an e-commerce website.",
        evidenceType: "project",
        fileUrl: null,
        submissionDate: new Date("2023-05-12"),
        status: "approved"
      },
      {
        learnerId: createdUsers[4].id,
        title: "Content Calendar Template",
        description: "A template for planning content across multiple social media platforms.",
        evidenceType: "document",
        fileUrl: null,
        submissionDate: new Date("2023-05-08"),
        status: "in_review"
      },
      {
        learnerId: createdUsers[4].id,
        title: "PPC Campaign Presentation",
        description: "A presentation on a PPC campaign strategy for a local business.",
        evidenceType: "video",
        fileUrl: null,
        submissionDate: new Date("2023-05-02"),
        status: "needs_revision"
      }
    ];
    
    const createdEvidence = evidenceItems.map(item => this.createEvidenceItem(item));
    
    // Create evidence-ksb mappings
    const evidenceKsbMappings: InsertEvidenceKsbMapping[] = [
      {
        evidenceId: createdEvidence[0].id,
        ksbId: 1 // K1
      },
      {
        evidenceId: createdEvidence[1].id,
        ksbId: 2 // K2
      },
      {
        evidenceId: createdEvidence[2].id,
        ksbId: 5 // S2
      }
    ];
    
    evidenceKsbMappings.forEach(mapping => this.createEvidenceKsbMapping(mapping));
    
    // Create OTJ log entries
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    
    const otjLogEntries: InsertOtjLogEntry[] = [
      {
        learnerId: createdUsers[4].id,
        date: new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() + 1), // Monday of current week
        hours: 4,
        activityType: "research",
        description: "Researched SEO strategies for small businesses",
        category: "otj",
        ksbId: 3, // K3
        evidenceId: null,
        status: "submitted"
      },
      {
        learnerId: createdUsers[4].id,
        date: new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() - 7), // Previous week Monday
        hours: 7,
        activityType: "project",
        description: "Worked on social media campaign for client",
        category: "otj",
        ksbId: 4, // S1
        evidenceId: null,
        status: "approved"
      },
      {
        learnerId: createdUsers[4].id,
        date: new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate() - 14), // Two weeks ago Monday
        hours: 6,
        activityType: "workshop",
        description: "Attended digital marketing workshop",
        category: "otj",
        ksbId: 1, // K1
        evidenceId: null,
        status: "approved"
      }
    ];
    
    otjLogEntries.forEach(entry => this.createOtjLogEntry(entry));
    
    // Create tasks
    const tasks: InsertTask[] = [
      {
        title: "Submit E-commerce Analysis",
        description: "Complete and submit the e-commerce website analysis assignment.",
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2), // 2 days from now
        assignedById: createdUsers[1].id, // Sarah Johnson
        assignedToId: createdUsers[4].id, // John Doe
        status: "pending",
        ksbId: 2 // K2
      },
      {
        title: "Progress Review Meeting",
        description: "Quarterly progress review meeting with your tutor.",
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), // 5 days from now
        assignedById: createdUsers[1].id, // Sarah Johnson
        assignedToId: createdUsers[4].id, // John Doe
        status: "pending",
        ksbId: null
      },
      {
        title: "Social Media Campaign Evidence",
        description: "Submit evidence of your recent social media campaign work.",
        dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7), // 1 week from now
        assignedById: createdUsers[1].id, // Sarah Johnson
        assignedToId: createdUsers[4].id, // John Doe
        status: "pending",
        ksbId: 4 // S1
      }
    ];
    
    tasks.forEach(task => this.createTask(task));
    
    // Create feedback
    const feedbackItems: InsertFeedbackItem[] = [
      {
        senderId: createdUsers[1].id, // Sarah Johnson
        recipientId: createdUsers[4].id, // John Doe
        message: "Great work on your Customer Journey Map project! You've demonstrated a solid understanding of the user journey and identified key touch points. I particularly liked your analysis of pain points and opportunities. For future projects, consider including more quantitative data to support your findings.",
        date: new Date("2023-05-12"),
        relatedItemType: "evidence",
        relatedItemId: createdEvidence[0].id
      },
      {
        senderId: createdUsers[2].id, // Robert Blake
        recipientId: createdUsers[4].id, // John Doe
        message: "I've reviewed your OTJ logs for April as part of our quality assurance process. Your documentation is thorough and clearly demonstrates the connection between your activities and the KSBs. Keep up the good work with tracking your hours consistently.",
        date: new Date("2023-05-05"),
        relatedItemType: "otj_log",
        relatedItemId: 2 // Sample OTJ log ID
      }
    ];
    
    feedbackItems.forEach(feedback => this.createFeedbackItem(feedback));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserStatus(id: number, status: 'unverified' | 'pending_approval' | 'active' | 'suspended' | 'deactivated'): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, status };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Email verification operations
  async createEmailVerification(verificationData: InsertEmailVerification): Promise<EmailVerification> {
    const id = this.currentEmailVerificationId++;
    const verification: EmailVerification = {
      id,
      ...verificationData,
      verified: verificationData.verified || false,
      verifiedAt: verificationData.verified ? new Date() : null,
      createdAt: new Date()
    };
    this.emailVerifications.set(id, verification);
    return verification;
  }
  
  async getEmailVerificationByToken(token: string): Promise<EmailVerification | undefined> {
    for (const verification of this.emailVerifications.values()) {
      if (verification.token === token) {
        return verification;
      }
    }
    return undefined;
  }
  
  async getEmailVerificationByUserId(userId: number): Promise<EmailVerification | undefined> {
    for (const verification of this.emailVerifications.values()) {
      if (verification.userId === userId) {
        return verification;
      }
    }
    return undefined;
  }
  
  async updateEmailVerification(id: number, data: Partial<InsertEmailVerification>): Promise<EmailVerification | undefined> {
    const verification = this.emailVerifications.get(id);
    if (!verification) {
      return undefined;
    }
    
    const updatedVerification = { 
      ...verification, 
      ...data 
    };
    
    if (data.verified === true && !verification.verified) {
      updatedVerification.verifiedAt = new Date();
    }
    
    this.emailVerifications.set(id, updatedVerification);
    return updatedVerification;
  }

  // KSB Element operations
  async getKsbElement(id: number): Promise<KsbElement | undefined> {
    return this.ksbElements.get(id);
  }

  async getKsbElementsByStandard(standardId: number): Promise<KsbElement[]> {
    return Array.from(this.ksbElements.values()).filter(
      (element) => element.standardId === standardId,
    );
  }

  async createKsbElement(insertKsbElement: InsertKsbElement): Promise<KsbElement> {
    const id = this.currentKsbElementId++;
    const ksbElement: KsbElement = { ...insertKsbElement, id };
    this.ksbElements.set(id, ksbElement);
    return ksbElement;
  }

  // Apprenticeship Standard operations
  async getApprenticeshipStandard(id: number): Promise<ApprenticeshipStandard | undefined> {
    return this.apprenticeshipStandards.get(id);
  }

  async getAllApprenticeshipStandards(): Promise<ApprenticeshipStandard[]> {
    return Array.from(this.apprenticeshipStandards.values());
  }

  async createApprenticeshipStandard(insertStandard: InsertApprenticeshipStandard): Promise<ApprenticeshipStandard> {
    const id = this.currentStandardId++;
    const standard: ApprenticeshipStandard = { ...insertStandard, id };
    this.apprenticeshipStandards.set(id, standard);
    return standard;
  }

  // Learner Profile operations
  async getLearnerProfile(id: number): Promise<LearnerProfile | undefined> {
    return this.learnerProfiles.get(id);
  }

  async getLearnerProfileByUserId(userId: number): Promise<LearnerProfile | undefined> {
    return Array.from(this.learnerProfiles.values()).find(
      (profile) => profile.userId === userId,
    );
  }

  async createLearnerProfile(insertProfile: InsertLearnerProfile): Promise<LearnerProfile> {
    const id = this.currentProfileId++;
    const profile: LearnerProfile = { ...insertProfile, id };
    this.learnerProfiles.set(id, profile);
    return profile;
  }

  async updateLearnerProfile(id: number, profileData: Partial<InsertLearnerProfile>): Promise<LearnerProfile | undefined> {
    const profile = await this.getLearnerProfile(id);
    if (!profile) return undefined;
    
    const updatedProfile = { ...profile, ...profileData };
    this.learnerProfiles.set(id, updatedProfile);
    return updatedProfile;
  }

  // Evidence Item operations
  async getEvidenceItem(id: number): Promise<EvidenceItem | undefined> {
    return this.evidenceItems.get(id);
  }

  async getEvidenceItemsByLearnerId(
    learnerId: number, 
    status?: string | null, 
    limit?: number, 
    offset?: number
  ): Promise<EvidenceItem[]> {
    // Filter by learner ID and optional status
    let filteredItems = Array.from(this.evidenceItems.values()).filter(
      (item) => {
        // Always filter by learner ID
        const learnerMatch = item.learnerId === learnerId;
        
        // If status is provided, also filter by status
        const statusMatch = status ? item.status === status : true;
        
        return learnerMatch && statusMatch;
      }
    );
    
    // Sort by submission date (newest first)
    filteredItems.sort((a, b) => {
      const dateA = new Date(a.submissionDate).getTime();
      const dateB = new Date(b.submissionDate).getTime();
      return dateB - dateA;
    });
    
    // Apply pagination if both limit and offset are provided
    if (typeof limit === 'number' && typeof offset === 'number') {
      return filteredItems.slice(offset, offset + limit);
    }
    
    return filteredItems;
  }
  
  async countEvidenceItemsByLearnerId(learnerId: number, status?: string | null): Promise<number> {
    return Array.from(this.evidenceItems.values()).filter(
      (item) => {
        // Always filter by learner ID
        const learnerMatch = item.learnerId === learnerId;
        
        // If status is provided, also filter by status
        const statusMatch = status ? item.status === status : true;
        
        return learnerMatch && statusMatch;
      }
    ).length;
  }
  
  async getEvidenceItemsByDateRange(startDate: Date, endDate: Date): Promise<EvidenceItem[]> {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    return Array.from(this.evidenceItems.values()).filter(
      (item) => {
        const itemDate = new Date(item.submissionDate).getTime();
        return itemDate >= startTime && itemDate <= endTime;
      }
    );
  }

  async createEvidenceItem(insertItem: InsertEvidenceItem): Promise<EvidenceItem> {
    const id = this.currentEvidenceId++;
    const item: EvidenceItem = { ...insertItem, id };
    this.evidenceItems.set(id, item);
    return item;
  }

  async updateEvidenceItem(id: number, itemData: Partial<InsertEvidenceItem>): Promise<EvidenceItem | undefined> {
    const item = await this.getEvidenceItem(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...itemData };
    this.evidenceItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteEvidenceItem(id: number): Promise<void> {
    this.evidenceItems.delete(id);
  }

  // Evidence-KSB Mapping operations
  async createEvidenceKsbMapping(insertMapping: InsertEvidenceKsbMapping): Promise<EvidenceKsbMapping> {
    const id = this.currentMappingId++;
    const mapping: EvidenceKsbMapping = { ...insertMapping, id };
    this.evidenceKsbMappings.set(id, mapping);
    return mapping;
  }

  async getKsbsByEvidenceId(evidenceId: number): Promise<KsbElement[]> {
    const mappings = Array.from(this.evidenceKsbMappings.values()).filter(
      (mapping) => mapping.evidenceId === evidenceId,
    );
    
    const ksbIds = mappings.map(mapping => mapping.ksbId);
    return Array.from(this.ksbElements.values()).filter(
      (element) => ksbIds.includes(element.id),
    );
  }
  
  async deleteEvidenceKsbMappingsByEvidenceId(evidenceId: number): Promise<void> {
    // Find all mapping IDs for this evidence
    const mappingIdsToDelete: number[] = [];
    
    this.evidenceKsbMappings.forEach((mapping, id) => {
      if (mapping.evidenceId === evidenceId) {
        mappingIdsToDelete.push(id);
      }
    });
    
    // Delete all mappings for this evidence
    for (const id of mappingIdsToDelete) {
      this.evidenceKsbMappings.delete(id);
    }
  }

  // OTJ Log Entry operations
  async getOtjLogEntry(id: number): Promise<OtjLogEntry | undefined> {
    return this.otjLogEntries.get(id);
  }

  async getOtjLogEntriesByLearnerId(
    learnerId: number,
    status?: string | null,
    limit?: number,
    offset?: number
  ): Promise<OtjLogEntry[]> {
    // Filter by learner ID and optional status
    let filteredEntries = Array.from(this.otjLogEntries.values()).filter(
      (entry) => {
        // Always filter by learner ID
        const learnerMatch = entry.learnerId === learnerId;
        
        // If status is provided, also filter by status
        const statusMatch = status ? entry.status === status : true;
        
        return learnerMatch && statusMatch;
      }
    );
    
    // Sort by date (newest first)
    filteredEntries.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    // Apply pagination if both limit and offset are provided
    if (typeof limit === 'number' && typeof offset === 'number') {
      return filteredEntries.slice(offset, offset + limit);
    }
    
    return filteredEntries;
  }
  
  async countOtjLogEntriesByLearnerId(
    learnerId: number,
    status?: string | null
  ): Promise<number> {
    return Array.from(this.otjLogEntries.values()).filter(
      (entry) => {
        // Always filter by learner ID
        const learnerMatch = entry.learnerId === learnerId;
        
        // If status is provided, also filter by status
        const statusMatch = status ? entry.status === status : true;
        
        return learnerMatch && statusMatch;
      }
    ).length;
  }

  async getOtjLogEntriesByLearnerIdAndDateRange(
    learnerId: number, 
    startDate: Date, 
    endDate: Date,
    status?: string | null,
    limit?: number,
    offset?: number
  ): Promise<OtjLogEntry[]> {
    // Filter entries by learner ID, date range, and optional status
    let filteredEntries = Array.from(this.otjLogEntries.values()).filter(
      (entry) => {
        const entryDate = new Date(entry.date);
        const dateMatch = entryDate >= startDate && entryDate <= endDate;
        const learnerMatch = entry.learnerId === learnerId;
        const statusMatch = status ? entry.status === status : true;
        
        return learnerMatch && dateMatch && statusMatch;
      }
    );
    
    // Sort by date (newest first)
    filteredEntries.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    // Apply pagination if both limit and offset are provided
    if (typeof limit === 'number' && typeof offset === 'number') {
      return filteredEntries.slice(offset, offset + limit);
    }
    
    return filteredEntries;
  }
  
  async countOtjLogEntriesByLearnerIdAndDateRange(
    learnerId: number,
    startDate: Date,
    endDate: Date,
    status?: string | null
  ): Promise<number> {
    return Array.from(this.otjLogEntries.values()).filter(
      (entry) => {
        const entryDate = new Date(entry.date);
        const dateMatch = entryDate >= startDate && entryDate <= endDate;
        const learnerMatch = entry.learnerId === learnerId;
        const statusMatch = status ? entry.status === status : true;
        
        return learnerMatch && dateMatch && statusMatch;
      }
    ).length;
  }

  async createOtjLogEntry(insertEntry: InsertOtjLogEntry): Promise<OtjLogEntry> {
    const id = this.currentOtjLogId++;
    const entry: OtjLogEntry = { 
      ...insertEntry, 
      id, 
      verifierId: null, 
      verificationDate: null, 
      iqaVerifierId: null, 
      iqaVerificationDate: null 
    };
    this.otjLogEntries.set(id, entry);
    return entry;
  }

  async updateOtjLogEntry(id: number, entryData: Partial<InsertOtjLogEntry>): Promise<OtjLogEntry | undefined> {
    const entry = await this.getOtjLogEntry(id);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, ...entryData };
    this.otjLogEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async verifyOtjLogEntry(id: number, verifierId: number): Promise<OtjLogEntry | undefined> {
    const entry = await this.getOtjLogEntry(id);
    if (!entry) return undefined;
    
    const updatedEntry = { 
      ...entry, 
      status: "approved" as const, 
      verifierId, 
      verificationDate: new Date() 
    };
    this.otjLogEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async iqaVerifyOtjLogEntry(id: number, iqaVerifierId: number): Promise<OtjLogEntry | undefined> {
    const entry = await this.getOtjLogEntry(id);
    if (!entry) return undefined;
    
    const updatedEntry = { 
      ...entry, 
      iqaVerifierId, 
      iqaVerificationDate: new Date() 
    };
    this.otjLogEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  // Weekly OTJ Hour Tracking operations
  async getWeeklyOtjTracking(id: number): Promise<WeeklyOtjTracking | undefined> {
    return this.weeklyOtjTrackings.get(id);
  }

  async getWeeklyOtjTrackingsByLearnerId(
    learnerId: number, 
    startDate?: Date, 
    endDate?: Date,
    limit?: number,
    offset?: number
  ): Promise<WeeklyOtjTracking[]> {
    let trackings = Array.from(this.weeklyOtjTrackings.values())
      .filter(tracking => tracking.learnerId === learnerId);
    
    // Apply date filtering if provided
    if (startDate) {
      const startTime = startDate.getTime();
      trackings = trackings.filter(tracking => 
        new Date(tracking.weekStartDate).getTime() >= startTime
      );
    }
    
    if (endDate) {
      const endTime = endDate.getTime();
      trackings = trackings.filter(tracking => 
        new Date(tracking.weekStartDate).getTime() <= endTime
      );
    }
    
    // Sort by date (newest first)
    trackings = trackings.sort((a, b) => 
      new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
    );
    
    // Apply pagination if both limit and offset are provided
    if (typeof limit === 'number' && typeof offset === 'number') {
      return trackings.slice(offset, offset + limit);
    }
    
    return trackings;
  }
  
  async countWeeklyOtjTrackingsByLearnerId(
    learnerId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<number> {
    let trackings = Array.from(this.weeklyOtjTrackings.values())
      .filter(tracking => tracking.learnerId === learnerId);
    
    // Apply date filtering if provided
    if (startDate) {
      const startTime = startDate.getTime();
      trackings = trackings.filter(tracking => 
        new Date(tracking.weekStartDate).getTime() >= startTime
      );
    }
    
    if (endDate) {
      const endTime = endDate.getTime();
      trackings = trackings.filter(tracking => 
        new Date(tracking.weekStartDate).getTime() <= endTime
      );
    }
    
    return trackings.length;
  }

  async getWeeklyOtjTrackingByLearnerIdAndWeek(learnerId: number, weekStartDate: Date): Promise<WeeklyOtjTracking | undefined> {
    const weekStart = new Date(weekStartDate).setHours(0, 0, 0, 0);
    
    return Array.from(this.weeklyOtjTrackings.values())
      .find(tracking => {
        const trackingWeekStart = new Date(tracking.weekStartDate).setHours(0, 0, 0, 0);
        return tracking.learnerId === learnerId && trackingWeekStart === weekStart;
      });
  }

  async createWeeklyOtjTracking(insertTracking: InsertWeeklyOtjTracking): Promise<WeeklyOtjTracking> {
    const id = this.currentWeeklyOtjTrackingId++;
    
    const weeklyTracking: WeeklyOtjTracking = {
      ...insertTracking,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.weeklyOtjTrackings.set(id, weeklyTracking);
    return weeklyTracking;
  }

  async updateWeeklyOtjTracking(id: number, trackingData: Partial<InsertWeeklyOtjTracking>): Promise<WeeklyOtjTracking | undefined> {
    const tracking = this.weeklyOtjTrackings.get(id);
    if (!tracking) return undefined;
    
    const updatedTracking: WeeklyOtjTracking = {
      ...tracking,
      ...trackingData,
      updatedAt: new Date()
    };
    
    this.weeklyOtjTrackings.set(id, updatedTracking);
    return updatedTracking;
  }

  async reviewWeeklyOtjTracking(id: number, tutorId: number, notes?: string): Promise<WeeklyOtjTracking | undefined> {
    const tracking = this.weeklyOtjTrackings.get(id);
    if (!tracking) return undefined;
    
    const updatedTracking: WeeklyOtjTracking = {
      ...tracking,
      reviewedByTutorId: tutorId,
      reviewedOn: new Date(),
      tutorNotes: notes || tracking.tutorNotes,
      updatedAt: new Date()
    };
    
    this.weeklyOtjTrackings.set(id, updatedTracking);
    return updatedTracking;
  }

  // Feedback Item operations
  async createFeedbackItem(insertFeedback: InsertFeedbackItem): Promise<FeedbackItem> {
    const id = this.currentFeedbackId++;
    const feedback: FeedbackItem = { ...insertFeedback, id };
    this.feedbackItems.set(id, feedback);
    return feedback;
  }

  async getFeedbackItem(id: number): Promise<FeedbackItem | undefined> {
    return this.feedbackItems.get(id);
  }

  async getFeedbackItemsByRecipientId(recipientId: number): Promise<FeedbackItem[]> {
    return Array.from(this.feedbackItems.values()).filter(
      (feedback) => feedback.recipientId === recipientId,
    );
  }

  async getFeedbackItemsByRelatedItem(itemType: string, itemId: number): Promise<FeedbackItem[]> {
    return Array.from(this.feedbackItems.values()).filter(
      (feedback) => feedback.relatedItemType === itemType && feedback.relatedItemId === itemId,
    );
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByAssignedToId(assignedToId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedToId === assignedToId,
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { ...insertTask, id };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // Learning Goals operations
  private learningGoals = new Map<number, LearningGoal>();
  private currentLearningGoalId = 1;
  
  async getLearningGoal(id: number): Promise<LearningGoal | undefined> {
    return this.learningGoals.get(id);
  }

  async getLearningGoalsByLearnerId(learnerId: number): Promise<LearningGoal[]> {
    return Array.from(this.learningGoals.values()).filter(
      (goal) => goal.learnerId === learnerId,
    );
  }

  async createLearningGoal(goalData: InsertLearningGoal): Promise<LearningGoal> {
    const id = this.currentLearningGoalId++;
    const goal: LearningGoal = { 
      ...goalData, 
      id,
      createdAt: new Date()
    };
    this.learningGoals.set(id, goal);
    return goal;
  }

  async updateLearningGoal(id: number, goalData: Partial<InsertLearningGoal>): Promise<LearningGoal | undefined> {
    const goal = this.learningGoals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, ...goalData };
    this.learningGoals.set(id, updatedGoal);
    return updatedGoal;
  }
  
  // AI Assistant operations
  private aiAssistantConfigs = new Map<number, AiAssistantConfig>();
  private aiAssistantConversations = new Map<number, AiAssistantConversation>();
  private currentAiAssistantConfigId = 1;
  private currentAiAssistantConversationId = 1;
  
  async getAiAssistantConfig(userId: number): Promise<AiAssistantConfig | undefined> {
    return Array.from(this.aiAssistantConfigs.values()).find(
      config => config.userId === userId
    );
  }
  
  async createOrUpdateAiAssistantConfig(configData: InsertAiAssistantConfig): Promise<AiAssistantConfig> {
    // Check if config already exists for this user
    const existingConfig = await this.getAiAssistantConfig(configData.userId);
    
    if (existingConfig) {
      // Update existing config
      const updatedConfig: AiAssistantConfig = {
        ...existingConfig,
        ...configData,
        updatedAt: new Date()
      };
      this.aiAssistantConfigs.set(existingConfig.id, updatedConfig);
      return updatedConfig;
    } else {
      // Create new config
      const id = this.currentAiAssistantConfigId++;
      const newConfig: AiAssistantConfig = {
        ...configData,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.aiAssistantConfigs.set(id, newConfig);
      return newConfig;
    }
  }
  
  async createAiAssistantConversation(conversationData: InsertAiAssistantConversation): Promise<AiAssistantConversation> {
    const id = this.currentAiAssistantConversationId++;
    const conversation: AiAssistantConversation = {
      ...conversationData,
      id,
      createdAt: new Date()
    };
    this.aiAssistantConversations.set(id, conversation);
    return conversation;
  }
  
  async getAiAssistantConversationsByUserId(userId: number): Promise<AiAssistantConversation[]> {
    return Array.from(this.aiAssistantConversations.values())
      .filter(conversation => conversation.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent first
  }
  
  // Learning Resources operations
  private learningResources = new Map<number, LearningResource>();
  private currentLearningResourceId = 1;
  
  async getLearningResource(id: number): Promise<LearningResource | undefined> {
    return this.learningResources.get(id);
  }
  
  async getAllLearningResources(): Promise<LearningResource[]> {
    return Array.from(this.learningResources.values());
  }
  
  async getLearningResourcesByStandardId(standardId: number): Promise<LearningResource[]> {
    return Array.from(this.learningResources.values())
      .filter(resource => resource.standardId === standardId);
  }
  
  async createLearningResource(resourceData: InsertLearningResource): Promise<LearningResource> {
    const id = this.currentLearningResourceId++;
    const resource: LearningResource = {
      ...resourceData,
      id,
      createdAt: new Date()
    };
    this.learningResources.set(id, resource);
    return resource;
  }
  
  // Provider Settings operations
  private providerSettings: ProviderSettings | null = null;
  
  async getProviderSettings(): Promise<ProviderSettings | undefined> {
    return this.providerSettings || undefined;
  }
  
  async updateProviderSettings(settingsData: InsertProviderSettings): Promise<ProviderSettings> {
    if (this.providerSettings) {
      // Update existing settings
      const updatedSettings: ProviderSettings = {
        ...this.providerSettings,
        ...settingsData,
        updatedAt: new Date()
      };
      this.providerSettings = updatedSettings;
      return updatedSettings;
    } else {
      // Create new settings
      const newSettings: ProviderSettings = {
        ...settingsData,
        id: 1,
        updatedAt: new Date()
      };
      this.providerSettings = newSettings;
      return newSettings;
    }
  }
  
  // Course Builder Templates operations
  private courseBuilderTemplates = new Map<number, CourseBuilderTemplate>();
  private currentCourseBuilderTemplateId = 1;
  
  async getCourseBuilderTemplate(id: number): Promise<CourseBuilderTemplate | undefined> {
    return this.courseBuilderTemplates.get(id);
  }
  
  async getCourseBuilderTemplatesByStandardId(standardId: number): Promise<CourseBuilderTemplate[]> {
    return Array.from(this.courseBuilderTemplates.values())
      .filter(template => template.standardId === standardId);
  }
  
  async getPublicCourseBuilderTemplates(): Promise<CourseBuilderTemplate[]> {
    return Array.from(this.courseBuilderTemplates.values())
      .filter(template => template.isPublic);
  }
  
  async getCourseBuilderTemplatesByCreator(creatorId: number): Promise<CourseBuilderTemplate[]> {
    return Array.from(this.courseBuilderTemplates.values())
      .filter(template => template.createdById === creatorId);
  }
  
  async createCourseBuilderTemplate(templateData: InsertCourseBuilderTemplate): Promise<CourseBuilderTemplate> {
    const id = this.currentCourseBuilderTemplateId++;
    const template: CourseBuilderTemplate = {
      ...templateData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.courseBuilderTemplates.set(id, template);
    return template;
  }
  
  async updateCourseBuilderTemplate(id: number, templateData: Partial<InsertCourseBuilderTemplate>): Promise<CourseBuilderTemplate | undefined> {
    const template = this.courseBuilderTemplates.get(id);
    if (!template) return undefined;
    
    const updatedTemplate: CourseBuilderTemplate = {
      ...template,
      ...templateData,
      updatedAt: new Date()
    };
    this.courseBuilderTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  // 12-Weekly Review operations
  async getTwelveWeeklyReview(id: number): Promise<TwelveWeeklyReview | undefined> {
    return this.twelveWeeklyReviews.get(id);
  }

  async getTwelveWeeklyReviewsByLearnerId(learnerId: number): Promise<TwelveWeeklyReview[]> {
    return Array.from(this.twelveWeeklyReviews.values())
      .filter(review => review.learnerId === learnerId);
  }

  async getTwelveWeeklyReviewsByTutorId(tutorId: number): Promise<TwelveWeeklyReview[]> {
    return Array.from(this.twelveWeeklyReviews.values())
      .filter(review => review.tutorId === tutorId);
  }

  async getUpcomingTwelveWeeklyReviews(days: number): Promise<TwelveWeeklyReview[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    return Array.from(this.twelveWeeklyReviews.values())
      .filter(review => {
        const scheduledDate = new Date(review.scheduledDate);
        return scheduledDate >= now && scheduledDate <= futureDate && review.status === 'scheduled';
      });
  }

  async createTwelveWeeklyReview(review: InsertTwelveWeeklyReview): Promise<TwelveWeeklyReview> {
    const id = this.currentTwelveWeeklyReviewId++;
    const newReview: TwelveWeeklyReview = {
      id,
      ...review,
      createdAt: new Date(),
      updatedAt: new Date(),
      learnerSignatureDate: null,
      employerSignatureDate: null,
      tutorSignatureDate: null
    };
    
    this.twelveWeeklyReviews.set(id, newReview);
    return newReview;
  }

  async updateTwelveWeeklyReview(id: number, review: Partial<InsertTwelveWeeklyReview>): Promise<TwelveWeeklyReview | undefined> {
    const existingReview = this.twelveWeeklyReviews.get(id);
    if (!existingReview) {
      return undefined;
    }
    
    const updatedReview = {
      ...existingReview,
      ...review,
      updatedAt: new Date()
    };
    
    this.twelveWeeklyReviews.set(id, updatedReview);
    return updatedReview;
  }

  async signTwelveWeeklyReview(id: number, role: 'learner' | 'employer' | 'tutor' | 'admin' | 'iqa', userId: number): Promise<TwelveWeeklyReview | undefined> {
    const existingReview = this.twelveWeeklyReviews.get(id);
    if (!existingReview) {
      return undefined;
    }
    
    // Special handling for admin/iqa roles - they have elevated permissions
    const isAdminOrIqa = role === 'admin' || role === 'iqa';
    
    // Check if the user has the right to sign this review, skip this check for admin/iqa
    if (!isAdminOrIqa && (
      (role === 'learner' && existingReview.learnerId !== userId) ||
      (role === 'tutor' && existingReview.tutorId !== userId) ||
      (role === 'employer' && existingReview.employerId !== userId)
    )) {
      return undefined;
    }
    
    const now = new Date();
    const updatedReview = { ...existingReview, updatedAt: now };
    
    // Update the appropriate signature fields
    if (role === 'learner') {
      updatedReview.signedByLearner = true;
      updatedReview.learnerSignatureDate = now;
    } else if (role === 'employer') {
      updatedReview.signedByEmployer = true;
      updatedReview.employerSignatureDate = now;
    } else if (role === 'tutor' || isAdminOrIqa) {
      // Admin/IQA users sign as tutors
      updatedReview.signedByTutor = true;
      updatedReview.tutorSignatureDate = now;
      
      // If the review was scheduled and is now being signed by the tutor/admin/iqa, update the status to completed
      if (updatedReview.status === 'scheduled' && !updatedReview.actualDate) {
        updatedReview.status = 'completed';
        updatedReview.actualDate = now;
      }
    }
    
    // If all parties have signed, ensure the status is completed
    if (updatedReview.signedByLearner && updatedReview.signedByEmployer && updatedReview.signedByTutor) {
      updatedReview.status = 'completed';
    }
    
    this.twelveWeeklyReviews.set(id, updatedReview);
    return updatedReview;
  }

  async rescheduleTwelveWeeklyReview(id: number, newDate: Date): Promise<TwelveWeeklyReview | undefined> {
    const existingReview = this.twelveWeeklyReviews.get(id);
    if (!existingReview) {
      return undefined;
    }
    
    const updatedReview = {
      ...existingReview,
      scheduledDate: newDate,
      status: 'rescheduled' as const,
      updatedAt: new Date()
    };
    
    this.twelveWeeklyReviews.set(id, updatedReview);
    return updatedReview;
  }
}

// Import DatabaseStorage implementation
import { DatabaseStorage } from './database-storage';

// Using PostgreSQL database storage for persistent data and session handling
export const storage = new DatabaseStorage();
