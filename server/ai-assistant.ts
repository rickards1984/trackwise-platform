import OpenAI from "openai";
import { storage } from "./storage";
import { KsbElement } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Input interface for AI assistant
interface AiAssistantInput {
  userId: number;
  message: string;
  ksbElements?: KsbElement[];
  learningGoals?: any[];
  otjHoursThisWeek?: number;
  minimumWeeklyOtjHours?: number;
}

// Response interface for AI assistant
interface AiAssistantResponse {
  text: string;
  metadata?: {
    relatedKsbs?: number[];
    suggestedResources?: string[];
    actionItems?: string[];
    sentiment?: string;
  };
}

// Handle a message from the user and generate an AI response
export async function handleUserMessage(input: AiAssistantInput): Promise<AiAssistantResponse> {
  try {
    // Sanitize user message to prevent prompt injection
    const cleanMessage = input.message.replace(/[\r\n]+/g, " ");
    
    // Get personalized system prompt based on user data
    const systemPrompt = await getPersonalizedSystemPrompt(input.userId, input.ksbElements, input.learningGoals);
    
    // Format additional context about OTJ hours
    let otjContext = "";
    if (input.otjHoursThisWeek !== undefined && input.minimumWeeklyOtjHours !== undefined) {
      otjContext = `
        The learner has logged ${input.otjHoursThisWeek} hours of off-the-job training this week.
        The minimum weekly requirement is ${input.minimumWeeklyOtjHours} hours.
        ${input.otjHoursThisWeek < input.minimumWeeklyOtjHours ? 
          "The learner is currently behind on their weekly OTJ hours requirement." : 
          "The learner is on track with their weekly OTJ hours requirement."}
      `;
    }
    
    // Create the prompt with all relevant context
    const userPrompt = `
      User Message: ${cleanMessage}
      
      ${otjContext ? `OTJ Context: ${otjContext}` : ""}
    `;
    
    // Generate a response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\nAlways respond with valid, minified JSON only — no extra explanations."
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });
    
    // Add better error handling for missing choices
    const raw = completion.choices?.[0]?.message?.content || '{}';
    console.log("AI Assistant Raw Output:", raw);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(raw);
    } catch (error) {
      console.error("Error parsing AI response:", error);
      // If parsing fails, return a basic response
      return {
        text: "I'm sorry, I encountered an error processing your request. Please try again."
      };
    }
    
    // Store the conversation in the database
    try {
      const user = await storage.getUser(input.userId);
      if (user) {
        const conversation = {
          userId: user.id,
          userMessage: cleanMessage,
          aiResponse: parsedResponse.text || parsedResponse.response || "No response generated",
          metadata: JSON.stringify({
            relatedKsbs: parsedResponse.related_ksbs || [],
            suggestedResources: parsedResponse.suggested_resources || [],
            actionItems: parsedResponse.action_items || [],
            sentiment: parsedResponse.sentiment || "neutral"
          }),
          timestamp: new Date()
        };
        
        await storage.createAiAssistantConversation(conversation);
      } else {
        console.log("Warning: Could not find user for userId:", input.userId);
      }
    } catch (dbError) {
      console.error("Error storing conversation in database:", dbError);
      // Continue even if storage fails
    }
    
    // Return the formatted response
    return {
      text: parsedResponse.text || parsedResponse.response || "I'm sorry, I couldn't generate a proper response.",
      metadata: {
        relatedKsbs: parsedResponse.related_ksbs || [],
        suggestedResources: parsedResponse.suggested_resources || [],
        actionItems: parsedResponse.action_items || [],
        sentiment: parsedResponse.sentiment || "neutral"
      }
    };
    
  } catch (error) {
    console.error("Error in AI assistant:", error);
    return {
      text: "I'm sorry, I encountered an error while processing your request. Please try again later."
    };
  }
}

/**
 * Get a personalized system prompt based on user data
 */
async function getPersonalizedSystemPrompt(userId: number, ksbElements?: KsbElement[], learningGoals?: any[]): Promise<string> {
  // Base system prompt
  let systemPrompt = `
    You are an AI teaching assistant for an apprenticeship program. Your role is to provide helpful, 
    accurate, and supportive responses to apprentices' questions about their training program.
    
    Please follow these guidelines:
    1. Be encouraging and supportive
    2. Provide specific, actionable advice
    3. Reference appropriate knowledge, skills, and behaviors (KSBs) when relevant
    4. Suggest additional learning resources when appropriate
    5. Highlight action items the learner should consider
    6. Format your response in JSON with the following structure:
       {
         "text": "Your main response text here",
         "related_ksbs": [array of KSB IDs that are relevant],
         "suggested_resources": [array of suggested resource titles or descriptions],
         "action_items": [array of specific actions the learner should take],
         "sentiment": "positive/neutral/concerned" (your assessment of how the learner is doing)
       }
  `;
  
  // Add KSB context if available
  if (ksbElements && ksbElements.length > 0) {
    systemPrompt += `\nKSB Information for this apprenticeship standard:`;
    ksbElements.forEach(ksb => {
      // Sanitize KSB description to prevent prompt injection
      const cleanDescription = ksb.description.replace(/[\r\n]+/g, " ");
      systemPrompt += `\n- KSB ID: ${ksb.id}, Code: ${ksb.code}, Type: ${ksb.type}, Description: ${cleanDescription}`;
    });
  } else {
    systemPrompt += `\nNo KSB information is available for this apprenticeship standard.`;
  }
  
  // Add learning goals context if available
  if (learningGoals && learningGoals.length > 0) {
    systemPrompt += `\nLearner's current learning goals:`;
    learningGoals.forEach((goal: any) => {
      const cleanTitle = goal.title?.replace(/[\r\n]+/g, " ") || "Untitled Goal";
      const cleanDescription = goal.description?.replace(/[\r\n]+/g, " ") || "No description";
      systemPrompt += `\n- Goal: ${cleanTitle}, Description: ${cleanDescription}, Due: ${goal.dueDate || "No due date"}`;
    });
  } else {
    systemPrompt += `\nNo learning goals have been set by this learner yet.`;
  }
  
  // Try to get user-specific information
  try {
    const user = await storage.getUser(userId);
    
    if (user) {
      systemPrompt += `\n\nUser Information:`;
      systemPrompt += `\n- Name: ${user.firstName} ${user.lastName}`;
      systemPrompt += `\n- Role: ${user.role}`;
      
      try {
        const learnerProfile = await storage.getLearnerProfileByUserId(userId);
        
        if (learnerProfile) {
          systemPrompt += `\n- Apprenticeship Standard: ${learnerProfile.standardId}`;
          systemPrompt += `\n- Start Date: ${learnerProfile.startDate}`;
          systemPrompt += `\n- End Date: ${learnerProfile.endDate}`;
          systemPrompt += `\n- Employer: ${learnerProfile.employer || "Not specified"}`;
        } else {
          systemPrompt += `\n- No learner profile found for this user.`;
        }
      } catch (profileError) {
        console.error("Error getting learner profile for AI prompt:", profileError);
        systemPrompt += `\n- Could not retrieve learner profile information.`;
      }
    } else {
      systemPrompt += `\n\nUser Information: Could not find user with ID ${userId}.`;
    }
  } catch (error) {
    console.error("Error getting user information for AI prompt:", error);
    systemPrompt += `\n\nUser Information: Error retrieving user data.`;
  }
  
  return systemPrompt;
}

/**
 * Generate learning resources recommendations based on KSBs
 */
export async function generateResourceRecommendations(userId: number, ksbIds: number[]): Promise<string[]> {
  try {
    // Validate input
    if (!userId || !ksbIds || !Array.isArray(ksbIds) || ksbIds.length === 0) {
      console.warn("Invalid input for resource recommendations:", { userId, ksbIdsProvided: !!ksbIds, ksbIdsLength: ksbIds?.length });
      return ["Please provide valid KSB IDs to get resource recommendations."];
    }
    
    // Get KSB elements
    const ksbElements: KsbElement[] = [];
    for (const ksbId of ksbIds) {
      try {
        const ksb = await storage.getKsbElement(ksbId);
        if (ksb) {
          ksbElements.push(ksb);
        }
      } catch (dbError) {
        console.error(`Error fetching KSB element with ID ${ksbId}:`, dbError);
        // Continue with other KSBs
      }
    }
    
    if (ksbElements.length === 0) {
      return ["No valid KSBs found to recommend resources for. Please check the KSB IDs and try again."];
    }
    
    // Generate the prompt with sanitized KSB descriptions
    const prompt = `
      Please recommend learning resources for the following KSBs (Knowledge, Skills, and Behaviors) from an apprenticeship standard:
      ${ksbElements.map(ksb => `- ${ksb.code}: ${ksb.description.replace(/[\r\n]+/g, " ")}`).join('\n')}
      
      Provide a list of 5-10 specific learning resources including books, online courses, websites, or tools that would help
      an apprentice develop these specific KSBs. Include both free and paid options.
      
      Format the response as a JSON object with this structure:
      {
        "resources": [
          "Resource 1 description with title and URL if available",
          "Resource 2 description with title and URL if available",
          ...
        ]
      }
      
      Always respond with valid, minified JSON only — no extra explanations.
    `;
    
    // Log user info for tracking
    try {
      const user = await storage.getUser(userId);
      console.log(`Generating resource recommendations for user: ${user?.firstName} ${user?.lastName} (ID: ${userId})`);
    } catch (userError) {
      console.warn(`Could not fetch user info for ID ${userId} when generating resources:`, userError);
    }
    
    // Generate recommendations using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    // Improved error handling for missing choices
    const raw = completion.choices?.[0]?.message?.content || '{"resources":[]}';
    console.log("AI Resource Recommendations Raw Output:", raw);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(raw);
      
      if (!parsedResponse.resources || !Array.isArray(parsedResponse.resources)) {
        console.warn("AI response missing resources array:", parsedResponse);
        return ["Error: AI response format was incorrect. Please try again."];
      }
      
      // Ensure all resources are strings
      const resources = parsedResponse.resources.map(resource => 
        typeof resource === 'string' ? resource : JSON.stringify(resource)
      );
      
      return resources.length > 0 
        ? resources 
        : ["No specific resources were found for these KSBs. Please try with different KSBs."];
    } catch (error) {
      console.error("Error parsing resource recommendations:", error);
      console.error("Raw response content:", raw);
      return ["Error generating resource recommendations. Please try again."];
    }
    
  } catch (error) {
    console.error("Error generating resource recommendations:", error);
    return ["Error generating resource recommendations. Please try again."];
  }
}

/**
 * Analyze an apprenticeship standard document and extract KSBs
 */
export async function analyzeApprenticeshipStandard(standardText: string): Promise<{
  title: string;
  level: number;
  description: string;
  knowledge: Array<{ code: string; description: string }>;
  skills: Array<{ code: string; description: string }>;
  behaviors: Array<{ code: string; description: string }>;
}> {
  try {
    // Validate input
    if (!standardText || typeof standardText !== 'string' || standardText.trim() === '') {
      throw new Error("Standard text must be provided");
    }
    
    // Trim the text to a reasonable size (OpenAI has token limits)
    const maxLength = 15000;
    const trimmedText = standardText.length > maxLength 
      ? standardText.substring(0, maxLength) + '...(content truncated due to length)'
      : standardText;
    
    // Sanitize the text to prevent prompt injection
    const cleanText = trimmedText.replace(/```|\$\{|\n\n+/g, "\n");
    
    const prompt = `
      Please analyze the following apprenticeship standard document text and extract the structured information:
      
      ${cleanText}
      
      Format your response as a JSON object with the following structure:
      {
        "title": "The title of the apprenticeship standard",
        "level": The level number (e.g., 3, 4, 5, etc.),
        "description": "A brief description of the standard",
        "knowledge": [
          { "code": "K1", "description": "Knowledge 1 description" },
          { "code": "K2", "description": "Knowledge 2 description" },
          ...
        ],
        "skills": [
          { "code": "S1", "description": "Skill 1 description" },
          { "code": "S2", "description": "Skill 2 description" },
          ...
        ],
        "behaviors": [
          { "code": "B1", "description": "Behavior 1 description" },
          { "code": "B2", "description": "Behavior 2 description" },
          ...
        ]
      }
      
      Use the exact KSB codes from the document. Extract all knowledge, skills, and behaviors listed in the standard.
      Always respond with valid, minified JSON only — no extra explanations.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    
    // Improved error handling for missing choices
    const raw = completion.choices?.[0]?.message?.content || '{}';
    console.log("AI Standard Analysis Raw Output (truncated):", 
      raw.length > 500 ? raw.substring(0, 500) + '...(truncated for logging)' : raw);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(raw);
      
      // Validate the structure of the response
      if (!parsedResponse.title || !parsedResponse.level) {
        console.warn("AI response missing key fields:", 
          JSON.stringify({ 
            has_title: !!parsedResponse.title, 
            has_level: !!parsedResponse.level,
            has_knowledge: Array.isArray(parsedResponse.knowledge),
            has_skills: Array.isArray(parsedResponse.skills),
            has_behaviors: Array.isArray(parsedResponse.behaviors)
          })
        );
      }
      
      return {
        title: parsedResponse.title || "Unknown Standard",
        level: parseInt(parsedResponse.level) || 3,
        description: parsedResponse.description || "No description available",
        knowledge: Array.isArray(parsedResponse.knowledge) ? parsedResponse.knowledge : [],
        skills: Array.isArray(parsedResponse.skills) ? parsedResponse.skills : [],
        behaviors: Array.isArray(parsedResponse.behaviors) ? parsedResponse.behaviors : []
      };
    } catch (error) {
      console.error("Error parsing standard analysis:", error);
      console.error("Raw response content:", raw.substring(0, 500) + '...(truncated)');
      throw new Error("Failed to parse the standard analysis response");
    }
    
  } catch (error) {
    console.error("Error analyzing apprenticeship standard:", error);
    throw error;
  }
}

/**
 * Generate reminder messages for learners who haven't been active
 */
export async function generateReminderMessage(userId: number, daysInactive: number): Promise<string> {
  try {
    // Get user information
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const prompt = `
      Create a personalized reminder message for a learner named ${user.firstName} who hasn't logged into the apprenticeship platform for ${daysInactive} days.
      
      The message should:
      1. Be friendly and encouraging, not critical
      2. Remind them about the importance of regular engagement with their apprenticeship
      3. Mention the need to log off-the-job training hours regularly
      4. Encourage them to reach out if they need help
      
      Keep the message under 150 words and written in a supportive tone.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    return completion.choices[0].message.content || 
      `Hi ${user.firstName}, we've noticed you haven't logged in for a while. Please check your apprenticeship platform to stay on track with your training requirements.`;
    
  } catch (error) {
    console.error("Error generating reminder message:", error);
    return "Hi there, we've noticed you haven't logged in for a while. Please check your apprenticeship platform to stay on track with your training requirements.";
  }
}