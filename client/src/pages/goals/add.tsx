import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft, Target, Save, AlertCircle } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Form schema
const formSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  targetDate: z.date({
    required_error: "A target date is required.",
  }),
  ksbIds: z.array(z.string()).optional(),
  tutorId: z.number().optional(),
});

export default function AddLearningGoal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [selectedKsbs, setSelectedKsbs] = useState<string[]>([]);
  
  // Get learner profile to access tutor ID
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/learner-profile'],
    enabled: !!user,
  });
  
  // Get standard details to load KSBs
  const { data: standard, isLoading: standardLoading } = useQuery({
    queryKey: ['/api/standards', profile?.standardId],
    enabled: !!profile?.standardId,
  });
  
  // Get KSBs for the apprenticeship standard
  const { data: ksbs, isLoading: ksbsLoading } = useQuery({
    queryKey: ['/api/ksbs', standard?.id],
    enabled: !!standard?.id,
  });
  
  // Get tutors (for admin users)
  const { data: tutors, isLoading: tutorsLoading } = useQuery({
    queryKey: ['/api/users/tutors'],
    enabled: user?.role === 'admin' || user?.role === 'training_provider',
  });
  
  // Group KSBs by type
  const ksbsByType = ksbs ? ksbs.reduce((acc: any, ksb: any) => {
    if (!acc[ksb.type]) {
      acc[ksb.type] = [];
    }
    acc[ksb.type].push(ksb);
    return acc;
  }, {}) : {};
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      ksbIds: [],
      tutorId: profile?.tutorId,
    },
  });
  
  // Track form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle KSB selection
  const handleKsbSelect = (ksbId: string, checked: boolean) => {
    if (checked) {
      setSelectedKsbs([...selectedKsbs, ksbId]);
    } else {
      setSelectedKsbs(selectedKsbs.filter(id => id !== ksbId));
    }
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Add selected KSBs to form data
      const formData = {
        ...values,
        ksbIds: selectedKsbs,
      };
      
      // Use tutorId from profile if not specified in form
      if (!formData.tutorId && profile?.tutorId) {
        formData.tutorId = profile.tutorId;
      }
      
      // Submit the form
      await apiRequest('/api/learning-goals', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Show success message
      toast({
        title: "Learning goal created",
        description: "Your new learning goal has been successfully created.",
      });
      
      // Invalidate queries and redirect
      queryClient.invalidateQueries({ queryKey: ['/api/learning-goals'] });
      navigate('/goals');
    } catch (error) {
      console.error("Error creating learning goal:", error);
      toast({
        title: "Failed to create goal",
        description: "There was a problem creating your learning goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isLoading = profileLoading || standardLoading || ksbsLoading;
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={() => navigate("/goals")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Button>
        </div>
        <h1 className="text-2xl font-bold">Add New Learning Goal</h1>
        <p className="text-muted-foreground">
          Create a new learning goal to track your progress
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading...</p>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Goal Details</CardTitle>
                <CardDescription>
                  Define what you want to achieve and when
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Master React state management" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        A clear, concise title for your goal
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
                          placeholder="Describe what you want to achieve and how you plan to do it..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide details about your goal and how you'll measure success
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Target Completion Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={
                                "w-full pl-3 text-left font-normal"
                              }
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(user?.role === 'admin' || user?.role === 'training_provider') && tutors && (
                  <FormField
                    control={form.control}
                    name="tutorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Tutor</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a tutor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tutors.map((tutor: any) => (
                              <SelectItem 
                                key={tutor.id} 
                                value={tutor.id.toString()}
                              >
                                {tutor.firstName} {tutor.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the tutor who will oversee this goal
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* KSB Mapping */}
            {ksbs && ksbs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Related KSBs</CardTitle>
                  <CardDescription>
                    Link this goal to specific knowledge, skills, or behaviors from your apprenticeship standard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(ksbsByType).map(([type, typeKsbs]: [string, any]) => (
                      <div key={type} className="space-y-3">
                        <h3 className="font-medium capitalize">{type}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {typeKsbs.map((ksb: any) => (
                            <div key={ksb.id} className="flex items-start space-x-2">
                              <Checkbox 
                                id={`ksb-${ksb.id}`}
                                checked={selectedKsbs.includes(ksb.id.toString())}
                                onCheckedChange={(checked) => 
                                  handleKsbSelect(ksb.id.toString(), checked === true)
                                }
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label 
                                  htmlFor={`ksb-${ksb.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {ksb.code}: {ksb.description}
                                </Label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {!profile?.tutorId && user?.role === 'learner' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No tutor assigned</AlertTitle>
                <AlertDescription>
                  You don't have a tutor assigned to your profile yet. 
                  Goals without a tutor cannot be verified.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/goals')}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || (!profile?.tutorId && user?.role === 'learner')}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Goal
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}