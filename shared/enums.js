/**
 * User role enum for type-safe role checking
 */
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["TRAINING_PROVIDER"] = "training_provider";
    UserRole["ASSESSOR"] = "assessor";
    UserRole["IQA"] = "iqa";
    UserRole["LEARNER"] = "learner";
    UserRole["OPERATIONS"] = "operations";
})(UserRole || (UserRole = {}));
/**
 * User status enum for type-safe status checking
 */
export var UserStatus;
(function (UserStatus) {
    UserStatus["UNVERIFIED"] = "unverified";
    UserStatus["PENDING_APPROVAL"] = "pending_approval";
    UserStatus["ACTIVE"] = "active";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["DEACTIVATED"] = "deactivated";
})(UserStatus || (UserStatus = {}));
/**
 * Evidence status enum for type-safe status checking
 */
export var EvidenceStatus;
(function (EvidenceStatus) {
    EvidenceStatus["DRAFT"] = "draft";
    EvidenceStatus["SUBMITTED"] = "submitted";
    EvidenceStatus["IN_REVIEW"] = "in_review";
    EvidenceStatus["APPROVED"] = "approved";
    EvidenceStatus["NEEDS_REVISION"] = "needs_revision";
})(EvidenceStatus || (EvidenceStatus = {}));
/**
 * OTJ log status enum for type-safe status checking
 */
export var OtjLogStatus;
(function (OtjLogStatus) {
    OtjLogStatus["DRAFT"] = "draft";
    OtjLogStatus["SUBMITTED"] = "submitted";
    OtjLogStatus["APPROVED"] = "approved";
    OtjLogStatus["REJECTED"] = "rejected";
})(OtjLogStatus || (OtjLogStatus = {}));
/**
 * ILR upload status enum for type-safe status checking
 */
export var IlrUploadStatus;
(function (IlrUploadStatus) {
    IlrUploadStatus["PENDING"] = "pending";
    IlrUploadStatus["VALIDATING"] = "validating";
    IlrUploadStatus["PROCESSING"] = "processing";
    IlrUploadStatus["COMPLETE"] = "complete";
    IlrUploadStatus["ERROR"] = "error";
})(IlrUploadStatus || (IlrUploadStatus = {}));
/**
 * OTJ category enum for type-safe category checking
 */
export var OtjCategory;
(function (OtjCategory) {
    OtjCategory["OTJ"] = "otj";
    OtjCategory["ENRICHMENT"] = "enrichment";
})(OtjCategory || (OtjCategory = {}));
/**
 * Weekly tracking status enum for type-safe status checking
 */
export var WeeklyTrackingStatus;
(function (WeeklyTrackingStatus) {
    WeeklyTrackingStatus["PENDING"] = "pending";
    WeeklyTrackingStatus["COMPLETE"] = "complete";
    WeeklyTrackingStatus["INCOMPLETE"] = "incomplete";
})(WeeklyTrackingStatus || (WeeklyTrackingStatus = {}));
/**
 * Evidence type enum for type-safe type checking
 */
export var EvidenceType;
(function (EvidenceType) {
    EvidenceType["DOCUMENT"] = "document";
    EvidenceType["PROJECT"] = "project";
    EvidenceType["IMAGE"] = "image";
    EvidenceType["VIDEO"] = "video";
    EvidenceType["PRESENTATION"] = "presentation";
    EvidenceType["OTHER"] = "other";
})(EvidenceType || (EvidenceType = {}));
/**
 * Review status enum for type-safe status checking
 */
export var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["SCHEDULED"] = "scheduled";
    ReviewStatus["COMPLETED"] = "completed";
    ReviewStatus["CANCELLED"] = "cancelled";
    ReviewStatus["RESCHEDULED"] = "rescheduled";
})(ReviewStatus || (ReviewStatus = {}));
