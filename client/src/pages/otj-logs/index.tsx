import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow, format, parseISO, isAfter, isBefore, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, CheckCircle2, Clock, FileCheck, Plus, Search, Sigma, User, Users2, XCircle } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// Create a schema for OTJ log entries
const otjLogEntrySchema = z.object({
  date: z.date({
    required_error: "A date is required",
  }),
  hours: z.number({
    required_error: "Number of hours is required",
  }).min(0.5, "Hours must be at least 0.5").max(24, "Hours cannot exceed 24 per day"),
  activityType: z.string({
    required_error: "Activity type is required",
  }),
  description: z.string({
    required_error: "Description is required",
  }).min(10, "Description must be at least 10 characters"),
  category: z.enum(["otj", "enrichment"], {
    required_error: "Category is required",
  }),
  ksbId: z.number().optional(),
  evidenceId: z.number().optional(),
});

// Type for the form values
type OtjLogEntryFormValues = z.infer<typeof otjLogEntrySchema>;

// Function to get status badge styling
const getStatusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return <Badge variant="outline">Draft</Badge>;
    case "submitted":
      return <Badge variant="secondary">Submitted</Badge>;
    case "approved":
      return <Badge variant="success">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Main component
export default function OtjLogs() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isReviewDue, setIsReviewDue] = useState(false);
  const [activeTab, setActiveTab] = useState("log");
  const [_, setLocation] = useLocation();

  // Setup form with react-hook-form and zod
  const form = useForm<OtjLogEntryFormValues>({
    resolver: zodResolver(otjLogEntrySchema),
    defaultValues: {
      date: new Date(),
      hours: 1,
      activityType: "",
      description: "",
      category: "otj",
    },
  });

  // Get OTJ log entries for the selected week
  const { data: otjEntries, isLoading, refetch } = useQuery({
    queryKey: ["/api/otj-logs", user?.id, format(selectedWeek, "yyyy-MM-dd")],
    queryFn: async () => {
      const start = format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), "yyyy-MM-dd");
      const end = format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), "yyyy-MM-dd");
      return apiRequest(`/api/otj-logs?learnerId=${user?.id}&startDate=${start}&endDate=${end}`);
    },
    enabled: !authLoading && !!user,
  });

  // Get all KSB elements (for selecting in the form)
  const { data: ksbElements } = useQuery({
    queryKey: ["/api/ksbs"],
    enabled: !authLoading && !!user,
  });

  // Get learner's standard to check minimum weekly hours
  const { data: learnerProfile } = useQuery({
    queryKey: ["/api/learner-profile", user?.id],
    enabled: !authLoading && !!user,
  });

  // Get standard details to determine minimum OTJ hours
  const { data: standard } = useQuery({
    queryKey: ["/api/standards", learnerProfile?.standardId],
    enabled: !authLoading && !!learnerProfile?.standardId,
  });

  // Submit OTJ log entry mutation
  const submitEntryMutation = useMutation({
    mutationFn: async (data: OtjLogEntryFormValues) => {
      return apiRequest("/api/otj-logs", {
        method: "POST",
        data: {
          ...data,
          learnerId: user?.id,
          status: "submitted",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OTJ log entry submitted successfully",
      });
      setIsAddEntryOpen(false);
      form.reset();
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit OTJ log entry",
        variant: "destructive",
      });
    },
  });

  // Verify OTJ log entry mutation
  const verifyEntryMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number, action: "approve" | "reject" }) => {
      return apiRequest(`/api/otj-logs/${id}/verify`, {
        method: "POST",
        data: {
          status: action === "approve" ? "approved" : "rejected",
          verifierId: user?.id,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "OTJ log entry verification completed",
      });
      setSelectedEntry(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to verify OTJ log entry",
        variant: "destructive",
      });
    },
  });

  // IQA verify OTJ log entry mutation
  const iqaVerifyEntryMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number, action: "approve" | "reject" }) => {
      return apiRequest(`/api/otj-logs/${id}/iqa-verify`, {
        method: "POST",
        data: {
          status: action === "approve" ? "approved" : "rejected",
          iqaVerifierId: user?.id,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "IQA verification completed",
      });
      setSelectedEntry(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete IQA verification",
        variant: "destructive",
      });
    },
  });

  // Submit form handler
  function onSubmit(data: OtjLogEntryFormValues) {
    submitEntryMutation.mutate(data);
  }

  // Calculate total hours for the week
  const totalHours = otjEntries?.reduce((total, entry) => total + entry.hours, 0) || 0;
  const minimumWeeklyHours = standard?.minimumOtjHours ? standard.minimumOtjHours / 52 : 6; // Default to 6 hours if not specified
  const hasMetWeeklyTarget = totalHours >= minimumWeeklyHours;

  // Check if 12-week review is due
  const getReviewStatus = () => {
    // This would be a more complex calculation in a real system
    // For now, let's just use a placeholder logic
    if (user && learnerProfile) {
      const startDate = parseISO(learnerProfile.startDate);
      const weeks = Math.floor((new Date().getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const isReviewWeek = weeks % 12 === 0 && weeks > 0;
      
      // Set state to control UI
      setIsReviewDue(isReviewWeek);
      
      return isReviewWeek;
    }
    return false;
  };

  // Navigate to create review page if due
  const startReview = () => {
    setLocation("/otj-logs/review");
  };

  // Check for 12-week review when component mounts or week changes
  useState(() => {
    if (learnerProfile) {
      getReviewStatus();
    }
  }, [learnerProfile, selectedWeek]);

  if (authLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Off-the-Job Training Log</h1>
          <p className="text-muted-foreground mt-1">
            Track and verify your off-the-job training hours
          </p>
        </div>
        
        {user?.role === "learner" && (
          <div className="mt-4 md:mt-0">
            <Button onClick={() => {
              form.reset({
                date: new Date(),
                hours: 1,
                activityType: "",
                description: "",
                category: "otj",
              });
              setIsAddEntryOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add OTJ Entry
            </Button>
          </div>
        )}
      </div>

      {isReviewDue && user?.role === "learner" && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 flex items-center">
              <Users2 className="mr-2 h-5 w-5" />
              12-Weekly Review Due
            </CardTitle>
            <CardDescription className="text-amber-700">
              Your 12-weekly progress review with your tutor and employer is due. This is a requirement of your apprenticeship.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="default" onClick={startReview}>
              Start 12-Week Review
            </Button>
          </CardFooter>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="log">OTJ Log</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle>Weekly Hours</CardTitle>
                  <CardDescription>
                    Select a week to view your OTJ training hours
                  </CardDescription>
                </div>
                <div className="flex mt-4 md:mt-0 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedWeek(addWeeks(selectedWeek, -1))}
                  >
                    Previous Week
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), "MMM d")} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <DatePicker
                        date={selectedWeek}
                        setDate={setSelectedWeek}
                        showWeekNumber={true}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
                  >
                    Next Week
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 p-4 bg-slate-50 rounded-md border">
                <div className="flex items-center">
                  <div className="mr-4">
                    <div className="text-4xl font-bold">{totalHours}</div>
                    <div className="text-sm text-muted-foreground">total hours</div>
                  </div>
                  <div className="mr-4 border-l pl-4">
                    <div className="text-4xl font-bold">{minimumWeeklyHours}</div>
                    <div className="text-sm text-muted-foreground">required hours</div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  {hasMetWeeklyTarget ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      <span className="font-medium">Weekly target met</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-amber-600">
                      <Clock className="mr-2 h-5 w-5" />
                      <span className="font-medium">
                        {minimumWeeklyHours - totalHours} more hours needed this week
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">Loading entries...</div>
              ) : otjEntries?.length === 0 ? (
                <div className="text-center py-8 border rounded-md bg-slate-50">
                  <p className="text-muted-foreground">No entries for this week. Click "Add OTJ Entry" to add one.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {otjEntries?.map((entry) => (
                    <Card key={entry.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        <div className="md:w-1/6 bg-slate-50 p-4 flex flex-col justify-center items-center border-r">
                          <div className="text-2xl font-bold">{entry.hours}</div>
                          <div className="text-sm text-muted-foreground">hours</div>
                          <div className="mt-2">{getStatusBadge(entry.status)}</div>
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex flex-col md:flex-row justify-between">
                            <div>
                              <h3 className="font-semibold">{entry.activityType}</h3>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(entry.date), "EEEE, MMMM d, yyyy")}
                              </p>
                            </div>
                            <div>
                              <Badge variant={entry.category === "otj" ? "default" : "secondary"}>
                                {entry.category === "otj" ? "Off-the-Job" : "Enrichment"}
                              </Badge>
                            </div>
                          </div>
                          <Separator className="my-3" />
                          <p className="text-sm">{entry.description}</p>
                          
                          {entry.ksbId && (
                            <div className="mt-3">
                              <Badge variant="outline" className="text-xs">
                                {ksbElements?.find(k => k.id === entry.ksbId)?.code || `KSB #${entry.ksbId}`}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="mt-4 flex justify-between items-center">
                            <div className="text-xs text-muted-foreground">
                              {entry.verifierId ? (
                                <span className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  Verified by: {entry.verifierName}
                                </span>
                              ) : (
                                <span>Awaiting verification</span>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="verification" className="space-y-4">
          {(user?.role === "assessor" || user?.role === "training_provider" || user?.role === "iqa") && (
            <Card>
              <CardHeader>
                <CardTitle>Entries Awaiting Verification</CardTitle>
                <CardDescription>
                  Review and verify learners' OTJ training entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* This would be populated with entries to verify */}
                <div className="text-center py-8 border rounded-md bg-slate-50">
                  <p className="text-muted-foreground">No entries awaiting verification at this time.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hours Tracking Analytics</CardTitle>
              <CardDescription>
                View your progress and analytics for OTJ training
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">Total Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">120</div>
                      <p className="text-muted-foreground text-sm">Of 360 required hours</p>
                      <div className="h-2 bg-slate-200 rounded-full mt-2">
                        <div className="h-2 bg-primary rounded-full" style={{ width: "33%" }}></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">Weekly Average</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">6.8</div>
                      <p className="text-muted-foreground text-sm">Hours per week</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <div>
                          <div className="text-xl font-bold">85%</div>
                          <p className="text-muted-foreground text-sm">Off-the-Job</p>
                        </div>
                        <div>
                          <div className="text-xl font-bold">15%</div>
                          <p className="text-muted-foreground text-sm">Enrichment</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Monthly Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end">
                      {/* Placeholder for chart - would be a real chart in the actual app */}
                      <div className="w-full flex justify-between gap-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-full bg-primary rounded-t-sm" 
                              style={{ 
                                height: `${Math.floor(Math.random() * 120) + 20}px`,
                                opacity: i < 5 ? 1 : 0.3
                              }}
                            ></div>
                            <div className="text-xs mt-2">{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry dialog */}
      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Off-the-Job Training Entry</DialogTitle>
            <DialogDescription>
              Record your off-the-job training activities. These hours count towards your minimum weekly requirement.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
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
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0.5" 
                          max="24" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="activityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Type</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lecture">Lecture/Training Session</SelectItem>
                          <SelectItem value="practical">Practical Exercise</SelectItem>
                          <SelectItem value="research">Research/Reading</SelectItem>
                          <SelectItem value="mentoring">Mentoring Session</SelectItem>
                          <SelectItem value="simulation">Simulation/Role Play</SelectItem>
                          <SelectItem value="self_study">Self-Guided Study</SelectItem>
                          <SelectItem value="assignment">Assignment Work</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="otj">Off-the-Job Training</SelectItem>
                          <SelectItem value="enrichment">Enrichment Activity</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Off-the-Job training counts towards your required weekly hours.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what you learned or accomplished during this activity"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ksbId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related KSB (Optional)</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Link to a Knowledge, Skill or Behavior" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {ksbElements?.map((ksb) => (
                            <SelectItem key={ksb.id} value={ksb.id.toString()}>
                              {ksb.code}: {ksb.description.substring(0, 40)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Linking activities to KSBs helps track your progress towards competencies.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddEntryOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitEntryMutation.isPending}>
                  {submitEntryMutation.isPending ? "Submitting..." : "Submit Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View/verify entry dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        {selectedEntry && (
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>OTJ Entry Details</DialogTitle>
              <DialogDescription>
                Review the details of this off-the-job training entry.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">{selectedEntry.activityType}</div>
                <div>{getStatusBadge(selectedEntry.status)}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div>{format(new Date(selectedEntry.date), "PPP")}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Hours</div>
                  <div>{selectedEntry.hours} hours</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div>{selectedEntry.category === "otj" ? "Off-the-Job Training" : "Enrichment Activity"}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Learner</div>
                  <div>{selectedEntry.learnerName || "Unknown"}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Description</div>
                <div className="mt-1 p-3 bg-slate-50 rounded-md border">{selectedEntry.description}</div>
              </div>
              
              {selectedEntry.ksbId && (
                <div>
                  <div className="text-sm text-muted-foreground">Related KSB</div>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {ksbElements?.find(k => k.id === selectedEntry.ksbId)?.code || `KSB #${selectedEntry.ksbId}`}
                    </Badge>
                    <div className="mt-1 text-sm">
                      {ksbElements?.find(k => k.id === selectedEntry.ksbId)?.description || ""}
                    </div>
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <div className="text-sm font-medium">Verification Status</div>
                
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md border">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    <div>
                      <div className="text-sm font-medium">Tutor/Employer Verification</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedEntry.verifierId 
                          ? `Verified by ${selectedEntry.verifierName} on ${format(new Date(selectedEntry.verificationDate), "PP")}`
                          : "Awaiting verification"}
                      </div>
                    </div>
                  </div>
                  {(user?.role === "assessor" || user?.role === "training_provider") && !selectedEntry.verifierId && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700" 
                        onClick={() => verifyEntryMutation.mutate({ id: selectedEntry.id, action: "reject" })}
                        disabled={verifyEntryMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => verifyEntryMutation.mutate({ id: selectedEntry.id, action: "approve" })}
                        disabled={verifyEntryMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-md border">
                  <div className="flex items-center">
                    <FileCheck className="h-4 w-4 mr-2" />
                    <div>
                      <div className="text-sm font-medium">IQA Verification</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedEntry.iqaVerifierId 
                          ? `Verified by ${selectedEntry.iqaVerifierName} on ${format(new Date(selectedEntry.iqaVerificationDate), "PP")}`
                          : "Awaiting IQA verification"}
                      </div>
                    </div>
                  </div>
                  {user?.role === "iqa" && !selectedEntry.iqaVerifierId && selectedEntry.verifierId && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => iqaVerifyEntryMutation.mutate({ id: selectedEntry.id, action: "reject" })}
                        disabled={iqaVerifyEntryMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => iqaVerifyEntryMutation.mutate({ id: selectedEntry.id, action: "approve" })}
                        disabled={iqaVerifyEntryMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}