import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import { ChevronLeft, Calendar, Clock, User, Users, MapPin, FileText, CheckCircle, XCircle, PenTool } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

// Status badge component for reviews
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'scheduled':
      return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Scheduled</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Completed</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancelled</Badge>;
    case 'rescheduled':
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Rescheduled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Signature status component
const SignatureStatus = ({ signed, date, role }: { signed: boolean; date: string | null; role: string }) => {
  return (
    <div className="flex items-center space-x-2">
      {signed ? (
        <>
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">{role} Signed</p>
            {date && (
              <p className="text-xs text-muted-foreground">
                {format(parseISO(date), 'PPp')}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{role} Signature Pending</p>
          </div>
        </>
      )}
    </div>
  );
};

// Rescheduling Form Schema
const rescheduleFormSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)'),
  newTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
  notes: z.string().optional(),
});

type RescheduleFormValues = z.infer<typeof rescheduleFormSchema>;

// Notes Form Schema
const notesFormSchema = z.object({
  notes: z.string().min(1, 'Notes cannot be empty'),
});

type NotesFormValues = z.infer<typeof notesFormSchema>;

const ReviewDetailPage = () => {
  const [location, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const reviewId = parseInt(params.id);
  
  // Form states
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = React.useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = React.useState(false);
  
  // Fetch the review data
  const { data: review, isLoading, isError } = useQuery({
    queryKey: [`/api/v2/reviews/${reviewId}`],
    enabled: !isNaN(reviewId),
  });
  
  // Fetch current user for permissions
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  // Fetch related users
  const { data: learner } = useQuery({
    queryKey: [`/api/users/${review?.learnerId}`],
    enabled: !!review?.learnerId,
  });
  
  const { data: employer } = useQuery({
    queryKey: [`/api/users/${review?.employerId}`],
    enabled: !!review?.employerId,
  });
  
  const { data: tutor } = useQuery({
    queryKey: [`/api/users/${review?.tutorId}`],
    enabled: !!review?.tutorId,
  });
  
  // Setup forms
  const rescheduleForm = useForm<RescheduleFormValues>({
    defaultValues: {
      newDate: review?.scheduledDate 
        ? format(parseISO(review.scheduledDate), 'yyyy-MM-dd') 
        : format(new Date(), 'yyyy-MM-dd'),
      newTime: review?.scheduledDate 
        ? format(parseISO(review.scheduledDate), 'HH:mm') 
        : '10:00',
      notes: '',
    },
  });
  
  const notesForm = useForm<NotesFormValues>({
    defaultValues: {
      notes: review?.notes || '',
    },
  });
  
  // Reset form values when review data is loaded
  React.useEffect(() => {
    if (review) {
      const scheduledDate = parseISO(review.scheduledDate);
      rescheduleForm.reset({
        newDate: format(scheduledDate, 'yyyy-MM-dd'),
        newTime: format(scheduledDate, 'HH:mm'),
        notes: '',
      });
      
      notesForm.reset({
        notes: review.notes || '',
      });
    }
  }, [review, rescheduleForm, notesForm]);
  
  // Sign review mutation
  const signReviewMutation = useMutation({
    mutationFn: async ({ role }: { role: 'learner' | 'employer' | 'tutor' }) => {
      const response = await fetch(`/api/v2/reviews/${reviewId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, userId: user?.id }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sign review');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review Signed',
        description: 'You have successfully signed this review.',
      });
      
      // Invalidate the review query to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/v2/reviews/${reviewId}`] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign review. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Reschedule review mutation
  const rescheduleReviewMutation = useMutation({
    mutationFn: async (data: RescheduleFormValues) => {
      // Combine date and time into a single Date object
      const [year, month, day] = data.newDate.split('-').map(Number);
      const [hours, minutes] = data.newTime.split(':').map(Number);
      
      const newDate = new Date(year, month - 1, day, hours, minutes);
      
      const response = await fetch(`/api/v2/reviews/${reviewId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          newDate: newDate.toISOString(),
          notes: data.notes,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reschedule review');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Review Rescheduled',
        description: 'The review has been rescheduled successfully.',
      });
      
      // Close the dialog and invalidate queries
      setIsRescheduleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/v2/reviews/${reviewId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/reviews'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule review. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (data: NotesFormValues) => {
      const response = await fetch(`/api/v2/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: data.notes }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update notes');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Notes Updated',
        description: 'The review notes have been updated successfully.',
      });
      
      // Close the dialog and invalidate queries
      setIsNotesDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/v2/reviews/${reviewId}`] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update notes. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Determine if current user can sign as a specific role
  const canSignAsLearner = user?.id === review?.learnerId && !review?.signedByLearner;
  const canSignAsEmployer = user?.id === review?.employerId && !review?.signedByEmployer;
  const canSignAsTutor = user?.id === review?.tutorId && !review?.signedByTutor;
  
  // Determine if current user can reschedule (only tutor/assessor can reschedule)
  const canReschedule = (user?.role === 'assessor' || user?.role === 'training_provider' || user?.role === 'admin') && 
                        user?.id === review?.tutorId && 
                        review?.status !== 'completed' && 
                        review?.status !== 'cancelled';
  
  // Determine if current user can update notes (only tutor/assessor can update notes)
  const canUpdateNotes = (user?.role === 'assessor' || user?.role === 'training_provider' || user?.role === 'admin') && 
                        user?.id === review?.tutorId;
  
  // Handle form submissions
  const onRescheduleSubmit = (data: RescheduleFormValues) => {
    rescheduleReviewMutation.mutate(data);
  };
  
  const onNotesSubmit = (data: NotesFormValues) => {
    updateNotesMutation.mutate(data);
  };
  
  // Handle sign review
  const handleSignReview = (role: 'learner' | 'employer' | 'tutor') => {
    signReviewMutation.mutate({ role });
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p>Loading review details...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (isError || !review) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Review</h2>
          <p className="text-muted-foreground">
            There was a problem loading the review. Please try again or go back to reviews.
          </p>
          <Button 
            className="mt-4" 
            onClick={() => setLocation('/reviews')}
          >
            Back to Reviews
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => setLocation('/reviews')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Reviews
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Review Details</h1>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{review.title || '12-Weekly Progress Review'}</CardTitle>
                <CardDescription className="mt-1">
                  {review.description || 'Regular progress check to review learning and development'}
                </CardDescription>
              </div>
              <StatusBadge status={review.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(review.scheduledDate), 'PPP')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(review.scheduledDate), 'p')}
                    </p>
                  </div>
                </div>
                
                {review.location && (
                  <div className="flex items-center gap-3 col-span-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {review.location}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Participants</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                        <div>
                          <p className="font-medium">Learner</p>
                          <p className="text-sm text-muted-foreground">
                            {learner ? `${learner.firstName} ${learner.lastName}` : 'Loading...'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                        <div>
                          <p className="font-medium">Employer</p>
                          <p className="text-sm text-muted-foreground">
                            {employer ? `${employer.firstName} ${employer.lastName}` : 'Loading...'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/40">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <PenTool className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                        <div>
                          <p className="font-medium">Tutor/Assessor</p>
                          <p className="text-sm text-muted-foreground">
                            {tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Loading...'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {review.notes && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">Notes</h3>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {review.notes}
                    </p>
                  </div>
                </>
              )}
              
              {review.status === 'rescheduled' && (
                <>
                  <Separator />
                  
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-amber-800 mb-1">Review Rescheduled</h3>
                    <p className="text-xs text-amber-700">
                      This review was rescheduled. The new date and time are shown above.
                      {review.reschedulingNotes && (
                        <>
                          <br /><br />
                          <span className="font-semibold">Rescheduling notes:</span><br />
                          {review.reschedulingNotes}
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <div className="flex space-x-2">
                {canReschedule && (
                  <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Reschedule</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reschedule Review</DialogTitle>
                        <DialogDescription>
                          Change the date and time for this 12-weekly review meeting.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...rescheduleForm}>
                        <form onSubmit={rescheduleForm.handleSubmit(onRescheduleSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={rescheduleForm.control}
                              name="newDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={rescheduleForm.control}
                              name="newTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Time</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="time" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={rescheduleForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rescheduling Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Reason for rescheduling..." 
                                    className="min-h-[100px]"
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsRescheduleDialogOpen(false)}
                              disabled={rescheduleReviewMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={rescheduleReviewMutation.isPending}
                            >
                              {rescheduleReviewMutation.isPending ? 'Rescheduling...' : 'Reschedule Review'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
                
                {canUpdateNotes && (
                  <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Edit Notes</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Review Notes</DialogTitle>
                        <DialogDescription>
                          Update the notes for this 12-weekly review meeting.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...notesForm}>
                        <form onSubmit={notesForm.handleSubmit(onNotesSubmit)} className="space-y-4">
                          <FormField
                            control={notesForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Review notes..." 
                                    className="min-h-[200px]"
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setIsNotesDialogOpen(false)}
                              disabled={updateNotesMutation.isPending}
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={updateNotesMutation.isPending}
                            >
                              {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Signatures</CardTitle>
              <CardDescription>
                All participants must sign to complete the review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <SignatureStatus 
                  signed={review.signedByLearner} 
                  date={review.learnerSignatureDate} 
                  role="Learner" 
                />
                
                <SignatureStatus 
                  signed={review.signedByEmployer} 
                  date={review.employerSignatureDate} 
                  role="Employer" 
                />
                
                <SignatureStatus 
                  signed={review.signedByTutor} 
                  date={review.tutorSignatureDate} 
                  role="Tutor/Assessor" 
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              {canSignAsLearner && (
                <Button 
                  className="w-full" 
                  onClick={() => handleSignReview('learner')}
                  disabled={signReviewMutation.isPending}
                >
                  {signReviewMutation.isPending ? 'Signing...' : 'Sign as Learner'}
                </Button>
              )}
              
              {canSignAsEmployer && (
                <Button 
                  className="w-full" 
                  onClick={() => handleSignReview('employer')}
                  disabled={signReviewMutation.isPending}
                >
                  {signReviewMutation.isPending ? 'Signing...' : 'Sign as Employer'}
                </Button>
              )}
              
              {canSignAsTutor && (
                <Button 
                  className="w-full" 
                  onClick={() => handleSignReview('tutor')}
                  disabled={signReviewMutation.isPending}
                >
                  {signReviewMutation.isPending ? 'Signing...' : 'Sign as Tutor/Assessor'}
                </Button>
              )}
              
              {!canSignAsLearner && !canSignAsEmployer && !canSignAsTutor && (
                <p className="text-sm text-muted-foreground text-center">
                  {review.signedByLearner && review.signedByEmployer && review.signedByTutor
                    ? 'All parties have signed this review.'
                    : 'You cannot sign this review with your current role.'}
                </p>
              )}
            </CardFooter>
          </Card>
          
          {review.status === 'completed' && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800">Review Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700">
                  This 12-weekly review has been completed and signed by all parties.
                  {review.actualDate && (
                    <>
                      <br /><br />
                      <span className="font-semibold">Completed on:</span><br />
                      {format(parseISO(review.actualDate), 'PPP')}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Missing component needed for the form
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export default ReviewDetailPage;