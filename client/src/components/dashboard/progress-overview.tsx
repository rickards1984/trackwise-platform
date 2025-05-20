import { Card, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle, Gauge } from "lucide-react";

interface ProgressData {
  overall: number;
  ksbsAchieved: number;
  totalKsbs: number;
  otjHours: number;
}

interface ApprenticeshipDetails {
  title: string;
  level: number;
  startDate: string;
  expectedEndDate: string;
  minimumOtjHours: number;
}

interface ProgressOverviewProps {
  progressData: ProgressData;
  apprenticeshipDetails: ApprenticeshipDetails;
}

export default function ProgressOverview({ progressData, apprenticeshipDetails }: ProgressOverviewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">Apprenticeship Progress</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-neutral-500">Overall Completion</p>
                <p className="text-2xl font-bold text-neutral-900">{progressData.overall}%</p>
              </div>
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-3 w-full bg-neutral-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${progressData.overall}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-neutral-500">OTJ Hours</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {progressData.otjHours} / {apprenticeshipDetails.minimumOtjHours}
                </p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-3 w-full bg-neutral-200 rounded-full h-2.5">
              <div 
                className="bg-amber-500 h-2.5 rounded-full" 
                style={{ 
                  width: `${Math.min(
                    (progressData.otjHours / apprenticeshipDetails.minimumOtjHours) * 100, 
                    100
                  )}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-neutral-500">KSBs Achieved</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {progressData.ksbsAchieved} / {progressData.totalKsbs}
                </p>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-3 w-full bg-neutral-200 rounded-full h-2.5">
              <div 
                className="bg-emerald-600 h-2.5 rounded-full" 
                style={{ 
                  width: `${(progressData.ksbsAchieved / progressData.totalKsbs) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            <h4 className="text-sm font-medium text-neutral-900">
              Program: <span className="text-neutral-700 font-normal">{apprenticeshipDetails.title} Level {apprenticeshipDetails.level}</span>
            </h4>
            <p className="text-sm text-neutral-500">
              Start: <span className="font-medium">{formatDate(apprenticeshipDetails.startDate)}</span> · 
              End: <span className="font-medium">{formatDate(apprenticeshipDetails.expectedEndDate)}</span>
            </p>
          </div>
          <a href="/ksb-tracker" className="text-sm font-medium text-primary hover:text-primary-dark flex items-center">
            View Detailed Progress 
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
