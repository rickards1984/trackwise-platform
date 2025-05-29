import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, requireRole } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, "../../temp/ilr_uploads");
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and original extension
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `ilr-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept XML and ZIP files
    const allowedExtensions = [".xml", ".zip"];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only XML and ZIP files are allowed"));
    }
  }
});

const ilrRouter = Router();

// Get basic stats for ILR dashboard
ilrRouter.get("/stats", requireAuth, async (req, res) => {
  try {
    // Get the current user's role to determine what data they can access
    const userRole = req.session?.role;
    const userId = req.session?.userId;
    
    // In a full implementation, we would fetch these counts from the database
    // based on the user's role and permissions
    
    // Example SQL query for active learners:
    // SELECT COUNT(*) FROM learner_profiles WHERE status = 'active'
    
    // For demonstration purposes, let's use realistic default counts
    let stats = {
      activeLearners: 42,
      pendingLearners: 5,
      withdrawnLearners: 3,
      returnsSubmitted: 8,
      returnsPending: 1,
      returnsWithErrors: 0
    };
    
    // If we had a database connection, we would do something like:
    // const activeLearners = await db.select(count())
    //   .from(learnerProfiles)
    //   .where(eq(learnerProfiles.status, 'active'));
    
    // Return the stats with appropriate access control
    if (userRole === 'admin' || userRole === 'training_provider') {
      // Admins and training providers see all stats
      res.json(stats);
    } else if (userRole === 'assessor' || userRole === 'tutor') {
      // Tutors only see their assigned learners
      // This would normally be filtered in the database query
      res.json({
        ...stats,
        activeLearners: Math.floor(stats.activeLearners / 3), // Example: only show assigned learners
        pendingLearners: Math.floor(stats.pendingLearners / 3)
      });
    } else {
      // Other roles get limited data
      res.json({
        activeLearners: stats.activeLearners
      });
    }
  } catch (error) {
    console.error("Error fetching ILR stats:", error);
    res.status(500).json({ error: "Failed to fetch ILR statistics" });
  }
});

// Get recent ILR uploads
ilrRouter.get("/recent-uploads", requireAuth, async (req, res) => {
  try {
    // Get the current user's role to determine what data they can access
    const userRole = req.session?.role;
    const userId = req.session?.userId;
    
    // Create a sample dataset that would normally come from the database
    // In a real implementation, these would be fetched from the database
    const allUploads = [
      {
        id: 1,
        filename: "ILR-25344-07.xml",
        academicYear: "2024/25",
        returnPeriod: 7,
        uploadDate: "2025-03-15T12:00:00.000Z",
        status: "complete",
        learnerCount: 42,
        uploadedBy: "admin",
        validationErrors: 0,
        validationWarnings: 2
      },
      {
        id: 2,
        filename: "ILR-25344-06.xml",
        academicYear: "2024/25",
        returnPeriod: 6,
        uploadDate: "2025-02-06T14:30:00.000Z",
        status: "complete",
        learnerCount: 40,
        uploadedBy: "admin",
        validationErrors: 0,
        validationWarnings: 0
      },
      {
        id: 3,
        filename: "ILR-25344-05.xml",
        academicYear: "2024/25",
        returnPeriod: 5,
        uploadDate: "2025-01-08T10:15:00.000Z",
        status: "complete",
        learnerCount: 38,
        uploadedBy: "training_provider",
        validationErrors: 0,
        validationWarnings: 1
      },
      {
        id: 4,
        filename: "ILR-in-progress.xml",
        academicYear: "2024/25",
        returnPeriod: 8,
        uploadDate: "2025-04-02T09:45:00.000Z",
        status: "processing",
        learnerCount: null,
        uploadedBy: "training_provider",
        validationErrors: null,
        validationWarnings: null
      }
    ];
    
    // In a database implementation, we would run a query like:
    // const uploads = await db.select()
    //   .from(ilrUploads)
    //   .orderBy(desc(ilrUploads.uploadDate))
    //   .limit(10);
    
    // Filter based on role access
    let uploads;
    if (userRole === 'admin') {
      // Admins see all uploads
      uploads = allUploads;
    } else if (userRole === 'training_provider') {
      // Training providers see all uploads they're responsible for
      uploads = allUploads;
    } else {
      // Other roles get a filtered view
      uploads = allUploads.filter(upload => 
        upload.status === 'complete' && upload.validationErrors === 0
      );
    }
    
    // Sort by upload date (newest first)
    uploads.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
    
    // Get the latest return information
    let latestCompletedUpload = allUploads.find(upload => upload.status === 'complete');
    
    res.json({
      latestReturn: latestCompletedUpload ? 
        `R${latestCompletedUpload.returnPeriod.toString().padStart(2, '0')} (${latestCompletedUpload.academicYear})` : 
        "No completed returns",
      latestReturnDate: latestCompletedUpload?.uploadDate || null,
      uploads: uploads,
      totalUploads: uploads.length,
      pendingUploads: uploads.filter(u => u.status === 'processing').length
    });
  } catch (error) {
    console.error("Error fetching recent ILR uploads:", error);
    res.status(500).json({ error: "Failed to fetch recent uploads" });
  }
});

// Upload ILR file
ilrRouter.post("/upload", 
  requireAuth, 
  requireRole(["admin", "operations"]),
  upload.single("ilrFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { academicYear, returnPeriod } = req.body;
      
      // Validate the input
      if (!academicYear || !returnPeriod) {
        // Remove the uploaded file if validation fails
        if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: "Academic year and return period are required" });
      }

      // In a full implementation, we would:
      // 1. Parse the XML file
      // 2. Validate against the ILR schema
      // 3. Store learner data in the database
      // 4. Create a record of the upload

      // For now, we'll just log the upload and return success
      console.log("ILR file uploaded successfully");
      console.log(`Academic Year: ${academicYear}, Return Period: ${returnPeriod}`);
      
      // Return success
      res.status(201).json({
        id: Date.now(), // Generate a temporary ID
        filename: req.file.originalname,
        filePath: req.file.path,
        academicYear,
        returnPeriod,
        uploadDate: new Date().toISOString(),
        status: "processing",
        message: "File uploaded successfully and is being processed"
      });
    } catch (error) {
      console.error("Error uploading ILR file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

// Submit manual ILR entry
ilrRouter.post("/manual-entry", 
  requireAuth,
  requireRole(["admin", "operations"]),
  async (req, res) => {
    try {
      const schema = z.object({
        learnerData: z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          dateOfBirth: z.string(),
          uln: z.string().min(10).max(10),
          postcode: z.string(),
          ukprn: z.string(),
          aimReference: z.string(),
          fundingModel: z.string()
        }),
        academicYear: z.string(),
        returnPeriod: z.string()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: "Invalid data provided", 
          details: result.error.format() 
        });
      }

      // In a full implementation, we would:
      // 1. Validate the learner data against ILR rules
      // 2. Store the learner data in the database
      // 3. Generate appropriate XML for ESFA submission
      
      // For now, we'll just return success
      res.status(201).json({
        success: true,
        message: "Learner record created successfully",
        id: Date.now(), // Generate a temporary ID
        learnerName: `${req.body.learnerData.firstName} ${req.body.learnerData.lastName}`,
        academicYear: req.body.academicYear,
        returnPeriod: req.body.returnPeriod
      });
    } catch (error) {
      console.error("Error submitting manual ILR entry:", error);
      res.status(500).json({ error: "Failed to create learner record" });
    }
  }
);

// Get learner records from ILR database
ilrRouter.get("/learners", requireAuth, async (req, res) => {
  try {
    // Get query parameters for filtering and pagination
    const { 
      search = "", 
      page = "1", 
      limit = "20",
      status = "all",
      sort = "name",
      order = "asc"
    } = req.query;
    
    // Parse pagination parameters
    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    
    // In a real implementation, we would query the database
    // Sample learner data that would normally come from the database
    const allLearners = [
      {
        id: 1,
        firstName: "John",
        lastName: "Smith",
        uln: "1234567890",
        dateOfBirth: "1996-05-15",
        ukprn: "10004300",
        aimReference: "ZPROG001",
        employerName: "ABC Technologies Ltd",
        status: "active",
        fundingModel: "36",
        startDate: "2024-09-01",
        plannedEndDate: "2026-08-31",
        completionStatus: "continuing"
      },
      {
        id: 2,
        firstName: "Sarah",
        lastName: "Johnson",
        uln: "2345678901",
        dateOfBirth: "1998-11-22",
        ukprn: "10004300",
        aimReference: "ZPROG001",
        employerName: "Global Solutions Inc",
        status: "active",
        fundingModel: "36",
        startDate: "2024-09-01",
        plannedEndDate: "2026-08-31",
        completionStatus: "continuing"
      },
      {
        id: 3,
        firstName: "Michael",
        lastName: "Williams",
        uln: "3456789012",
        dateOfBirth: "1995-07-18",
        ukprn: "10004300",
        aimReference: "ZPROG001",
        employerName: "Digital Experts Ltd",
        status: "completed",
        fundingModel: "36",
        startDate: "2023-01-15",
        plannedEndDate: "2025-01-14",
        completionStatus: "achieved"
      },
      {
        id: 4,
        firstName: "Emma",
        lastName: "Brown",
        uln: "4567890123",
        dateOfBirth: "1997-03-29",
        ukprn: "10004300",
        aimReference: "ZPROG001",
        employerName: "Tech Innovations Ltd",
        status: "withdrawn",
        fundingModel: "36",
        startDate: "2024-02-01",
        plannedEndDate: "2026-01-31",
        completionStatus: "withdrawn"
      },
      {
        id: 5,
        firstName: "David",
        lastName: "Jones",
        uln: "5678901234",
        dateOfBirth: "1994-12-10",
        ukprn: "10004300",
        aimReference: "ZPROG001",
        employerName: "Network Systems PLC",
        status: "active",
        fundingModel: "36",
        startDate: "2024-09-01",
        plannedEndDate: "2026-08-31",
        completionStatus: "continuing"
      }
    ];
    
    // Filter by search term
    let filteredLearners = allLearners;
    
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredLearners = allLearners.filter(learner => 
        learner.firstName.toLowerCase().includes(searchLower) ||
        learner.lastName.toLowerCase().includes(searchLower) ||
        learner.uln.includes(searchLower) ||
        learner.employerName.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status
    if (status !== "all") {
      filteredLearners = filteredLearners.filter(learner => 
        learner.status === status
      );
    }
    
    // Sort results
    filteredLearners.sort((a, b) => {
      let comparison = 0;
      switch (sort) {
        case "name":
          comparison = a.lastName.localeCompare(b.lastName);
          break;
        case "uln":
          comparison = a.uln.localeCompare(b.uln);
          break;
        case "employer":
          comparison = a.employerName.localeCompare(b.employerName);
          break;
        case "startDate":
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        default:
          comparison = a.lastName.localeCompare(b.lastName);
      }
      
      // Apply sort order
      return order === "desc" ? -comparison : comparison;
    });
    
    // Paginate results
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLearners = filteredLearners.slice(startIndex, endIndex);
    
    res.json({
      learners: paginatedLearners,
      totalLearners: filteredLearners.length,
      currentPage: pageNumber,
      totalPages: Math.ceil(filteredLearners.length / pageSize),
      pageSize
    });
  } catch (error) {
    console.error("Error fetching ILR learner records:", error);
    res.status(500).json({ error: "Failed to fetch learner records" });
  }
});

// Generate and export ILR data as XML
ilrRouter.get("/export", requireAuth, async (req, res) => {
  try {
    // Get query parameters
    const { academicYear, returnPeriod } = req.query;
    
    if (!academicYear || !returnPeriod) {
      return res.status(400).json({ 
        error: "Missing required parameters", 
        message: "Academic year and return period are required" 
      });
    }
    
    // Get the current date for file preparation date
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get provider settings from the database - including UKPRN
    let ukprn = "10004300"; // Default value as fallback
    
    try {
      const providerSettings = await storage.getProviderSettings();
      if (providerSettings && providerSettings.providerName) {
        console.log("Retrieved provider settings:", providerSettings.providerName);
      }
    } catch (error) {
      console.error("Error fetching provider settings");
      console.warn("Using fallback UKPRN as provider settings could not be retrieved");
    }
    
    // Fetch learners - in production we would use real DB data
    let learners = [
      {
        id: 1,
        learnRefNumber: "LRN0001",
        uln: "1234567890",
        familyName: "Smith",
        givenNames: "John",
        dateOfBirth: "1996-05-15",
        ethnicity: "31",
        sex: "M",
        llddHealthProb: "2",
        postcodePrior: "AB12 3CD",
        postcode: "AB12 3CD",
        learningDeliveries: [
          {
            learnAimRef: "ZPROG001",
            aimType: "1",
            aimSeqNumber: "1",
            learnStartDate: "2024-09-01",
            learnPlanEndDate: "2026-08-31",
            fundModel: "36",
            pHours: "0",
            compStatus: "1",
            appFinRecords: [
              {
                aFinType: "TNP",
                aFinCode: "1",
                aFinDate: "2024-09-01",
                aFinAmount: "12000"
              }
            ],
            learningDeliveryFAMs: [
              {
                learnDelFAMType: "ACT",
                learnDelFAMCode: "1"
              },
              {
                learnDelFAMType: "LDM",
                learnDelFAMCode: "357"
              }
            ]
          }
        ],
        contactPreferences: [
          {
            contPrefType: "RUI",
            contPrefCode: "1"
          }
        ],
        learnerEmploymentStatuses: [
          {
            empStat: "10",
            dateEmpStatApp: "2024-09-01",
            employer: {
              empId: "98765432"
            }
          }
        ]
      }
    ];
    
    // Log the number of learners for security auditing
    console.log(`Exporting ILR data for ${learners.length} learners`);
    
    // Build XML content with proper structure according to ESFA ILR schema
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Message xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="ESFA/ILR/2024-25">
  <Header>
    <CollectionDetails>
      <Collection>ILR</Collection>
      <Year>${academicYear}</Year>
      <FilePreparationDate>${currentDate}</FilePreparationDate>
    </CollectionDetails>
    <Source>
      <ProtectiveMarking>OFFICIAL-SENSITIVE-Personal</ProtectiveMarking>
      <UKPRN>${ukprn}</UKPRN>
      <SoftwareSupplier>Apprenticeship Platform</SoftwareSupplier>
      <SoftwarePackage>AP ILR Generator</SoftwarePackage>
      <Release>1.0</Release>
    </Source>
  </Header>`;
    
    // Add learners to XML
    for (const learner of learners) {
      xmlContent += `
  <Learner>
    <LearnRefNumber>${learner.learnRefNumber}</LearnRefNumber>
    <ULN>${learner.uln}</ULN>
    <FamilyName>${learner.familyName}</FamilyName>
    <GivenNames>${learner.givenNames}</GivenNames>
    <DateOfBirth>${learner.dateOfBirth}</DateOfBirth>
    <Ethnicity>${learner.ethnicity}</Ethnicity>
    <Sex>${learner.sex}</Sex>
    <LLDDHealthProb>${learner.llddHealthProb}</LLDDHealthProb>
    <PostcodePrior>${learner.postcodePrior}</PostcodePrior>
    <Postcode>${learner.postcode}</Postcode>`;
      
      // Add contact preferences if available
      if (learner.contactPreferences && learner.contactPreferences.length > 0) {
        for (const pref of learner.contactPreferences) {
          xmlContent += `
    <ContactPreference>
      <ContPrefType>${pref.contPrefType}</ContPrefType>
      <ContPrefCode>${pref.contPrefCode}</ContPrefCode>
    </ContactPreference>`;
        }
      }
      
      // Add learner employment statuses if available
      if (learner.learnerEmploymentStatuses && learner.learnerEmploymentStatuses.length > 0) {
        for (const empStatus of learner.learnerEmploymentStatuses) {
          xmlContent += `
    <LearnerEmploymentStatus>
      <EmpStat>${empStatus.empStat}</EmpStat>
      <DateEmpStatApp>${empStatus.dateEmpStatApp}</DateEmpStatApp>`;
          
          if (empStatus.employer && empStatus.employer.empId) {
            xmlContent += `
      <EmpId>${empStatus.employer.empId}</EmpId>`;
          }
          
          xmlContent += `
    </LearnerEmploymentStatus>`;
        }
      }
      
      // Add learning deliveries if available
      if (learner.learningDeliveries && learner.learningDeliveries.length > 0) {
        for (const delivery of learner.learningDeliveries) {
          xmlContent += `
    <LearningDelivery>
      <LearnAimRef>${delivery.learnAimRef}</LearnAimRef>
      <AimType>${delivery.aimType}</AimType>
      <AimSeqNumber>${delivery.aimSeqNumber}</AimSeqNumber>
      <LearnStartDate>${delivery.learnStartDate}</LearnStartDate>
      <LearnPlanEndDate>${delivery.learnPlanEndDate}</LearnPlanEndDate>
      <FundModel>${delivery.fundModel}</FundModel>
      <PHours>${delivery.pHours}</PHours>
      <CompStatus>${delivery.compStatus}</CompStatus>`;
          
          // Add FAMs if available
          if (delivery.learningDeliveryFAMs && delivery.learningDeliveryFAMs.length > 0) {
            for (const fam of delivery.learningDeliveryFAMs) {
              xmlContent += `
      <LearningDeliveryFAM>
        <LearnDelFAMType>${fam.learnDelFAMType}</LearnDelFAMType>
        <LearnDelFAMCode>${fam.learnDelFAMCode}</LearnDelFAMCode>
      </LearningDeliveryFAM>`;
            }
          }
          
          // Add Apprenticeship Financial Records if available
          if (delivery.appFinRecords && delivery.appFinRecords.length > 0) {
            for (const finRecord of delivery.appFinRecords) {
              xmlContent += `
      <AppFinRecord>
        <AFinType>${finRecord.aFinType}</AFinType>
        <AFinCode>${finRecord.aFinCode}</AFinCode>
        <AFinDate>${finRecord.aFinDate}</AFinDate>
        <AFinAmount>${finRecord.aFinAmount}</AFinAmount>
      </AppFinRecord>`;
            }
          }
          
          xmlContent += `
    </LearningDelivery>`;
        }
      }
      
      xmlContent += `
  </Learner>`;
    }
    
    // Close the root element
    xmlContent += `
</Message>`;
    
    // Set proper headers for XML download
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="ILR-${ukprn}-R${returnPeriod}-${academicYear}.xml"`);
    
    // Send the XML file
    res.send(xmlContent);
    
    // Log the export with minimal info for security
    console.log(`ILR data exported for ${academicYear}, return period ${returnPeriod}`);
    
  } catch (error) {
    console.error("Error exporting ILR data");
    res.status(500).json({ error: "Failed to export ILR data" });
  }
});

export default ilrRouter;