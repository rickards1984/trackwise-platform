import { useQuery } from "@tanstack/react-query";
import { WeeklyOtjTracker } from "@/components/weekly-otj/WeeklyOtjTracker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function WeeklyOtjTrackingPage() {
  // Fetch user data to get learner ID
  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // Fetch learner profile to get the standard's minimum OTJ hours
  const { data: learnerProfile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['/api/learner-profile', user?.id],
    enabled: !!user?.id,
  });
  
  // Fetch the apprenticeship standard to get minimum OTJ hours
  const { data: standard, isLoading: standardLoading, isError: standardError } = useQuery({
    queryKey: ['/api/apprenticeship-standard', learnerProfile?.standardId],
    enabled: !!learnerProfile?.standardId,
  });

  const isLoading = userLoading || profileLoading || standardLoading;
  const isError = userError || profileError || standardError;
  const minimumOtjHours = standard?.minimumOtjHours || 6; // Default to 6 if not available

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Weekly OTJ Hour Tracking</h1>
        <p className="text-muted-foreground">
          Track your weekly off-the-job training hours to meet the minimum requirement of {minimumOtjHours} hours
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">Loading user data...</div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load user data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 md:grid-cols-7">
          <div className="md:col-span-5">
            <WeeklyOtjTracker 
              learnerId={user.id} 
              minimumRequiredHours={minimumOtjHours}
              showHistory={true}
            />
          </div>
          <div className="md:col-span-2 space-y-6">
            <Alert>
              <AlertTitle>Why track OTJ hours?</AlertTitle>
              <AlertDescription>
                <p className="mt-2">
                  Off-the-job training is a mandatory requirement for apprenticeships. You must 
                  complete a minimum of {minimumOtjHours} hours per week of training that is directly 
                  relevant to your apprenticeship standard.
                </p>
                <p className="mt-2">
                  This training must take place within your normal working hours and can include:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Theory sessions</li>
                  <li>Practical training</li>
                  <li>Learning support</li>
                  <li>Shadowing</li>
                  <li>Industry visits</li>
                  <li>Mentoring</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTitle>Important Reminder</AlertTitle>
              <AlertDescription>
                Regular tracking of your OTJ hours is essential for your apprenticeship compliance. 
                Insufficient OTJ hours may affect your eligibility to complete your apprenticeship.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
}