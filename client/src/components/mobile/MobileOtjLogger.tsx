import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Camera, Clock, FileUp, Send, X, Check, AlertCircle, CheckCircle2, ClockIcon, BadgeCheck } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// Create a schema for quick OTJ log entries on mobile
const quickOtjLogEntrySchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  hours: z.number({
    required_error: "Hours are required",
  }).min(0.5, "Hours must be at least 0.5").max(24, "Maximum 24 hours per day"),
  activityType: z.string({
    required_error: "Activity type is required",
  }),
  description: z.string({
    required_error: "Description is required",
  }).min(10, "Description must be at least 10 characters"),
  category: z.enum(["otj", "progress_review", "english", "maths"]),
  ksbIds: z.array(z.number()).optional(),
});

type QuickOtjLogEntryFormValues = z.infer<typeof quickOtjLogEntrySchema>;

export function MobileOtjLogger() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [selectedKsbs, setSelectedKsbs] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("add-log");

  // Setup form with react-hook-form and zod
  const form = useForm<QuickOtjLogEntryFormValues>({
    resolver: zodResolver(quickOtjLogEntrySchema),
    defaultValues: {
      date: new Date(),
      hours: 1,
      activityType: "",
      description: "",
      category: "otj",
      ksbIds: [],
    },
  });

  // Get standard minimum OTJ hours
  const { data: learnerProfile } = useQuery({
    queryKey: ["/api/learner-profile", user?.id],
    enabled: !!user,
  });

  const { data: standard } = useQuery({
    queryKey: ["/api/standards", learnerProfile?.standardId],
    enabled: !!learnerProfile?.standardId,
  });

  // Get OTJ log entries for the current week
  const { data: otjEntries, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ["/api/otj-logs", user?.id, format(new Date(), "yyyy-MM-dd")],
    queryFn: async () => {
      const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      return apiRequest(`/api/otj-logs?learnerId=${user?.id}&startDate=${start}&endDate=${end}`);
    },
    enabled: !!user,
  });

  // Get KSB elements for mapping
  const { data: ksbElements } = useQuery({
    queryKey: ["/api/ksbs"],
    enabled: !!user,
  });

  // Toggle KSB selection
  const toggleKsb = (ksbId: number) => {
    if (selectedKsbs.includes(ksbId)) {
      setSelectedKsbs(selectedKsbs.filter(id => id !== ksbId));
    } else {
      setSelectedKsbs([...selectedKsbs, ksbId]);
    }
  };

  // Submit OTJ log entry mutation
  const submitEntryMutation = useMutation({
    mutationFn: async (data: QuickOtjLogEntryFormValues) => {
      return apiRequest("/api/otj-logs", {
        method: "POST",
        data: {
          ...data,
          learnerId: user?.id,
          imageData: image, // Include captured image if any
          ksbIds: selectedKsbs, // Include selected KSBs
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "OTJ log submitted",
        description: "Your log entry has been recorded",
      });
      
      // Reset form
      form.reset({
        date: new Date(),
        hours: 1,
        activityType: "",
        description: "",
        category: "otj",
      });
      
      // Reset image and KSBs
      setImage(null);
      setSelectedKsbs([]);
      setShowCamera(false);
      
      // Refresh data and switch to view tab
      refetchEntries();
      setActiveTab("view-logs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit OTJ log",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: QuickOtjLogEntryFormValues) => {
    setIsSubmitting(true);
    submitEntryMutation.mutate({
      ...data,
      ksbIds: selectedKsbs,
    });
  };

  // Mock function for camera capture (in a real app, would use device camera API)
  const captureImage = () => {
    // In a real implementation, this would access the device camera
    // For now, we'll simulate with a dummy base64 image
    setImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
    setShowCamera(false);
    
    toast({
      title: "Image captured",
      description: "Evidence image attached to log entry",
    });
  };

  // Calculate weekly progress
  const calculateWeeklyProgress = () => {
    if (!otjEntries || !standard) return { hours: 0, percentage: 0 };
    
    const weeklyHours = otjEntries.reduce((total, entry) => {
      if (entry.category === "otj") {
        return total + entry.hours;
      }
      return total;
    }, 0);
    
    const targetHours = standard.minimumOtjHours || 6;
    const percentage = Math.min(100, Math.round((weeklyHours / targetHours) * 100));
    
    return { hours: weeklyHours, percentage, target: targetHours };
  };

  const weeklyProgress = calculateWeeklyProgress();

  return (
    <div className="p-2 max-w-md mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-2">
          <TabsTrigger value="add-log" className="text-sm">
            <Clock className="w-4 h-4 mr-1" /> Log Activity
          </TabsTrigger>
          <TabsTrigger value="view-logs" className="text-sm">
            <BadgeCheck className="w-4 h-4 mr-1" /> View Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-log" className="mt-0 p-0">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle className="text-lg flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Log OTJ Hours
              </CardTitle>
            </CardHeader>
            
            {/* Weekly progress */}
            <div className="px-4 py-2 bg-gray-50 border-b">
              <div className="flex justify-between text-xs mb-1">
                <span>Weekly OTJ Progress</span>
                <span className="font-semibold">{weeklyProgress.hours} / {weeklyProgress.target} hrs</span>
              </div>
              <Progress value={weeklyProgress.percentage} className="h-2" />
            </div>
            
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
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
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
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
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="otj">OTJ Training</SelectItem>
                              <SelectItem value="progress_review">Progress Review</SelectItem>
                              <SelectItem value="english">English</SelectItem>
                              <SelectItem value="maths">Maths</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="classroom_training">Classroom Training</SelectItem>
                            <SelectItem value="online_course">Online Course</SelectItem>
                            <SelectItem value="shadowing">Shadowing</SelectItem>
                            <SelectItem value="mentoring">Mentoring</SelectItem>
                            <SelectItem value="practical_exercise">Practical Exercise</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="self_study">Self Study</SelectItem>
                            <SelectItem value="work_project">Work Project</SelectItem>
                          </SelectContent>
                        </Select>
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
                            placeholder="Describe what you learned or did"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* KSB selection */}
                  <div className="border rounded-md p-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm font-medium">Select KSBs</FormLabel>
                      <Badge variant="outline" className="text-xs">
                        {selectedKsbs.length} selected
                      </Badge>
                    </div>
                    
                    <div className="max-h-[120px] overflow-y-auto text-xs space-y-1 mt-1">
                      {ksbElements?.length > 0 ? (
                        ksbElements.map((ksb: any) => (
                          <div 
                            key={ksb.id}
                            className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                              selectedKsbs.includes(ksb.id) 
                                ? 'bg-primary/10 border-primary/20 border' 
                                : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                            }`}
                            onClick={() => toggleKsb(ksb.id)}
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 ${
                              selectedKsbs.includes(ksb.id) ? 'bg-primary text-white' : 'bg-gray-200'
                            }`}>
                              {selectedKsbs.includes(ksb.id) && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{ksb.title}</div>
                              <div className="text-xs opacity-70">{ksb.type}: {ksb.reference}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-center text-gray-500">Loading KSBs...</div>
                      )}
                    </div>
                  </div>

                  {/* Image evidence section */}
                  <div className="border rounded-md p-2 bg-primary/5">
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-sm font-medium">Evidence Image</FormLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCamera(!showCamera)}
                        className="h-7 text-xs"
                      >
                        {image ? <X className="h-3 w-3 mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                        {image ? 'Remove' : 'Capture'}
                      </Button>
                    </div>
                    
                    {showCamera && (
                      <div className="mt-2 bg-black p-3 rounded-md text-white">
                        <div className="aspect-video bg-gray-800 flex items-center justify-center mb-2">
                          <Camera className="h-8 w-8 opacity-50" />
                        </div>
                        <Button 
                          type="button" 
                          className="w-full text-xs"
                          onClick={captureImage}
                        >
                          Take Photo
                        </Button>
                      </div>
                    )}
                    
                    {image && (
                      <div className="mt-2 border rounded-md overflow-hidden">
                        <div className="bg-gray-100 p-1 text-xs text-gray-600 font-medium">
                          Evidence image attached
                        </div>
                        <div className="p-2">
                          <div className="aspect-video bg-gray-100 flex items-center justify-center">
                            <FileUp className="h-6 w-6 opacity-30" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit OTJ Log
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="border-t bg-primary/5 text-xs text-muted-foreground py-2 px-4">
              <p>Evidence will be verified by your tutor and employer</p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="view-logs" className="mt-0 p-0">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5 py-3">
              <CardTitle className="text-lg flex items-center">
                <BadgeCheck className="w-4 h-4 mr-2" />
                OTJ Log Status
              </CardTitle>
            </CardHeader>
            
            {/* Weekly progress */}
            <div className="px-4 py-2 bg-gray-50 border-b">
              <div className="flex justify-between text-xs mb-1">
                <span>Weekly OTJ Progress</span>
                <span className="font-semibold">{weeklyProgress.hours} / {weeklyProgress.target} hrs</span>
              </div>
              <Progress value={weeklyProgress.percentage} className="h-2" />
              <div className="text-xs mt-1 text-right">
                {weeklyProgress.percentage >= 100 ? (
                  <span className="text-green-600 font-medium">Target achieved!</span>
                ) : (
                  <span className="text-amber-600 font-medium">{weeklyProgress.target - weeklyProgress.hours} hours needed</span>
                )}
              </div>
            </div>

            <CardContent className="pt-4 pb-2">
              <h3 className="text-sm font-medium mb-2">Recent OTJ Entries</h3>

              {entriesLoading ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-6 w-6 mx-auto animate-spin opacity-30" />
                  <p className="text-sm text-muted-foreground mt-2">Loading your logs...</p>
                </div>
              ) : otjEntries?.length === 0 ? (
                <div className="text-center py-8 border rounded-md bg-gray-50">
                  <AlertCircle className="h-6 w-6 mx-auto opacity-30" />
                  <p className="text-sm text-muted-foreground mt-2">No logs found for this week</p>
                  <Button 
                    variant="link" 
                    className="text-xs mt-1" 
                    onClick={() => setActiveTab("add-log")}
                  >
                    Create your first log entry
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {otjEntries?.map((entry: any) => (
                    <div key={entry.id} className="border rounded-md p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{entry.activityType.replace('_', ' ')} ({entry.hours} hrs)</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            entry.verifiedByEmployer && entry.verifiedByTutor ? "default" : 
                            entry.verifiedByEmployer || entry.verifiedByTutor ? "outline" : 
                            "secondary"
                          }
                          className="text-xs"
                        >
                          {entry.verifiedByEmployer && entry.verifiedByTutor ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</>
                          ) : entry.verifiedByEmployer || entry.verifiedByTutor ? (
                            <><Clock className="h-3 w-3 mr-1" /> Partially Verified</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                      </div>
                      
                      <div className="mt-2 text-xs">
                        <p className="line-clamp-2">{entry.description}</p>
                      </div>

                      {/* Verification details */}
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex items-center">
                          <div className="w-3 h-3 mr-1">
                            {entry.verifiedByTutor ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <span>Tutor: {entry.verifiedByTutor ? 'Verified' : 'Pending'}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 mr-1">
                            {entry.verifiedByEmployer ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <span>Employer: {entry.verifiedByEmployer ? 'Verified' : 'Pending'}</span>
                        </div>
                      </div>

                      {/* KSBs */}
                      {entry.ksbIds && entry.ksbIds.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {entry.ksbIds.map((ksbId: number) => {
                              const ksb = ksbElements?.find((k: any) => k.id === ksbId);
                              return (
                                <Badge key={ksbId} variant="outline" className="text-xs px-1 py-0">
                                  {ksb ? `${ksb.type}${ksb.reference}` : `KSB ${ksbId}`}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            <CardFooter className="border-t bg-primary/5 justify-center py-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs" 
                onClick={() => setActiveTab("add-log")}
              >
                <Clock className="w-3 h-3 mr-1" />
                Log New Activity
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}