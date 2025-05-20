import React, { useState, useRef, useEffect, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Send, Lightbulb, Book, Target, Zap, BarChart2, BookOpen, AlertCircle, Clock, Folder } from "lucide-react";

// Types for AI Assistant
interface AiMessage {
  id: string;
  isUserMessage: boolean;
  content: string;
  timestamp: Date;
  metadata?: {
    relatedKsbs?: number[];
    suggestedResources?: string[];
    actionItems?: string[];
    sentiment?: string;
  };
}

interface AiAssistantState {
  messages: AiMessage[];
  isLoading: boolean;
}

const AiAssistant = () => {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<AiMessage[]>([
    {
      id: "welcome",
      isUserMessage: false,
      content: "Hi there! I'm your apprenticeship AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get KSB elements for recommendations
  const { data: ksbElements } = useQuery({
    queryKey: ['/api/ksb-elements'],
    enabled: !!user,
  });
  
  // Get user's learning goals
  const { data: learningGoals } = useQuery({
    queryKey: ['/api/learning-goals', user?.id],
    enabled: !!user?.id,
  });
  
  // Get user's OTJ hours for the current week
  const { data: otjHours } = useQuery({
    queryKey: ['/api/otj-logs/weekly-hours'],
    enabled: !!user?.id,
  });
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);
  
  // Handle sending message to AI assistant
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to conversation
    const userMessage: AiMessage = {
      id: `user-${Date.now()}`,
      isUserMessage: true,
      content: input,
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Send message to AI Assistant API
      const result = await apiRequest('/api/ai-assistant/chat', {
        method: 'POST',
        data: {
          message: input,
          includeKsbs: true,
          includeOtjData: true,
          learningGoals: learningGoals
        }
      });
      
      // Add AI response to conversation
      const aiResponse: AiMessage = {
        id: `ai-${Date.now()}`,
        isUserMessage: false,
        content: result.text,
        timestamp: new Date(),
        metadata: result.metadata || {},
      };
      
      setConversation(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error sending message to AI Assistant:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get a response from the AI Assistant. Please try again.",
      });
      
      // Add error message
      setConversation(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          isUserMessage: false,
          content: "I'm sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-8rem)]">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>AI Teaching Assistant</CardTitle>
                </div>
                <Badge variant="outline" className="px-3">
                  Powered by AI
                </Badge>
              </div>
              <CardDescription>
                Ask questions about your apprenticeship, get help with assignments, or explore knowledge areas.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-0 flex flex-col h-[calc(100%-8rem)]">
              {/* Messages area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isUserMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.isUserMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert">
                          {message.content.split("\n").map((text, i) => (
                            <p key={i} className="mb-2 last:mb-0">
                              {text}
                            </p>
                          ))}
                        </div>
                        
                        {/* Display metadata if available */}
                        {!message.isUserMessage && message.metadata && (
                          <div className="mt-2 pt-2 border-t border-border/30">
                            {message.metadata.relatedKsbs && message.metadata.relatedKsbs.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Related KSBs:</p>
                                <div className="flex flex-wrap gap-1">
                                  {message.metadata.relatedKsbs.map((ksbId) => (
                                    <Badge 
                                      key={ksbId} 
                                      variant="secondary" 
                                      className="text-xs"
                                    >
                                      {ksbElements?.find((ksb) => ksb.id === ksbId)?.code || `KSB-${ksbId}`}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {message.metadata.suggestedResources && message.metadata.suggestedResources.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Suggested Resources:</p>
                                <ul className="text-xs list-disc pl-4 space-y-1">
                                  {message.metadata.suggestedResources.map((resource, idx) => (
                                    <li key={idx}>{resource}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {message.metadata.actionItems && message.metadata.actionItems.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Action Items:</p>
                                <ul className="text-xs list-disc pl-4 space-y-1">
                                  {message.metadata.actionItems.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Input area */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask me anything about your apprenticeship..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[60px] resize-none"
                  />
                  <Button
                    size="icon"
                    className="h-[60px] w-[60px]"
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Use the AI assistant to help with your learning journey, but remember to
                  verify important information.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-8rem)]">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-lg">Assistant Tools</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Tabs defaultValue="suggestions">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                  <TabsTrigger value="topics">Topics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="suggestions" className="pt-4 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Ask About
                    </h3>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setInput("Can you explain what off-the-job training means and how I should record it?")}
                      >
                        What is off-the-job training?
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setInput("How do I prepare for my upcoming 12-weekly review?")}
                      >
                        How to prepare for reviews
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setInput("What's the best way to gather evidence for my portfolio?")}
                      >
                        Gathering portfolio evidence
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <Target className="h-4 w-4 text-green-500" />
                      Learning Goals
                    </h3>
                    <div className="space-y-2">
                      {learningGoals && learningGoals.length > 0 ? (
                        learningGoals.slice(0, 3).map((goal) => (
                          <Button 
                            key={goal.id}
                            variant="outline" 
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => setInput(`Can you suggest resources to help me with my goal: ${goal.title}?`)}
                          >
                            Help with: {goal.title}
                          </Button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground px-2">
                          No learning goals found. Set some goals in your profile to get targeted suggestions.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Progress Check
                    </h3>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setInput("What KSBs am I behind on and need to focus on?")}
                      >
                        KSBs needing attention
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setInput("Am I on track with my OTJ hours for this month?")}
                      >
                        OTJ hours tracking
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="topics" className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 space-y-2"
                      onClick={() => setInput("What are the main KSBs for my apprenticeship standard?")}
                    >
                      <Book className="h-6 w-6 text-primary" />
                      <span className="text-xs text-center">Standard Requirements</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 space-y-2"
                      onClick={() => setInput("How do I create high-quality evidence for my portfolio?")}
                    >
                      <Folder className="h-6 w-6 text-amber-500" />
                      <span className="text-xs text-center">Evidence Creation</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 space-y-2"
                      onClick={() => setInput("What should I expect in my end-point assessment?")}
                    >
                      <Target className="h-6 w-6 text-green-500" />
                      <span className="text-xs text-center">End-Point Assessment</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 space-y-2"
                      onClick={() => setInput("How can I better manage my time between work and study?")}
                    >
                      <Clock className="h-6 w-6 text-blue-500" />
                      <span className="text-xs text-center">Time Management</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 space-y-2"
                      onClick={() => setInput("What additional learning resources would you recommend?")}
                    >
                      <BookOpen className="h-6 w-6 text-purple-500" />
                      <span className="text-xs text-center">Learning Resources</span>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 space-y-2"
                      onClick={() => setInput("How can I track my progress on my apprenticeship?")}
                    >
                      <BarChart2 className="h-6 w-6 text-red-500" />
                      <span className="text-xs text-center">Progress Tracking</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;