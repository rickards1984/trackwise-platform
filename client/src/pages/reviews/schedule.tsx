import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

// Define the review form schema
const reviewFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  learnerId: z.number().min(1, 'Learner selection is required'),
  employerId: z.number().min(1, 'Employer selection is required'),
  tutorId: z.number().min(1, 'Tutor selection is required'),
  scheduledDate: z.date(),
  scheduledTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time format (HH:MM)'),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

const ScheduleReviewPage = () => {
  const [location, setLocation] = useLocation();
  
  // Fetch necessary data
  const { data: learners, isLoading: isLoadingLearners } = useQuery({
    queryKey: ['/api/users?role=learner'],
  });
  
  const { data: employers, isLoading: isLoadingEmployers } = useQuery({
    queryKey: ['/api/users?role=employer'],
  });
  
  const { data: tutors, isLoading: isLoadingTutors } = useQuery({
    queryKey: ['/api/users?role=assessor,training_provider'],
  });
  
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  // Form setup
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      title: '12-Weekly Progress Review',
      description: 'Regular progress check to review learning and development',
      scheduledDate: new Date(),
      scheduledTime: '10:00',
      tutorId: currentUser?.id || 0,
    },
  });
  
  // Handle learner selection
  const handleLearnerChange = async (learnerId: string) => {
    form.setValue('learnerId', parseInt(learnerId));
    
    // Find learner's employer from profile
    try {
      const response = await fetch(`/api/learner-profile?userId=${learnerId}`);
      const profile = await response.json();
      
      if (profile && profile.employerId) {
        form.setValue('employerId', profile.employerId);
      }
    } catch (error) {
      console.error('Error fetching learner profile:', error);
    }
  };
  
  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      // Combine date and time for the scheduled date
      const scheduledDate = new Date(data.scheduledDate);
      const [hours, minutes] = data.scheduledTime.split(':').map(Number);
      scheduledDate.setHours(hours, minutes);
      
      // Prepare the data for the API
      const reviewData = {
        title: data.title,
        description: data.description || '',
        learnerId: data.learnerId,
        employerId: data.employerId,
        tutorId: data.tutorId,
        scheduledDate: scheduledDate.toISOString(),
        location: data.location || '',
        notes: data.notes || '',
        status: 'scheduled' as const,
        signedByLearner: false,
        signedByEmployer: false,
        signedByTutor: false,
      };
      
      const response = await fetch('/api/v2/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to schedule review');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review Scheduled',
        description: 'The 12-weekly review has been scheduled successfully.',
      });
      
      // Invalidate the reviews cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/v2/reviews'] });
      
      // Redirect to the reviews page
      setLocation('/reviews');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule review. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: ReviewFormValues) => {
    createReviewMutation.mutate(data);
  };
  
  const isLoading = isLoadingLearners || isLoadingEmployers || isLoadingTutors || createReviewMutation.isPending;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => setLocation('/reviews')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Schedule 12-Weekly Review</h1>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Schedule New Review</CardTitle>
          <CardDescription>
            Set up a 12-weekly review meeting between a learner, their employer, and a tutor/assessor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="12-Weekly Progress Review" {...field} />
                    </FormControl>
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
                        placeholder="Regular progress check to review learning and development" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="learnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Learner</FormLabel>
                      <Select 
                        onValueChange={handleLearnerChange}
                        defaultValue={field.value?.toString()}
                        disabled={isLoadingLearners}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select learner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {learners?.map((learner: any) => (
                            <SelectItem key={learner.id} value={learner.id.toString()}>
                              {learner.firstName} {learner.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="employerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employer</FormLabel>
                      <Select 
                        onValueChange={(value) => form.setValue('employerId', parseInt(value))}
                        defaultValue={field.value?.toString()}
                        disabled={isLoadingEmployers}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employers?.map((employer: any) => (
                            <SelectItem key={employer.id} value={employer.id.toString()}>
                              {employer.firstName} {employer.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tutorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tutor/Assessor</FormLabel>
                      <Select 
                        onValueChange={(value) => form.setValue('tutorId', parseInt(value))}
                        defaultValue={field.value?.toString()}
                        disabled={isLoadingTutors}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tutor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tutors?.map((tutor: any) => (
                            <SelectItem key={tutor.id} value={tutor.id.toString()}>
                              {tutor.firstName} {tutor.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Zoom, Microsoft Teams, or Office Room 101" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription>
                        Physical location or meeting link
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Select date</span>
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
                
                <FormField
                  control={form.control}
                  name="scheduledTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormDescription>
                        24-hour format (e.g., 14:30)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information about the review..." 
                        className="min-h-[100px]"
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional details, preparation instructions, or agenda items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/reviews')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Scheduling...' : 'Schedule Review'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleReviewPage;