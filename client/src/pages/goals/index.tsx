import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle2,
  Clock,
  PlusCircle,
  Target,
  Trash2,
  X,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearningGoals() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  // Fetch learning goals
  const {
    data: learningGoals,
    isLoading: goalsLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['/api/learning-goals'],
    enabled: !!user,
  });

  // Handle goal completion toggle
  const handleToggleCompletion = async (goalId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
      
      await apiRequest(`/api/learning-goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };

  // Confirm delete dialog
  const openDeleteDialog = (goalId: number) => {
    setSelectedGoalId(goalId);
    setShowDeleteDialog(true);
  };

  // Filter goals based on active tab
  const filteredGoals = learningGoals ? learningGoals.filter((goal: any) => {
    if (activeTab === 'active') return goal.status === 'active' || goal.status === 'overdue';
    if (activeTab === 'completed') return goal.status === 'completed';
    return true;
  }) : [];

  // Get status badge
  const getStatusBadge = (status: string, targetDate: string) => {
    const now = new Date();
    const target = new Date(targetDate);
    const isOverdue = status === 'active' && isBefore(target, now);
    
    if (status === 'completed') {
      return <Badge className="bg-green-500">Completed</Badge>;
    } else if (isOverdue) {
      return <Badge className="bg-red-500">Overdue</Badge>;
    } else {
      return <Badge className="bg-blue-500">Active</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Learning Goals</h1>
        </div>
        <Button onClick={() => navigate("/goals/add")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Goal
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            <Clock className="h-4 w-4 mr-2" />
            Active
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="all">
            <Target className="h-4 w-4 mr-2" />
            All Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {goalsLoading ? (
            <div className="space-y-4">
              <GoalSkeleton />
              <GoalSkeleton />
              <GoalSkeleton />
            </div>
          ) : isError ? (
            <Card>
              <CardContent className="text-center py-8">
                <p>Failed to load learning goals. Please try again later.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No {activeTab} goals found</p>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'active' ? 
                    "You don't have any active learning goals" : 
                    activeTab === 'completed' ? 
                      "You haven't completed any goals yet" : 
                      "You haven't set any learning goals yet"}
                </p>
                <Button onClick={() => navigate("/goals/add")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredGoals.map((goal: any) => (
                <Card key={goal.id} className="overflow-hidden">
                  <div className="flex">
                    <div 
                      className={`w-2 ${goal.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}
                    ></div>
                    <div className="flex-1">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{goal.title}</CardTitle>
                            <CardDescription className="mt-1">
                              Created on {format(new Date(goal.createdAt), 'dd MMM yyyy')}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(goal.status, goal.targetDate)}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/goals/${goal.id}`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleCompletion(goal.id, goal.status)}>
                                  {goal.status === 'completed' ? (
                                    <>
                                      <X className="h-4 w-4 mr-2" />
                                      Mark as Incomplete
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Mark as Complete
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-500"
                                  onClick={() => openDeleteDialog(goal.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Goal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">{goal.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Target: {format(new Date(goal.targetDate), 'dd MMM yyyy')}
                          </div>
                          
                          {goal.completionDate && (
                            <div className="flex items-center text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Completed: {format(new Date(goal.completionDate), 'dd MMM yyyy')}
                            </div>
                          )}
                        </div>
                        
                        {goal.ksbs && goal.ksbs.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Related KSBs:</p>
                            <div className="flex flex-wrap gap-1">
                              {goal.ksbs.map((ksb: any) => (
                                <Badge 
                                  key={ksb.id} 
                                  variant="outline" 
                                  className={
                                    ksb.type === 'knowledge' ? 'border-blue-200 bg-blue-50' :
                                    ksb.type === 'skill' ? 'border-green-200 bg-green-50' :
                                    'border-amber-200 bg-amber-50'
                                  }
                                >
                                  {ksb.code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Learning Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this learning goal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (selectedGoalId) {
                  try {
                    await apiRequest(`/api/learning-goals/${selectedGoalId}`, {
                      method: 'DELETE'
                    });
                    refetch();
                    setShowDeleteDialog(false);
                  } catch (error) {
                    console.error('Error deleting goal:', error);
                  }
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Skeleton loader for learning goals
function GoalSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to check if a date is before another
function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

// Helper function - More Horizontal icon
function MoreHorizontal(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}