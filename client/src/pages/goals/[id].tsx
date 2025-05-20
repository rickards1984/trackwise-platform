import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  ArrowLeft, 
  Target, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User,
  Edit,
  X
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Form schema
const formSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  targetDate: z.date({
    required_error: "A target date is required.",
  }),
  status: z.enum(["active", "completed", "overdue"]),
  ksbIds: z.array(z.string()).optional(),
  tutorId: z.number().optional(),
});

export default function GoalDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [selectedKsbs, setSelectedKsbs] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Fetch goal details
  const {
    data: goal,
    isLoading: goalLoading,
    isError: goalError,
    refetch
  } = useQuery({
    queryKey: [`/api/learning-goals/${id}`],
    enabled: !!id,
  });
  
  // Get standard details to load KSBs
  const { data: standard, isLoading: standardLoading } = useQuery({
    queryKey: ['/api/standards', goal?.standardId],
    enabled: !!goal?.standardId,
  });
  
  // Get KSBs for the apprenticeship standard
  const { data: ksbs, isLoading: ksbsLoading } = useQuery({
    queryKey: ['/api/ksbs', standard?.id],
    enabled: !!standard?.id,
  });
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      targetDate: new Date(),
      status: "active" as const,
      ksbIds: [],
    },
  });
  
  // Update form when goal data is loaded
  useEffect(() => {
    if (goal) {
      form.reset({
        title: goal.title,
        description: goal.description,
        targetDate: new Date(goal.targetDate),
        status: goal.status as "active" | "completed" | "overdue",
        tutorId: goal.tutorId,
      });
      
      // Initialize selected KSBs
      if (goal.ksbs) {
        const ksbIds = goal.ksbs.map((ksb: any) => ksb.id.toString());
        setSelectedKsbs(ksbIds);
      }
    }
  }, [goal, form]);
  
  // Track form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle KSB selection
  const handleKsbSelect = (ksbId: string, checked: boolean) => {
    if (checked) {
      setSelectedKsbs([...selectedKsbs, ksbId]);
    } else {
      setSelectedKsbs(selectedKsbs.filter(id => id !== ksbId));
    }
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      // Add selected KSBs to form data
      const formData = {
        ...values,
        ksbIds: selectedKsbs,
      };
      
      // Submit the form
      await apiRequest(`/api/learning-goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Show success message
      toast({
        title: "Learning goal updated",
        description: "Your learning goal has been successfully updated.",
      });
      
      // Invalidate queries and exit edit mode
      queryClient.invalidateQueries({ queryKey: [`/api/learning-goals/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/learning-goals'] });
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error("Error updating learning goal:", error);
      toast({
        title: "Failed to update goal",
        description: "There was a problem updating your learning goal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Delete goal handler
  const handleDeleteGoal = async () => {
    try {
      await apiRequest(`/api/learning-goals/${id}`, {
        method: 'DELETE',
      });
      
      toast({
        title: "Goal deleted",
        description: "The learning goal has been successfully deleted.",
      });
      
      navigate('/goals');
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast({
        title: "Failed to delete goal",
        description: "There was a problem deleting this goal. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle goal completion toggle
  const handleToggleCompletion = async () => {
    try {
      const newStatus = goal.status === 'completed' ? 'active' : 'completed';
      
      await apiRequest(`/api/learning-goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      toast({
        title: newStatus === 'completed' ? "Goal marked as complete" : "Goal marked as active",
        description: newStatus === 'completed' 
          ? "Congratulations on completing your goal!" 
          : "The goal has been marked as active again.",
      });
      
      refetch();
    } catch (error) {
      console.error('Error updating goal status:', error);
      toast({
        title: "Failed to update status",
        description: "There was a problem updating the goal status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Group KSBs by type
  const ksbsByType = ksbs ? ksbs.reduce((acc: any, ksb: any) => {
    if (!acc[ksb.type]) {
      acc[ksb.type] = [];
    }
    acc[ksb.type].push(ksb);
    return acc;
  }, {}) : {};
  
  // Build KSB map for quick lookup
  const ksbMap = ksbs ? ksbs.reduce((acc: any, ksb: any) => {
    acc[ksb.id] = ksb;
    return acc;
  }, {}) : {};
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      default:
        return <Badge className="bg-blue-500">Active</Badge>;
    }
  };
  
  const isLoading = goalLoading || standardLoading || ksbsLoading;
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
              onClick={() => navigate("/goals")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Button>
          </div>
          
          {!isEditing && goal && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleToggleCompletion}
              >
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
              </Button>
              <Button 
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Goal
              </Button>
            </div>
          )}
          
          {isEditing && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold mt-4">
          {isEditing ? "Edit Learning Goal" : isLoading ? "Loading Goal..." : goal?.title}
        </h1>
        
        {!isEditing && goal && (
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(goal.status)}
            <span className="text-muted-foreground">
              Created on {format(new Date(goal.createdAt), 'dd MMM yyyy')}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : goalError ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load goal details. Please try again or go back to the goals list.
          </AlertDescription>
        </Alert>
      ) : isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Goal Details</CardTitle>
                <CardDescription>
                  Update your learning goal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Target Completion Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={
                                "w-full pl-3 text-left font-normal"
                              }
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* KSB Mapping */}
            {ksbs && ksbs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Related KSBs</CardTitle>
                  <CardDescription>
                    Link this goal to specific knowledge, skills, or behaviors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(ksbsByType).map(([type, typeKsbs]: [string, any]) => (
                      <div key={type} className="space-y-3">
                        <h3 className="font-medium capitalize">{type}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {typeKsbs.map((ksb: any) => (
                            <div key={ksb.id} className="flex items-start space-x-2">
                              <Checkbox 
                                id={`ksb-${ksb.id}`}
                                checked={selectedKsbs.includes(ksb.id.toString())}
                                onCheckedChange={(checked) => 
                                  handleKsbSelect(ksb.id.toString(), checked === true)
                                }
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label 
                                  htmlFor={`ksb-${ksb.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {ksb.code}: {ksb.description}
                                </Label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      ) : goal ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Goal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p>{goal.description}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Target Date</h3>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{format(new Date(goal.targetDate), "dd MMMM yyyy")}</span>
                  </div>
                </div>
                
                {goal.completionDate && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Completion Date</h3>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      <span>{format(new Date(goal.completionDate), "dd MMMM yyyy")}</span>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <div className="flex items-center">
                    {goal.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2 text-blue-500" />
                    )}
                    <span className="capitalize">{goal.status}</span>
                  </div>
                </div>
                
                {goal.tutor && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned Tutor</h3>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{goal.tutor.firstName} {goal.tutor.lastName}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {goal.ksbs && goal.ksbs.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Related KSBs</h3>
                  <div className="flex flex-wrap gap-1.5">
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
                        {ksb.code}: {ksb.description.length > 30 ? `${ksb.description.substring(0, 30)}...` : ksb.description}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
      
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
              onClick={handleDeleteGoal}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}