import { storage } from './storage';

/**
 * Seed the database with initial data
 */
export async function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');
    
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername('admin');
    
    if (!existingAdmin) {
      // Create admin user
      const admin = await storage.createUser({
        username: 'admin',
        password: 'admin123', // In production, use a secure password
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@skilltrack.com',
        role: 'admin',
        avatarUrl: null,
        status: 'active' // Add status to make login work
      });
      
      console.log('Admin user created:', admin.id);
    }
    
    // Create a sample apprenticeship standard if none exists
    const standards = await storage.getAllApprenticeshipStandards();
    
    if (standards.length === 0) {
      const standard = await storage.createApprenticeshipStandard({
        title: 'Software Developer',
        level: 4,
        description: 'Software developers build and test high-quality code across front end, logic and database layers.',
        minimumOtjHours: 312 // 6 hours per week for 52 weeks
      });
      
      console.log('Sample apprenticeship standard created:', standard.id);
      
      // Add some sample KSB elements
      const ksbElements = [
        {
          type: 'knowledge',
          code: 'K1',
          description: 'All stages of the software development life cycle (design, development, testing, and deployment).',
          standardId: standard.id
        },
        {
          type: 'skill',
          code: 'S1',
          description: 'Create logical and maintainable code.',
          standardId: standard.id
        },
        {
          type: 'behavior',
          code: 'B1',
          description: 'Maintains a productive, professional and secure working environment.',
          standardId: standard.id
        }
      ];
      
      for (const ksb of ksbElements) {
        await storage.createKsbElement(ksb);
      }
      
      console.log('Sample KSB elements created');
    }
    
    // Create a sample learner account if none exists
    const existingLearner = await storage.getUserByUsername('learner');
    
    if (!existingLearner) {
      const learner = await storage.createUser({
        username: 'learner',
        password: 'learner123', // In production, use a secure password
        firstName: 'Sample',
        lastName: 'Learner',
        email: 'learner@example.com',
        role: 'learner',
        avatarUrl: null,
        status: 'active' // Add status to make login work
      });
      
      console.log('Sample learner created:', learner.id);
      
      // Create a sample learner profile
      const standard = standards.length > 0 ? standards[0] : await storage.getAllApprenticeshipStandards();
      
      if (standard) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 2); // 2 year apprenticeship
        
        const profile = await storage.createLearnerProfile({
          userId: learner.id,
          standardId: standard.id,
          startDate,
          expectedEndDate: endDate,
          tutorId: null,
          iqaId: null,
          trainingProviderId: null,
          accessibilityPreferences: null
        });
        
        console.log('Sample learner profile created:', profile.id);
      }
    }
    
    // Create a sample tutor account if none exists
    const existingTutor = await storage.getUserByUsername('tutor');
    
    if (!existingTutor) {
      const tutor = await storage.createUser({
        username: 'tutor',
        password: 'tutor123', // In production, use a secure password
        firstName: 'Sample',
        lastName: 'Tutor',
        email: 'tutor@example.com',
        role: 'assessor',
        avatarUrl: null
      });
      
      console.log('Sample tutor created:', tutor.id);
    }
    
    // Create a sample IQA account if none exists
    const existingIQA = await storage.getUserByUsername('iqa');
    
    if (!existingIQA) {
      const iqa = await storage.createUser({
        username: 'iqa',
        password: 'iqa123', // In production, use a secure password
        firstName: 'Sample',
        lastName: 'IQA',
        email: 'iqa@example.com',
        role: 'iqa',
        avatarUrl: null
      });
      
      console.log('Sample IQA created:', iqa.id);
    }
    
    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}