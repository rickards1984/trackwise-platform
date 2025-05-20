import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema for weekly Off-the-Job hours
const weeklyOtjSchema = z.object({
  totalHours: z.coerce
    .number()
    .min(0, "Hours cannot be negative")
    .max(40, "Hours exceed the maximum allowed for a week"),
  notes: z.string().optional(),
});

type WeeklyOtjTrackerProps = {
  learnerId: number;
  minimumRequiredHours: number;
  showHistory?: boolean;
  compact?: boolean;
};

export function WeeklyOtjTracker({ 
  learnerId, 
  minimumRequiredHours = 6, 
  showHistory = false,
  compact = false
}: WeeklyOtjTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  
  // Calculate the week start (Monday) and end (Sunday) dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  
  // Format dates for display and API
  const weekStartFormatted = format(weekStart, "yyyy-MM-dd");
  const weekEndFormatted = format(weekEnd, "yyyy-MM-dd");
  const weekDisplayRange = `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`;

  // Check if the week is the current week
  const now = new Date();
  const isCurrentWeek = weekStart <= now && now <= weekEnd;

  // Fetch weekly tracking data for the selected week
  const { 
    data: weeklyTracking, 
    isLoading,
    isError,
    refetch 
  } = useQuery<any>({
    queryKey: ['/api/v2/weekly-otj/learner', learnerId, 'week', weekStartFormatted],
    retry: false,
  });

  // Fetch historical data if needed
  const { 
    data: historyData, 
    isLoading: historyLoading 
  } = useQuery<any[]>({
    queryKey: ['/api/v2/weekly-otj/learner', learnerId],
    enabled: showHistory,
  });

  // Form setup
  const form = useForm<z.infer<typeof weeklyOtjSchema>>({
    resolver: zodResolver(weeklyOtjSchema),
    defaultValues: {
      totalHours: weeklyTracking?.totalHours || 0,
      notes: weeklyTracking?.notes || "",
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (weeklyTracking) {
      form.reset({
        totalHours: weeklyTracking.totalHours,
        notes: weeklyTracking.notes || "",
      });
    } else {
      form.reset({
        totalHours: 0,
        notes: "",
      });
    }
  }, [weeklyTracking, form]);

  // Create or update weekly tracking
  const { mutate: saveWeeklyTracking, isPending: isSaving } = useMutation({
    mutationFn: async (data: z.infer<typeof weeklyOtjSchema>) => {
      // If we already have a tracking record, update it
      if (weeklyTracking) {
        return apiRequest(
          "PUT",
          `/api/v2/weekly-otj/${weeklyTracking.id}`, 
          {
            totalHours: data.totalHours,
            notes: data.notes,
          }
        );
      } 
      // Otherwise create a new one
      else {
        return apiRequest(
          "POST",
          "/api/v2/weekly-otj", 
          {
            learnerId,
            weekStartDate: weekStartFormatted,
            weekEndDate: weekEndFormatted,
            totalHours: data.totalHours,
            minimumRequiredHours,
            notes: data.notes,
          }
        );
      }
    },
    onSuccess: () => {
      toast({
        title: "Weekly hours saved",
        description: "Your Off-the-Job hours have been recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/weekly-otj/learner'] });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error saving hours",
        description: "There was a problem recording your hours. Please try again.",
        variant: "destructive",
      });
      console.error("Error saving weekly OTJ tracking:", error);
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof weeklyOtjSchema>) => {
    saveWeeklyTracking(data);
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setSelectedWeek(prevWeek => addDays(prevWeek, -7));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setSelectedWeek(prevWeek => addDays(prevWeek, 7));
  };

  // Calculate progress percentage
  const progressPercentage = weeklyTracking 
    ? Math.min(100, (weeklyTracking.totalHours / minimumRequiredHours) * 100) 
    : 0;

  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'incomplete':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  // Render badge for status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'incomplete':
        return <Badge className="bg-red-500">Incomplete</Badge>;
      default:
        return <Badge className="bg-yellow-500">Pending</Badge>;
    }
  };

  // If compact view is requested, render simplified version
  if (compact) {
    return (
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex justify-between items-center">
            <span>Weekly Off-the-Job Hours</span>
            {weeklyTracking && renderStatusBadge(weeklyTracking.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <span className="text-sm text-muted-foreground">Current week: {weekDisplayRange}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span>Progress: {weeklyTracking?.totalHours || 0} of {minimumRequiredHours} hours</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-4"
            onClick={() => window.location.href = '/otj-logs'}
          >
            Update Hours
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Weekly Off-the-Job Hours Tracker</CardTitle>
          {weeklyTracking && renderStatusBadge(weeklyTracking.status)}
        </div>
        <CardDescription>
          Track your Off-the-Job training hours to meet your apprenticeship requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>Previous Week</Button>
          <div className="text-center font-medium">{weekDisplayRange}</div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextWeek} 
            disabled={!isCurrentWeek}
          >
            Next Week
          </Button>
        </div>

        {isLoading ? (
          <div className="py-4 text-center">Loading weekly tracking data...</div>
        ) : isError ? (
          <Alert className="mb-4">
            <AlertTitle>No data available</AlertTitle>
            <AlertDescription>
              No tracking record found for this week. Submit your hours below.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 mb-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span>Progress towards minimum {minimumRequiredHours} hours</span>
                <span>{weeklyTracking?.totalHours || 0} hours ({Math.round(progressPercentage)}%)</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            {weeklyTracking?.tutorReviewDate && (
              <Alert>
                <AlertTitle>Reviewed by tutor</AlertTitle>
                <AlertDescription>
                  Your tutor reviewed this week's hours on {format(new Date(weeklyTracking.tutorReviewDate), "dd MMM yyyy")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="totalHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total OTJ Hours</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter total hours" 
                      min={0} 
                      step={0.5} 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Record the total number of Off-the-Job training hours for this week
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any notes about your OTJ activities this week" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? "Saving..." : "Save Weekly Hours"}
            </Button>
          </form>
        </Form>
      </CardContent>

      {showHistory && historyData && historyData.length > 0 && (
        <>
          <Separator />
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Previous weeks' OTJ hour records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyLoading ? (
                <div className="text-center py-4">Loading history...</div>
              ) : (
                historyData
                  .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
                  .slice(0, 5)
                  .map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-3 rounded-md border">
                      <div>
                        <div className="font-medium">
                          {format(new Date(record.weekStartDate), "dd MMM")} - {format(new Date(record.weekEndDate), "dd MMM yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.totalHours} hours {record.totalHours >= record.minimumRequiredHours ? '✅' : '❌'}
                        </div>
                      </div>
                      {renderStatusBadge(record.status)}
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}