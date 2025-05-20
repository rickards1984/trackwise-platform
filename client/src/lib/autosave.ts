// Utility for handling auto-saving and restoring drafts in the course builder

/**
 * Save course builder draft to local storage
 */
export const saveDraft = (data: any, userId: string | number): void => {
  try {
    const key = `course_builder_draft_${userId}`;
    const draft = {
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error("Error saving draft:", error);
  }
};

/**
 * Load course builder draft from local storage
 */
export const loadDraft = (userId: string | number): { data: any; timestamp: string } | null => {
  try {
    const key = `course_builder_draft_${userId}`;
    const draftJson = localStorage.getItem(key);
    
    if (!draftJson) return null;
    
    const draft = JSON.parse(draftJson);
    return draft;
  } catch (error) {
    console.error("Error loading draft:", error);
    return null;
  }
};

/**
 * Clear course builder draft from local storage
 */
export const clearDraft = (userId: string | number): void => {
  try {
    const key = `course_builder_draft_${userId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing draft:", error);
  }
};

/**
 * Format a timestamp for display
 */
export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    
    // Format date: May 16, 2023 at 2:30 PM
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return "Unknown date";
  }
};