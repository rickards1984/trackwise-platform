// @ts-nocheck
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  ksbElements,
  apprenticeshipStandards,
  learnerProfiles,
  evidenceItems,
  evidenceKsbMapping,
  otjLogEntries,
  feedbackItems,
  tasks,
  learningGoals,
  aiAssistantConfig,
  aiAssistantConversations,
  learningResources,
  providerSettings,
  courseBuilderTemplates,
  emailVerifications,
  type User,
  type InsertUser,
  type KsbElement,
  type InsertKsbElement,
  type ApprenticeshipStandard,
  type InsertApprenticeshipStandard,
  type LearnerProfile,
  type InsertLearnerProfile,
  type EvidenceItem,
  type InsertEvidenceItem,
  type EvidenceKsbMapping,
  type InsertEvidenceKsbMapping,
  type OtjLogEntry,
  type InsertOtjLogEntry,
  type FeedbackItem,
  type InsertFeedbackItem,
  type Task,
  type InsertTask,
  type LearningGoal,
  type InsertLearningGoal,
  type AiAssistantConfig,
  type InsertAiAssistantConfig,
  type AiAssistantConversation,
  type InsertAiAssistantConversation,
  type LearningResource,
  type InsertLearningResource,
  type ProviderSettings,
  type InsertProviderSettings,
  type CourseBuilderTemplate,
  type InsertCourseBuilderTemplate,
  type EmailVerification,
  type InsertEmailVerification,
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async updateUserStatus(id: number, status: 'unverified' | 'pending_approval' | 'active' | 'suspended' | 'deactivated'): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Email verification operations
  async createEmailVerification(verificationData: InsertEmailVerification): Promise<EmailVerification> {
    const [verification] = await db
      .insert(emailVerifications)
      .values(verificationData)
      .returning();
    return verification;
  }
  
  async getEmailVerificationByToken(token: string): Promise<EmailVerification | undefined> {
    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.token, token));
    return verification;
  }
  
  async getEmailVerificationByUserId(userId: number): Promise<EmailVerification | undefined> {
    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.userId, userId));
    return verification;
  }
  
  async updateEmailVerification(id: number, verificationData: Partial<InsertEmailVerification>): Promise<EmailVerification | undefined> {
    // If setting as verified, add verifiedAt timestamp
    const updateData = { ...verificationData };
    if (verificationData.verified === true) {
      updateData.verifiedAt = new Date();
    }
    
    const [verification] = await db
      .update(emailVerifications)
      .set(updateData)
      .where(eq(emailVerifications.id, id))
      .returning();
    return verification;
  }

  // KSB Element operations
  async getKsbElement(id: number): Promise<KsbElement | undefined> {
    const [ksbElement] = await db.select().from(ksbElements).where(eq(ksbElements.id, id));
    return ksbElement;
  }

  async getKsbElementsByStandard(standardId: number): Promise<KsbElement[]> {
    return db.select().from(ksbElements).where(eq(ksbElements.standardId, standardId));
  }

  async createKsbElement(ksbData: InsertKsbElement): Promise<KsbElement> {
    const [ksbElement] = await db.insert(ksbElements).values(ksbData).returning();
    return ksbElement;
  }

  // Apprenticeship Standard operations
  async getApprenticeshipStandard(id: number): Promise<ApprenticeshipStandard | undefined> {
    const [standard] = await db.select().from(apprenticeshipStandards).where(eq(apprenticeshipStandards.id, id));
    return standard;
  }

  async getAllApprenticeshipStandards(): Promise<ApprenticeshipStandard[]> {
    return db.select().from(apprenticeshipStandards);
  }

  async createApprenticeshipStandard(standardData: InsertApprenticeshipStandard): Promise<ApprenticeshipStandard> {
    const [standard] = await db.insert(apprenticeshipStandards).values(standardData).returning();
    return standard;
  }

  // Learner Profile operations
  async getLearnerProfile(id: number): Promise<LearnerProfile | undefined> {
    const [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.id, id));
    return profile;
  }

  async getLearnerProfileByUserId(userId: number): Promise<LearnerProfile | undefined> {
    const [profile] = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId));
    return profile;
  }

  async createLearnerProfile(profileData: InsertLearnerProfile): Promise<LearnerProfile> {
    const [profile] = await db.insert(learnerProfiles).values(profileData).returning();
    return profile;
  }

  async updateLearnerProfile(id: number, profileData: Partial<InsertLearnerProfile>): Promise<LearnerProfile | undefined> {
    const [profile] = await db
      .update(learnerProfiles)
      .set(profileData)
      .where(eq(learnerProfiles.id, id))
      .returning();
    return profile;
  }

  // Evidence Item operations
  async getEvidenceItem(id: number): Promise<EvidenceItem | undefined> {
    const [evidence] = await db.select().from(evidenceItems).where(eq(evidenceItems.id, id));
    return evidence;
  }

  async getEvidenceItemsByLearnerId(learnerId: number): Promise<EvidenceItem[]> {
    return db.select().from(evidenceItems).where(eq(evidenceItems.learnerId, learnerId));
  }

  async createEvidenceItem(evidenceData: InsertEvidenceItem): Promise<EvidenceItem> {
    const [evidence] = await db.insert(evidenceItems).values(evidenceData).returning();
    return evidence;
  }

  async updateEvidenceItem(id: number, evidenceData: Partial<InsertEvidenceItem>): Promise<EvidenceItem | undefined> {
    const [evidence] = await db
      .update(evidenceItems)
      .set(evidenceData)
      .where(eq(evidenceItems.id, id))
      .returning();
    return evidence;
  }

  // Evidence-KSB Mapping operations
  async createEvidenceKsbMapping(mappingData: InsertEvidenceKsbMapping): Promise<EvidenceKsbMapping> {
    const [mapping] = await db.insert(evidenceKsbMapping).values(mappingData).returning();
    return mapping;
  }

  async getKsbsByEvidenceId(evidenceId: number): Promise<KsbElement[]> {
    const mappings = await db
      .select()
      .from(evidenceKsbMapping)
      .where(eq(evidenceKsbMapping.evidenceId, evidenceId));
    
    if (mappings.length === 0) return [];
    
    const ksbIds = mappings.map(mapping => mapping.ksbId);
    return db.select().from(ksbElements).where(
      ksbIds.map(id => eq(ksbElements.id, id)).reduce((acc, curr) => acc || curr)
    );
  }

  async deleteEvidenceKsbMappingsByEvidenceId(evidenceId: number): Promise<void> {
    await db
      .delete(evidenceKsbMapping)
      .where(eq(evidenceKsbMapping.evidenceId, evidenceId));
  }

  // OTJ Log Entry operations
  async getOtjLogEntry(id: number): Promise<OtjLogEntry | undefined> {
    const [entry] = await db.select().from(otjLogEntries).where(eq(otjLogEntries.id, id));
    return entry;
  }

  async getOtjLogEntriesByLearnerId(learnerId: number): Promise<OtjLogEntry[]> {
    return db.select().from(otjLogEntries).where(eq(otjLogEntries.learnerId, learnerId));
  }

  async getOtjLogEntriesByLearnerIdAndDateRange(learnerId: number, startDate: Date, endDate: Date): Promise<OtjLogEntry[]> {
    // Convert dates to strings in ISO format for database comparison
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    return db
      .select()
      .from(otjLogEntries)
      .where(
        and(
          eq(otjLogEntries.learnerId, learnerId),
          and(
            otjLogEntries.date >= startDateStr,
            otjLogEntries.date <= endDateStr
          )
        )
      );
  }

  async createOtjLogEntry(entryData: InsertOtjLogEntry): Promise<OtjLogEntry> {
    const [entry] = await db.insert(otjLogEntries).values(entryData).returning();
    return entry;
  }

  async updateOtjLogEntry(id: number, entryData: Partial<InsertOtjLogEntry>): Promise<OtjLogEntry | undefined> {
    const [entry] = await db
      .update(otjLogEntries)
      .set(entryData)
      .where(eq(otjLogEntries.id, id))
      .returning();
    return entry;
  }

  async verifyOtjLogEntry(id: number, verifierId: number): Promise<OtjLogEntry | undefined> {
    const [entry] = await db
      .update(otjLogEntries)
      .set({
        verifierId,
        verificationDate: new Date(),
        status: 'approved',
      })
      .where(eq(otjLogEntries.id, id))
      .returning();
    return entry;
  }

  async iqaVerifyOtjLogEntry(id: number, iqaVerifierId: number): Promise<OtjLogEntry | undefined> {
    const [entry] = await db
      .update(otjLogEntries)
      .set({
        iqaVerifierId,
        iqaVerificationDate: new Date(),
      })
      .where(eq(otjLogEntries.id, id))
      .returning();
    return entry;
  }

  // Feedback Item operations
  async createFeedbackItem(feedbackData: InsertFeedbackItem): Promise<FeedbackItem> {
    const [feedback] = await db.insert(feedbackItems).values(feedbackData).returning();
    return feedback;
  }

  async getFeedbackItem(id: number): Promise<FeedbackItem | undefined> {
    const [feedback] = await db.select().from(feedbackItems).where(eq(feedbackItems.id, id));
    return feedback;
  }

  async getFeedbackItemsByRecipientId(recipientId: number): Promise<FeedbackItem[]> {
    return db.select().from(feedbackItems).where(eq(feedbackItems.recipientId, recipientId));
  }

  async getFeedbackItemsByRelatedItem(itemType: string, itemId: number): Promise<FeedbackItem[]> {
    return db
      .select()
      .from(feedbackItems)
      .where(
        and(
          eq(feedbackItems.relatedItemType, itemType),
          eq(feedbackItems.relatedItemId, itemId)
        )
      );
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByAssignedToId(assignedToId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.assignedToId, assignedToId));
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(taskData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  // Learning Goals operations
  async getLearningGoal(id: number): Promise<LearningGoal | undefined> {
    const [goal] = await db.select().from(learningGoals).where(eq(learningGoals.id, id));
    return goal;
  }

  async getLearningGoalsByLearnerId(learnerId: number): Promise<LearningGoal[]> {
    return db.select().from(learningGoals).where(eq(learningGoals.learnerId, learnerId));
  }

  async createLearningGoal(goalData: InsertLearningGoal): Promise<LearningGoal> {
    const [goal] = await db.insert(learningGoals).values(goalData).returning();
    return goal;
  }

  async updateLearningGoal(id: number, goalData: Partial<InsertLearningGoal>): Promise<LearningGoal | undefined> {
    const [goal] = await db
      .update(learningGoals)
      .set(goalData)
      .where(eq(learningGoals.id, id))
      .returning();
    return goal;
  }

  // AI Assistant Configuration operations
  async getAiAssistantConfig(userId: number): Promise<AiAssistantConfig | undefined> {
    const [config] = await db.select().from(aiAssistantConfig).where(eq(aiAssistantConfig.userId, userId));
    return config;
  }

  async createOrUpdateAiAssistantConfig(configData: InsertAiAssistantConfig): Promise<AiAssistantConfig> {
    // Try to find existing config
    const existingConfig = await this.getAiAssistantConfig(configData.userId);
    
    if (existingConfig) {
      // Update existing config
      const [config] = await db
        .update(aiAssistantConfig)
        .set({
          ...configData,
          updatedAt: new Date(),
        })
        .where(eq(aiAssistantConfig.userId, configData.userId))
        .returning();
      return config;
    } else {
      // Create new config
      const [config] = await db.insert(aiAssistantConfig).values(configData).returning();
      return config;
    }
  }

  // AI Assistant Conversations operations
  async createAiAssistantConversation(conversationData: InsertAiAssistantConversation): Promise<AiAssistantConversation> {
    const [conversation] = await db.insert(aiAssistantConversations).values(conversationData).returning();
    return conversation;
  }

  async getAiAssistantConversationsByUserId(userId: number): Promise<AiAssistantConversation[]> {
    return db
      .select()
      .from(aiAssistantConversations)
      .where(eq(aiAssistantConversations.userId, userId))
      .orderBy(aiAssistantConversations.createdAt);
  }

  // Learning Resources operations
  async getLearningResource(id: number): Promise<LearningResource | undefined> {
    const [resource] = await db.select().from(learningResources).where(eq(learningResources.id, id));
    return resource;
  }

  async getAllLearningResources(): Promise<LearningResource[]> {
    return db.select().from(learningResources);
  }

  async getLearningResourcesByStandardId(standardId: number): Promise<LearningResource[]> {
    return db.select().from(learningResources).where(eq(learningResources.standardId, standardId));
  }

  async createLearningResource(resourceData: InsertLearningResource): Promise<LearningResource> {
    const [resource] = await db.insert(learningResources).values(resourceData).returning();
    return resource;
  }

  // Provider Settings operations
  async getProviderSettings(): Promise<ProviderSettings | undefined> {
    const [settings] = await db.select().from(providerSettings).limit(1);
    return settings;
  }

  async updateProviderSettings(settingsData: InsertProviderSettings): Promise<ProviderSettings> {
    const existingSettings = await this.getProviderSettings();
    
    if (existingSettings) {
      // Update existing settings
      const [settings] = await db
        .update(providerSettings)
        .set({
          ...settingsData,
          updatedAt: new Date(),
        })
        .where(eq(providerSettings.id, existingSettings.id))
        .returning();
      return settings;
    } else {
      // Create new settings
      const [settings] = await db.insert(providerSettings).values(settingsData).returning();
      return settings;
    }
  }

  // Course Builder Templates operations
  async getCourseBuilderTemplate(id: number): Promise<CourseBuilderTemplate | undefined> {
    const [template] = await db.select().from(courseBuilderTemplates).where(eq(courseBuilderTemplates.id, id));
    return template;
  }

  async getCourseBuilderTemplatesByStandardId(standardId: number): Promise<CourseBuilderTemplate[]> {
    return db.select().from(courseBuilderTemplates).where(eq(courseBuilderTemplates.standardId, standardId));
  }

  async getCourseBuilderTemplatesByCreator(creatorId: number): Promise<CourseBuilderTemplate[]> {
    return db.select().from(courseBuilderTemplates).where(eq(courseBuilderTemplates.createdById, creatorId));
  }

  async getPublicCourseBuilderTemplates(): Promise<CourseBuilderTemplate[]> {
    return db.select().from(courseBuilderTemplates).where(eq(courseBuilderTemplates.isPublic, true));
  }

  async createCourseBuilderTemplate(templateData: InsertCourseBuilderTemplate): Promise<CourseBuilderTemplate> {
    const [template] = await db.insert(courseBuilderTemplates).values(templateData).returning();
    return template;
  }

  async updateCourseBuilderTemplate(id: number, templateData: Partial<InsertCourseBuilderTemplate>): Promise<CourseBuilderTemplate | undefined> {
    const [template] = await db
      .update(courseBuilderTemplates)
      .set({
        ...templateData,
        updatedAt: new Date(),
      })
      .where(eq(courseBuilderTemplates.id, id))
      .returning();
    return template;
  }
}