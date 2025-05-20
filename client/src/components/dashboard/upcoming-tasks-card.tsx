import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, FileCode } from "lucide-react";
import { Link } from "wouter";

export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  unit?: string;
  assignedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
  ksb?: {
    id: number;
    type: string;
    code: string;
    description: string;
  } | null;
}

interface UpcomingTasksCardProps {
  tasks: Task[];
}

export default function UpcomingTasksCard({ tasks }: UpcomingTasksCardProps) {
  const getDaysRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 14) return "1 week";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  };
  
  const getDueColor = (dueDate: string) => {
    const days = getDaysRemaining(dueDate);
    if (days === "Overdue") return "text-destructive font-medium";
    if (days === "Today" || days === "Tomorrow" || days === "1 day" || days === "2 days") return "text-destructive font-medium";
    if (parseInt(days) <= 7) return "text-amber-500 font-medium";
    return "text-neutral-500";
  };
  
  const getTaskIcon = (task: Task) => {
    if (task.ksb?.type === "knowledge") return <FileText className="text-primary" />;
    if (task.ksb?.type === "skill") return <FileCode className="text-primary" />;
    return <FileText className="text-primary" />;
  };
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Upcoming Tasks</h3>
          <Badge variant="outline" className="bg-primary-light text-primary">
            {tasks.length} Due Soon
          </Badge>
        </div>

        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start p-3 border border-neutral-200 rounded-md hover:bg-neutral-50">
                <div className="flex-shrink-0 h-10 w-10 rounded-md bg-primary-light flex items-center justify-center text-primary">
                  {getTaskIcon(task)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-neutral-900">{task.title}</p>
                    <p className={`text-xs ${getDueColor(task.dueDate)}`}>
                      {getDaysRemaining(task.dueDate)}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {task.unit || (task.ksb ? `KSB: ${task.ksb.code} - ${task.ksb.description}` : "No unit assigned")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-neutral-500">
              <Clock className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
              <p>No upcoming tasks</p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/tasks">
              View All Tasks
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
