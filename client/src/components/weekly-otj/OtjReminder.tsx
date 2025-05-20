import { useQuery } from "@tanstack/react-query";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type OtjReminderProps = {
  variant?: "default" | "compact";
  userId: number;
};

export function OtjReminder({ variant = "default", userId }: OtjReminderProps) {
  const [_, navigate] = useLocation();
  
  // Get learner profile to get the standard
  const { data: learnerProfile } = useQuery({
    queryKey: ["/api/learner-profile", userId],
    enabled: !!userId,
  });
  
  // Get standard to get minimum OTJ hours
  const { data: standard } = useQuery({
    queryKey: ["/api/standards", learnerProfile?.standardId],
    enabled: !!learnerProfile?.standardId,
  });
  
  // Get current week's tracking
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartFormatted = format(weekStart, "yyyy-MM-dd");
  
  const { data: weeklyTracking } = useQuery({
    queryKey: ['/api/v2/weekly-otj/learner', userId, 'week', weekStartFormatted],
    enabled: !!userId,
  });
  
  const minimumHours = standard?.minimumOtjHours || 6;
  const currentHours = weeklyTracking?.totalHours || 0;
  const progressPercentage = Math.min(100, (currentHours / minimumHours) * 100);
  const metRequirement = currentHours >= minimumHours;
  
  // If we're using the compact variant, render a simplified version
  if (variant === "compact") {
    return (
      <div className="flex items-center p-3 mb-4 rounded-md bg-slate-50 border">
        <div className="mr-3">
          {metRequirement ? (
            <CheckCircle className="h-6 w-6 text-green-500" />
          ) : (
            <Clock className="h-6 w-6 text-amber-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium">
              {metRequirement ? 
                "Weekly OTJ target met" : 
                `Weekly OTJ: ${currentHours} of ${minimumHours} hours`}
            </p>
            <span className="text-xs">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-1" />
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-2"
          onClick={() => navigate("/otj-logs/weekly")}
        >
          Update
        </Button>
      </div>
    );
  }
  
  // Default variant
  return (
    <Alert className={metRequirement ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
      <div className="flex">
        {metRequirement ? (
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2" />
        )}
        <div className="flex-1">
          <AlertTitle>
            {metRequirement ? 
              "Weekly OTJ hours requirement met!" : 
              "Weekly OTJ hours tracking reminder"}
          </AlertTitle>
          <AlertDescription className="mt-1">
            {metRequirement ? (
              <p>You have completed {currentHours} hours of off-the-job training this week, meeting the minimum requirement of {minimumHours} hours.</p>
            ) : (
              <>
                <p>
                  Don't forget to log your off-the-job training hours. You have completed {currentHours} of the required {minimumHours} hours this week.
                </p>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              </>
            )}
            
            <div className="mt-3">
              <Button
                size="sm"
                variant={metRequirement ? "outline" : "default"}
                onClick={() => navigate("/otj-logs/weekly")}
              >
                <Clock className="h-4 w-4 mr-2" />
                {metRequirement ? "View OTJ Tracking" : "Update OTJ Hours"}
              </Button>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}