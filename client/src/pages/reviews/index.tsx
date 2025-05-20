import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format, isAfter, isBefore, isToday, parseISO, addDays } from 'date-fns';
import { ChevronRight, Calendar as CalendarIcon, CheckCircle, AlarmClock, File, AlertCircle, Users } from 'lucide-react';

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

// Review card component
const ReviewCard = ({ review }: { review: any }) => {
  const [location, setLocation] = useLocation();
  const isUpcoming = isBefore(new Date(), parseISO(review.scheduledDate)) || isToday(parseISO(review.scheduledDate));
  
  return (
    <Card className="mb-4 hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">
            {review.title || '12-Weekly Progress Review'}
          </CardTitle>
          <StatusBadge status={review.status} />
        </div>
        <CardDescription>
          {review.description || 'Regular progress check to review learning and development'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(parseISO(review.scheduledDate), 'PPP')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlarmClock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(parseISO(review.scheduledDate), 'p')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {review.signedByLearner && review.signedByEmployer && review.signedByTutor 
                ? 'All signed' 
                : `${review.signedByLearner ? '✓' : '○'} Learner | ${review.signedByEmployer ? '✓' : '○'} Employer | ${review.signedByTutor ? '✓' : '○'} Tutor`}
            </span>
          </div>
          
          {review.location && (
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-muted-foreground" />
              <span>{review.location}</span>
            </div>
          )}
          
          {isUpcoming && review.status === 'scheduled' && (
            <div className="col-span-2 mt-2">
              <AlertCircle className="h-4 w-4 text-amber-500 inline-block mr-2" />
              <span className="text-amber-500">
                {isToday(parseISO(review.scheduledDate)) 
                  ? 'This review is scheduled for today' 
                  : `This review is in ${Math.ceil((parseISO(review.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`}
              </span>
            </div>
          )}
          
          {review.notes && (
            <div className="col-span-2 mt-2">
              <p className="text-sm text-muted-foreground">{review.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="ghost" 
          className="ml-auto flex items-center gap-1 text-sm"
          onClick={() => setLocation(`/reviews/${review.id}`)}
        >
          View Details
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Calendar view component
const ReviewCalendar = ({ reviews }: { reviews: any[] }) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Filter reviews for the selected date if a date is selected
  const reviewsOnDate = selectedDate 
    ? reviews.filter(review => {
        const reviewDate = parseISO(review.scheduledDate);
        return reviewDate.getDate() === selectedDate.getDate() &&
               reviewDate.getMonth() === selectedDate.getMonth() &&
               reviewDate.getFullYear() === selectedDate.getFullYear();
      }) 
    : [];
  
  // Function to highlight dates with reviews
  const isDayWithReview = (date: Date) => {
    return reviews.some(review => {
      const reviewDate = parseISO(review.scheduledDate);
      return reviewDate.getDate() === date.getDate() &&
             reviewDate.getMonth() === date.getMonth() &&
             reviewDate.getFullYear() === date.getFullYear();
    });
  };
  
  return (
    <div className="grid md:grid-cols-5 gap-8">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border w-full"
              modifiers={{
                hasReview: (date) => isDayWithReview(date),
              }}
              modifiersStyles={{
                hasReview: { 
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: 'rgb(59, 130, 246)',
                },
              }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-md">About Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              12-weekly reviews are formal progress meetings between you, your employer, and your tutor/assessor. 
              These reviews track your apprenticeship progress, address any concerns, and set goals for the next period.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="md:col-span-3">
        <h3 className="text-lg font-medium mb-4">
          {selectedDate ? (
            reviewsOnDate.length > 0 
              ? `Reviews on ${format(selectedDate, 'PPP')}` 
              : `No reviews scheduled on ${format(selectedDate, 'PPP')}`
          ) : 'Select a date to view reviews'}
        </h3>
        
        {reviewsOnDate.length > 0 ? (
          reviewsOnDate.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))
        ) : selectedDate && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-muted-foreground">No reviews scheduled for this date</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/reviews/schedule">Schedule a Review</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Main Reviews Page component
const ReviewsPage = () => {
  const [location, setLocation] = useLocation();
  
  // Fetch user's reviews based on their role
  const { data: user } = useQuery({
    queryKey: ['/api/auth/me'],
  });
  
  // Determine which API endpoint to use based on user role
  let reviewsQueryKey = '/api/v2/reviews';
  if (user?.role === 'learner') {
    reviewsQueryKey = `/api/v2/reviews/learner/${user.id}`;
  } else if (user?.role === 'assessor' || user?.role === 'training_provider') {
    reviewsQueryKey = `/api/v2/reviews/tutor/${user.id}`;
  }
  
  const { data: reviews, isLoading } = useQuery({
    queryKey: [reviewsQueryKey],
    enabled: !!user,
  });
  
  // Function to filter reviews by status
  const filterReviewsByStatus = (status: string | string[]) => {
    if (!reviews) return [];
    
    if (Array.isArray(status)) {
      return reviews.filter(review => status.includes(review.status));
    }
    
    return reviews.filter(review => review.status === status);
  };
  
  // Get upcoming reviews (scheduled and within the next 30 days)
  const upcomingReviews = reviews 
    ? reviews.filter(review => 
        review.status === 'scheduled' && 
        (isToday(parseISO(review.scheduledDate)) || 
         isAfter(parseISO(review.scheduledDate), new Date()) && 
         isBefore(parseISO(review.scheduledDate), addDays(new Date(), 30)))
      )
    : [];
  
  const pastReviews = filterReviewsByStatus(['completed', 'cancelled']);
  
  // Only tutors and training providers can schedule new reviews
  const canScheduleReviews = user && (user.role === 'assessor' || user.role === 'training_provider' || user.role === 'admin');
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">12-Weekly Reviews</h1>
        
        {canScheduleReviews && (
          <Button onClick={() => setLocation('/reviews/schedule')}>
            Schedule New Review
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="past">Past Reviews</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading reviews...</p>
            </div>
          ) : upcomingReviews.length > 0 ? (
            upcomingReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-muted-foreground">No upcoming reviews scheduled</p>
                {canScheduleReviews && (
                  <Button className="mt-4" variant="outline" asChild>
                    <Link href="/reviews/schedule">Schedule a Review</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="calendar">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading calendar...</p>
            </div>
          ) : (
            <ReviewCalendar reviews={reviews || []} />
          )}
        </TabsContent>
        
        <TabsContent value="past" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading past reviews...</p>
            </div>
          ) : pastReviews.length > 0 ? (
            pastReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-muted-foreground">No past reviews found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReviewsPage;