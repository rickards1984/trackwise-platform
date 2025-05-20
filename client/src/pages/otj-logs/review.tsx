import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Save, SendHorizonal, Users } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// Create a schema for 12-weekly review
const reviewSchema = z.object({
  date: z.date({
    required_error: "Review date is required",
  }),
  attendees: z.string().min(5, "Please list all attendees"),
  progressSummary: z.string().min(10, "Progress summary is required"),
  ksbProgress: z.array(z.object({
    ksbId: z.number(),
    progress: z.enum(["not_started", "in_progress", "completed"]),
    evidence: z.string().optional(),
  })).optional(),
  targetsMet: z.boolean(),
  previousTargets: z.string().optional(),
  newTargets: z.string().min(10, "New targets are required for the next 12 weeks"),
  
  // Wider skills
  preventUnderstanding: z.enum(["poor", "developing", "good", "excellent"]),
  safeguardingUnderstanding: z.enum(["poor", "developing", "good", "excellent"]),
  britishValuesUnderstanding: z.enum(["poor", "developing", "good", "excellent"]),
  widerSkillsComments: z.string().optional(),
  
  // Functional skills
  functionalSkillsRequired: z.boolean(),
  mathsProgress: z.enum(["not_started", "in_progress", "ready_for_test", "passed", "n/a"]).optional(),
  englishProgress: z.enum(["not_started", "in_progress", "ready_for_test", "passed", "n/a"]).optional(),
  functionalSkillsComments: z.string().optional(),
  
  // General feedback
  learnerFeedback: z.string().min(5, "Learner feedback is required"),
  employerFeedback: z.string().min(5, "Employer feedback is required"),
  tutorFeedback: z.string().min(5, "Tutor feedback is required"),
  
  // Action plan
  actionPlan: z.string().min(10, "An action plan is required"),
  
  // Signatures (in a real system these might be handled differently)
  learnerSignatureDate: z.date().optional(),
  employerSignatureDate: z.date().optional(),
  tutorSignatureDate: z.date().optional(),
});

// Type for the form values
type ReviewFormValues = z.infer<typeof reviewSchema>;

// Progress status component
const ProgressStatus = ({ status }: { status: string }) => {
  switch (status) {
    case "not_started":
      return <span className="text-red-600 text-sm font-medium">Not Started</span>;
    case "in_progress":
      return <span className="text-amber-600 text-sm font-medium">In Progress</span>;
    case "ready_for_test":
      return <span className="text-blue-600 text-sm font-medium">Ready for Test</span>;
    case "completed":
    case "passed":
      return <span className="text-green-600 text-sm font-medium">Completed</span>;
    default:
      return <span className="text-gray-600 text-sm font-medium">N/A</span>;
  }
};

// Main component
export default function TwelveWeekReview() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("progress");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, setLocation] = useLocation();

  // Setup form with react-hook-form and zod
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      date: new Date(),
      attendees: "",
      progressSummary: "",
      targetsMet: false,
      previousTargets: "",
      newTargets: "",
      preventUnderstanding: "developing",
      safeguardingUnderstanding: "developing",
      britishValuesUnderstanding: "developing",
      widerSkillsComments: "",
      functionalSkillsRequired: false,
      mathsProgress: "n/a",
      englishProgress: "n/a",
      functionalSkillsComments: "",
      learnerFeedback: "",
      employerFeedback: "",
      tutorFeedback: "",
      actionPlan: "",
    },
  });

  // Get learner profile
  const { data: learnerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/learner-profile", user?.id],
    enabled: !authLoading && !!user,
  });

  // Get KSB elements for the learner's standard
  const { data: ksbElements, isLoading: ksbLoading } = useQuery({
    queryKey: ["/api/ksbs", learnerProfile?.standardId],
    enabled: !authLoading && !!learnerProfile?.standardId,
  });

  // Get previous reviews
  const { data: previousReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["/api/reviews", user?.id],
    enabled: !authLoading && !!user,
  });

  // Get OTJ log entries for the past 12 weeks
  const { data: recentOtjEntries, isLoading: otjLoading } = useQuery({
    queryKey: ["/api/otj-logs/recent", user?.id],
    enabled: !authLoading && !!user,
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      return apiRequest("/api/v2/reviews", {
        method: "POST",
        data: {
          ...data,
          learnerId: user?.id,
          standardId: learnerProfile?.standardId,
          reviewType: "twelve_week",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "12-week review submitted successfully",
      });
      setLocation("/otj-logs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit 12-week review",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      return apiRequest("/api/v2/reviews/draft", {
        method: "POST",
        data: {
          ...data,
          learnerId: user?.id,
          standardId: learnerProfile?.standardId,
          reviewType: "twelve_week",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Draft Saved",
        description: "Your review has been saved as a draft",
      });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Submit form handler
  function onSubmit(data: ReviewFormValues) {
    setIsSubmitting(true);
    submitReviewMutation.mutate(data);
  }

  // Save draft handler
  function saveDraft() {
    setIsSubmitting(true);
    const data = form.getValues();
    saveDraftMutation.mutate(data);
  }

  // Calculate KSB progress percentages
  const calculateKsbProgress = () => {
    if (!ksbElements) return { knowledge: 0, skills: 0, behaviors: 0 };
    
    const knowledge = ksbElements.filter(k => k.type === 'knowledge');
    const skills = ksbElements.filter(k => k.type === 'skill');
    const behaviors = ksbElements.filter(k => k.type === 'behavior');
    
    // This is simplified - in a real app, you'd have actual progress data
    const knowledgeProgress = knowledge.length ? 
      Math.round((knowledge.filter(k => Math.random() > 0.3).length / knowledge.length) * 100) : 0;
    
    const skillsProgress = skills.length ? 
      Math.round((skills.filter(k => Math.random() > 0.4).length / skills.length) * 100) : 0;
    
    const behaviorsProgress = behaviors.length ? 
      Math.round((behaviors.filter(k => Math.random() > 0.5).length / behaviors.length) * 100) : 0;
    
    return {
      knowledge: knowledgeProgress,
      skills: skillsProgress,
      behaviors: behaviorsProgress
    };
  };

  const ksbProgress = calculateKsbProgress();

  if (authLoading || profileLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Find the most recent review
  const mostRecentReview = previousReviews?.length > 0 ? 
    previousReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : 
    null;

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/otj-logs")}
          className="mr-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to OTJ Logs
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">12-Week Review</h1>
          <p className="text-muted-foreground mt-1">
            Progress review between apprentice, employer and tutor/assessor
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Review Information</CardTitle>
          <CardDescription>
            This review tracks your progress over the past 12 weeks and sets targets for the next period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-1">Apprentice</h3>
              <p className="text-sm">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Standard</h3>
              <p className="text-sm">
                {learnerProfile?.standardName || "Loading..."}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Review Number</h3>
              <p className="text-sm">
                {previousReviews?.length ? previousReviews.length + 1 : 1}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Overall KSB Progress</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Knowledge</span>
                  <span className="text-sm font-medium">{ksbProgress.knowledge}%</span>
                </div>
                <Progress value={ksbProgress.knowledge} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Skills</span>
                  <span className="text-sm font-medium">{ksbProgress.skills}%</span>
                </div>
                <Progress value={ksbProgress.skills} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Behaviors</span>
                  <span className="text-sm font-medium">{ksbProgress.behaviors}%</span>
                </div>
                <Progress value={ksbProgress.behaviors} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {mostRecentReview && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-800">Previous Review Summary</CardTitle>
            <CardDescription className="text-blue-700">
              Targets set on {format(new Date(mostRecentReview.date), "PP")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800">{mostRecentReview.newTargets}</p>
            {mostRecentReview.actionPlan && (
              <>
                <h4 className="text-sm font-medium text-blue-800 mt-3">Action Plan</h4>
                <p className="text-sm text-blue-800">{mostRecentReview.actionPlan}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="wider-skills">Wider Skills</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="action-plan">Action Plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="progress" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Progress Review</CardTitle>
                  <CardDescription>
                    Evaluate progress made over the past 12 weeks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Review Date</FormLabel>
                          <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="attendees"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Attendees</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="List all meeting attendees"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Include apprentice, employer and tutor names
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="progressSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Progress Summary</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Summarize the apprentice's progress over the past 12 weeks"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">KSB Progress</h3>
                    <div className="border rounded-md p-3 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Review progress against the Knowledge, Skills, and Behaviors required for the standard.
                      </p>
                      {ksbLoading ? (
                        <div className="py-4 text-center">Loading KSBs...</div>
                      ) : ksbElements?.length === 0 ? (
                        <div className="py-4 text-center">No KSBs found for this standard</div>
                      ) : (
                        <div className="space-y-3">
                          {ksbElements?.slice(0, 3).map((ksb) => (
                            <div key={ksb.id} className="border-b pb-2">
                              <div className="flex justify-between">
                                <div>
                                  <span className="text-sm font-medium">{ksb.code}: </span>
                                  <span className="text-sm">{ksb.description.substring(0, 60)}...</span>
                                </div>
                                <div>
                                  <ProgressStatus status={Math.random() > 0.5 ? "in_progress" : "not_started"} />
                                </div>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-center text-muted-foreground">
                            {ksbElements?.length > 3 ? `+ ${ksbElements.length - 3} more KSBs not shown` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <FormField
                      control={form.control}
                      name="targetsMet"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Previous targets met
                            </FormLabel>
                            <FormDescription>
                              Indicate if targets from the previous review have been met
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {mostRecentReview && (
                    <FormField
                      control={form.control}
                      name="previousTargets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Previous Targets</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter previous targets and indicate progress"
                              className="min-h-[80px]"
                              {...field}
                              value={field.value || mostRecentReview.newTargets}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="newTargets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Targets</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Set targets for the next 12 weeks"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          These should be SMART targets (Specific, Measurable, Achievable, Relevant, Time-bound)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="wider-skills" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Wider Skills Development</CardTitle>
                  <CardDescription>
                    Assess the apprentice's understanding of wider skills and requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="preventUnderstanding"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>PREVENT Understanding</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="poor" id="prevent-poor" />
                              <Label htmlFor="prevent-poor">Poor</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="developing" id="prevent-developing" />
                              <Label htmlFor="prevent-developing">Developing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="good" id="prevent-good" />
                              <Label htmlFor="prevent-good">Good</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="excellent" id="prevent-excellent" />
                              <Label htmlFor="prevent-excellent">Excellent</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Understanding of extremism, radicalization, and the PREVENT strategy
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="safeguardingUnderstanding"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Safeguarding Understanding</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="poor" id="safeguarding-poor" />
                              <Label htmlFor="safeguarding-poor">Poor</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="developing" id="safeguarding-developing" />
                              <Label htmlFor="safeguarding-developing">Developing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="good" id="safeguarding-good" />
                              <Label htmlFor="safeguarding-good">Good</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="excellent" id="safeguarding-excellent" />
                              <Label htmlFor="safeguarding-excellent">Excellent</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Understanding of safeguarding principles and procedures
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="britishValuesUnderstanding"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>British Values Understanding</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="poor" id="bv-poor" />
                              <Label htmlFor="bv-poor">Poor</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="developing" id="bv-developing" />
                              <Label htmlFor="bv-developing">Developing</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="good" id="bv-good" />
                              <Label htmlFor="bv-good">Good</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="excellent" id="bv-excellent" />
                              <Label htmlFor="bv-excellent">Excellent</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Understanding of democracy, rule of law, individual liberty, and mutual respect
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="widerSkillsComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional comments about wider skills development"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Functional Skills</h3>
                    
                    <FormField
                      control={form.control}
                      name="functionalSkillsRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Functional skills required
                            </FormLabel>
                            <FormDescription>
                              Does this apprenticeship require functional skills qualifications?
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("functionalSkillsRequired") && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="mathsProgress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maths Progress</FormLabel>
                                <FormControl>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={field.value}
                                    onChange={field.onChange}
                                  >
                                    <option value="not_started">Not Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="ready_for_test">Ready for Test</option>
                                    <option value="passed">Passed</option>
                                    <option value="n/a">N/A</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="englishProgress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>English Progress</FormLabel>
                                <FormControl>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={field.value}
                                    onChange={field.onChange}
                                  >
                                    <option value="not_started">Not Started</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="ready_for_test">Ready for Test</option>
                                    <option value="passed">Passed</option>
                                    <option value="n/a">N/A</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="functionalSkillsComments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Functional Skills Comments</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Additional comments about functional skills progress"
                                  className="min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="feedback" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                  <CardDescription>
                    Record feedback from all parties involved in the review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="learnerFeedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apprentice Feedback</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Apprentice's feedback about their learning experience"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          How does the apprentice feel about their progress and support?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="employerFeedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employer Feedback</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Employer's feedback about the apprentice's performance"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Employer's assessment of workplace performance and development
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tutorFeedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tutor/Assessor Feedback</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tutor's feedback about academic progress and evidence"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Assessment of off-the-job training progress and evidence quality
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="action-plan" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Action Plan and Signatures</CardTitle>
                  <CardDescription>
                    Create an action plan and collect signatures to complete the review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="actionPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action Plan</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed action plan for the next 12 weeks"
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include specific actions for the apprentice, employer, and training provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Signatures</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-md p-4">
                        <p className="text-sm font-medium mb-2">Apprentice Signature</p>
                        <div className="h-16 bg-slate-100 rounded-md flex items-center justify-center mb-2">
                          <span className="text-sm text-muted-foreground">Electronic signature</span>
                        </div>
                        <FormField
                          control={form.control}
                          name="learnerSignatureDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Date</FormLabel>
                              <DatePicker
                                date={field.value || new Date()}
                                setDate={field.onChange}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <p className="text-sm font-medium mb-2">Employer Signature</p>
                        <div className="h-16 bg-slate-100 rounded-md flex items-center justify-center mb-2">
                          <span className="text-sm text-muted-foreground">Electronic signature</span>
                        </div>
                        <FormField
                          control={form.control}
                          name="employerSignatureDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Date</FormLabel>
                              <DatePicker
                                date={field.value || new Date()}
                                setDate={field.onChange}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="border rounded-md p-4">
                        <p className="text-sm font-medium mb-2">Tutor Signature</p>
                        <div className="h-16 bg-slate-100 rounded-md flex items-center justify-center mb-2">
                          <span className="text-sm text-muted-foreground">Electronic signature</span>
                        </div>
                        <FormField
                          control={form.control}
                          name="tutorSignatureDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Date</FormLabel>
                              <DatePicker
                                date={field.value || new Date()}
                                setDate={field.onChange}
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <div className="space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLocation("/otj-logs")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
                <SendHorizonal className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}