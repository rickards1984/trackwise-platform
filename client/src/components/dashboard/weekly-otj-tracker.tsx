import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyOtjEntry {
  startDate: string;
  endDate: string;
  hours: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  entries: Array<any>; // This would be more specifically typed in a real app
}

interface WeeklyOtjTrackerProps {
  weeklyData: WeeklyOtjEntry[];
  targetHours: number;
}

export default function WeeklyOtjTracker({ weeklyData, targetHours }: WeeklyOtjTrackerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };
  
  const previousMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(date);
  };
  
  const nextMonth = () => {
    const date = new Date(currentMonth);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(date);
  };
  
  const currentMonthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Filter weeks that have dates in the current month
  const filteredWeeks = weeklyData.filter(week => {
    const weekStart = new Date(week.startDate);
    const weekEnd = new Date(week.endDate);
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    return (weekStart <= monthEnd && weekEnd >= monthStart);
  });
  
  const isCurrentWeek = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return (now >= start && now <= end);
  };
  
  const getStatusClass = (status: string) => {
    switch(status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };
  
  const getProgressClass = (hours: number, target: number) => {
    const percentage = (hours / target) * 100;
    if (percentage >= 100) return 'bg-emerald-600';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-amber-500';
  };
  
  return (
    <Card className="col-span-2">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Weekly OTJ Hours</h3>
          <div className="flex space-x-2 items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={previousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{currentMonthName}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredWeeks.length > 0 ? (
            filteredWeeks.map((week, index) => {
              const current = isCurrentWeek(week.startDate, week.endDate);
              const remainingHours = Math.max(0, targetHours - week.hours);
              const percentage = (week.hours / targetHours) * 100;
              
              return (
                <div 
                  key={index}
                  className={cn(
                    "border rounded-md p-3",
                    current ? "bg-primary-light border-primary-light" : "border-neutral-200"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <Calendar className={cn(
                        "mr-2 h-5 w-5",
                        current ? "text-primary" : "text-neutral-400"
                      )} />
                      <h4 className="font-medium text-neutral-900">
                        {current ? 'Current Week' : ''} ({formatDateRange(week.startDate, week.endDate)})
                      </h4>
                    </div>
                    <div className="flex items-center">
                      <Badge className={cn(
                        "text-xs",
                        current ? "bg-primary text-white" : getStatusClass(week.status)
                      )}>
                        {current ? 'Current' : week.status.charAt(0).toUpperCase() + week.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-end space-x-1 mb-2">
                    <span className="text-2xl font-bold text-neutral-900">{week.hours}</span>
                    <span className="text-sm text-neutral-500 pb-1">/ {targetHours} hours</span>
                  </div>
                  
                  <div className="w-full bg-white rounded-full h-2.5 mb-2">
                    <div 
                      className={cn(
                        "h-2.5 rounded-full", 
                        getProgressClass(week.hours, targetHours)
                      )} 
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  {current && remainingHours > 0 && (
                    <div className="flex justify-between text-xs text-neutral-500">
                      <span>{remainingHours} hours remaining</span>
                      <span>Due: {new Date(week.endDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-neutral-500">
              No OTJ entries found for {currentMonthName}
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="link" className="text-primary hover:text-primary-dark">
            View All OTJ History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
