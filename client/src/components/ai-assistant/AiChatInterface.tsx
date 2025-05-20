import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  BrainCircuit, 
  Send, 
  User, 
  Clock, 
  Book, 
  FileCheck 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    relatedKsbs?: number[];
    suggestedResources?: string[];
    actionItems?: string[];
    sentiment?: string;
  };
}

export function AiChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi there! I'm your AI teaching assistant. I can help you with:
        
• Understanding your apprenticeship standard and KSBs
• Finding relevant learning resources
• Answering questions about your coursework
• Setting and tracking learning goals
• Providing feedback on your progress

What can I help you with today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/ai-assistant/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId: user?.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
        metadata: data.metadata,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setInputValue('');
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again later.',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Send to API
    sendMessageMutation.mutate(inputValue);
  };

  // Handle Enter key for submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <CardTitle>AI Teaching Assistant</CardTitle>
          </div>
          <CardDescription>
            Ask questions about your apprenticeship, get help with KSBs, or discuss your learning goals.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-y-auto pb-0">
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div className={`flex gap-3 max-w-[80%] ${
                  message.role === "assistant" ? "" : "flex-row-reverse"
                }`}>
                  <Avatar className="h-8 w-8">
                    {message.role === "assistant" ? (
                      <>
                        <AvatarImage src="/images/ai-assistant.png" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <BrainCircuit className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src={user?.avatarUrl || ""} />
                        <AvatarFallback className="bg-muted">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${
                      message.role === "assistant" 
                        ? "bg-muted" 
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                    
                    {message.metadata && (
                      <div className="space-y-2 pl-1">
                        {message.metadata.relatedKsbs && message.metadata.relatedKsbs.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Related KSBs:</span>
                            {message.metadata.relatedKsbs.map((ksb) => (
                              <Badge key={ksb} variant="outline" className="text-xs">
                                {ksb}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {message.metadata.suggestedResources && message.metadata.suggestedResources.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Book className="h-3 w-3" /> Resources:
                            </span>
                            {message.metadata.suggestedResources.map((resource, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {resource}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {message.metadata.actionItems && message.metadata.actionItems.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileCheck className="h-3 w-3" /> Actions:
                            </span>
                            {message.metadata.actionItems.map((action, i) => (
                              <Badge key={i} variant="default" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Intl.DateTimeFormat('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }).format(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
        
        <CardFooter className="pt-4">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                placeholder="Ask your AI teaching assistant a question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] flex-grow"
                disabled={sendMessageMutation.isPending}
              />
              <Button 
                type="submit" 
                className="self-end" 
                disabled={sendMessageMutation.isPending || !inputValue.trim()}
              >
                {sendMessageMutation.isPending ? (
                  <div className="h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}