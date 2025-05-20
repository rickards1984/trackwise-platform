import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addDays, isBefore } from "date-fns";
import { OtjReminder } from "@/components/weekly-otj/OtjReminder";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  MoreHorizontal,
  PlusCircle,
  Star,
  Target,
  Trophy,
  User
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  // Get learner profile with standard information
  const { data: learnerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/learner-profile", user?.id],
    enabled: !!user,
  });

  // Get standards
  const { data: standard, isLoading: standardLoading } = useQuery({
    queryKey: ["/api/standards", learnerProfile?.standardId],
    enabled: !!learnerProfile?.standardId,
  });

  // Get KSB elements for progress tracking
  const { data: ksbElements, isLoading: ksbsLoading } = useQuery({
    queryKey: ["/api/ksbs", standard?.id],
    enabled: !!standard?.id,
  });

  // Get recent OTJ logs
  const { data: recentOtjLogs, isLoading: otjLogsLoading } = useQuery({
    queryKey: ["/api/otj-logs/recent", user?.id],
    queryFn: () => apiRequest(`/api/otj-logs/recent?userId=${user?.id}&limit=5`),
    enabled: !!user,
  });

  // Get recent evidence submissions
  const { data: recentEvidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ["/api/evidence/recent", user?.id],
    queryFn: () => apiRequest(`/api/evidence/recent?userId=${user?.id}&limit=5`),
    enabled: !!user,
  });

  // Get learning goals
  const { data: learningGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/learning-goals", user?.id],
    enabled: !!user,
  });

  // Get upcoming tasks
  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks", user?.id],
    enabled: !!user,
  });

  // Get learning resources
  const { data: learningResources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["/api/resources", standard?.id],
    enabled: !!standard?.id,
  });

  if (isLoading || profileLoading || standardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth/login");
    return null;
  }

  // Calculate KSB progress percentages
  const calculateKsbProgress = () => {
    if (!ksbElements) return { knowledge: 0, skills: 0, behaviors: 0, overall: 0 };
    
    const knowledgeTotal = ksbElements.filter((k: any) => k.type === "K").length;
    const skillsTotal = ksbElements.filter((k: any) => k.type === "S").length;
    const behaviorsTotal = ksbElements.filter((k: any) => k.type === "B").length;
    
    // In a real app, you'd get actual progress from completed evidence mapped to KSBs
    // For now, we'll use a mock calculation
    const knowledgeCompleted = Math.floor(knowledgeTotal * 0.65);
    const skillsCompleted = Math.floor(skillsTotal * 0.45);
    const behaviorsCompleted = Math.floor(behaviorsTotal * 0.55);
    
    const totalElements = knowledgeTotal + skillsTotal + behaviorsTotal;
    const totalCompleted = knowledgeCompleted + skillsCompleted + behaviorsCompleted;
    
    return {
      knowledge: knowledgeTotal ? Math.round((knowledgeCompleted / knowledgeTotal) * 100) : 0,
      skills: skillsTotal ? Math.round((skillsCompleted / skillsTotal) * 100) : 0,
      behaviors: behaviorsTotal ? Math.round((behaviorsCompleted / behaviorsTotal) * 100) : 0,
      overall: totalElements ? Math.round((totalCompleted / totalElements) * 100) : 0,
    };
  };

  // Calculate weekly OTJ progress
  const calculateWeeklyOtjProgress = () => {
    if (!recentOtjLogs || !standard) return { hours: 0, percentage: 0, target: 6 };
    
    const weeklyHours = recentOtjLogs.reduce((total: number, entry: any) => {
      if (entry.category === "otj") {
        return total + entry.hours;
      }
      return total;
    }, 0);
    
    const targetHours = standard.minimumOtjHours || 6;
    const percentage = Math.min(100, Math.round((weeklyHours / targetHours) * 100));
    
    return { hours: weeklyHours, percentage, target: targetHours };
  };

  // Check if tasks are due soon (within 3 days)
  const isTaskDueSoon = (dueDate: string) => {
    const today = new Date();
    const threeDaysFromNow = addDays(today, 3);
    const taskDate = new Date(dueDate);
    return isBefore(taskDate, threeDaysFromNow) && isBefore(today, taskDate);
  };

  const ksbProgress = calculateKsbProgress();
  const weeklyOtjProgress = calculateWeeklyOtjProgress();

  // Format name for display
  const displayName = user.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : user.email || 'Apprentice';

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user.firstName || 'Apprentice'}</h1>
        <p className="text-muted-foreground">
          Your apprenticeship learning dashboard
        </p>
        
        {/* Weekly OTJ Reminder - prominent on dashboard */}
        {user && user.role === 'learner' && (
          <div className="mt-4">
            <OtjReminder userId={user.id} />
          </div>
        )}
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left sidebar - User profile & quick stats */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <CardTitle className="text-lg font-semibold">My Profile</CardTitle>
                  <CardDescription>
                    {standard?.title || 'Apprenticeship'}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/profile")}
                >
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarImage src={user.avatarUrl || ''} alt={displayName} />
                  <AvatarFallback className="text-xl">
                    {user.firstName?.charAt(0) || 'A'}
                    {user.lastName?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{displayName}</h3>
                <p className="text-sm text-muted-foreground mb-2 capitalize">{user.role}</p>
                
                <div className="w-full mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Progress</span>
                    <span className="font-medium">{ksbProgress.overall}%</span>
                  </div>
                  <Progress value={ksbProgress.overall} className="h-2" />
                </div>

                <div className="flex gap-2 mt-4 justify-around w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-xs mt-1">Level 3</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your current achievement level</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-xs mt-1">7 Badges</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Badges earned through your journey</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-xs mt-1">42 Points</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Achievement points</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => navigate("/profile")}
              >
                View Full Profile
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Stats Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Progress Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Knowledge Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1 text-blue-500" />
                    <span>Knowledge</span>
                  </div>
                  <span className="font-medium">{ksbProgress.knowledge}%</span>
                </div>
                <Progress value={ksbProgress.knowledge} className="h-2 bg-blue-100" indicatorClassName="bg-blue-500" />
              </div>
              
              {/* Skills Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-1 text-green-500" />
                    <span>Skills</span>
                  </div>
                  <span className="font-medium">{ksbProgress.skills}%</span>
                </div>
                <Progress value={ksbProgress.skills} className="h-2 bg-green-100" indicatorClassName="bg-green-500" />
              </div>
              
              {/* Behaviors Progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1 text-amber-500" />
                    <span>Behaviors</span>
                  </div>
                  <span className="font-medium">{ksbProgress.behaviors}%</span>
                </div>
                <Progress value={ksbProgress.behaviors} className="h-2 bg-amber-100" indicatorClassName="bg-amber-500" />
              </div>
              
              {/* Weekly OTJ Hours */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-purple-500" />
                    <span>Weekly OTJ</span>
                  </div>
                  <span className="font-medium">{weeklyOtjProgress.hours}/{weeklyOtjProgress.target} hrs</span>
                </div>
                <Progress value={weeklyOtjProgress.percentage} className="h-2 bg-purple-100" indicatorClassName="bg-purple-500" />
              </div>
            </CardContent>
            <CardFooter className="pt-0 flex flex-col gap-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate("/ksb-tracker")}
              >
                View KSB Tracker
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => navigate("/otj-logs/weekly")}
              >
                <Clock className="h-4 w-4 mr-1" />
                Update Weekly Hours
              </Button>
            </CardFooter>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: "Completed First Project", icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, date: "2 days ago" },
                  { title: "Weekly OTJ Target Met", icon: <Clock className="h-5 w-5 text-purple-500" />, date: "1 week ago" },
                  { title: "Mastered Core Knowledge", icon: <BookOpen className="h-5 w-5 text-blue-500" />, date: "2 weeks ago" },
                ].map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                    <div className="bg-white rounded-full p-1 shadow-sm">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.date}</p>
                    </div>
                    <div>
                      <Badge variant="default" className="flex h-6 w-6 items-center justify-center rounded-full p-0">
                        <Star className="h-3 w-3" />
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
        <div className="lg:col-span-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <LayoutDashboard className="h-4 w-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="courses" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <BookOpen className="h-4 w-4 mr-2" /> My Learning
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <LineChart className="h-4 w-4 mr-2" /> Progress
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center text-blue-700">
                      <Clock className="h-4 w-4 mr-2" />
                      Log OTJ Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-blue-600">
                      {weeklyOtjProgress.hours >= weeklyOtjProgress.target 
                        ? "You've met your weekly target!" 
                        : `${weeklyOtjProgress.target - weeklyOtjProgress.hours} more hours needed this week`}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => navigate("/mobile")}
                    >
                      Log Hours
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="bg-green-50 border-green-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center text-green-700">
                      <FileUp className="h-4 w-4 mr-2" />
                      Add Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-green-600">
                      Submit work to demonstrate your skills and knowledge
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => navigate("/evidence/add")}
                    >
                      Upload Evidence
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card className="bg-purple-50 border-purple-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center text-purple-700">
                      <Target className="h-4 w-4 mr-2" />
                      Set Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-purple-600">
                      Create learning goals to focus your development
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => navigate("/goals")}
                    >
                      Manage Goals
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Upcoming Tasks & Deadlines */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">Upcoming Tasks</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8"
                      onClick={() => navigate("/tasks")}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : upcomingTasks && upcomingTasks.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingTasks.slice(0, 3).map((task: any, index: number) => (
                        <div 
                          key={index} 
                          className={`flex items-start gap-3 p-3 rounded-md border ${
                            isTaskDueSoon(task.dueDate) ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className={`p-2 rounded-full ${
                            isTaskDueSoon(task.dueDate) ? 'bg-amber-100' : 'bg-gray-100'
                          }`}>
                            <Calendar className={`h-4 w-4 ${
                              isTaskDueSoon(task.dueDate) ? 'text-amber-500' : 'text-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">{task.title}</p>
                              <Badge variant={isTaskDueSoon(task.dueDate) ? "outline" : "secondary"} className="text-xs h-5">
                                {format(new Date(task.dueDate), 'dd MMM')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {task.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 px-4">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <h3 className="font-medium text-lg mb-1">No upcoming tasks</h3>
                      <p className="text-sm text-muted-foreground">
                        Stay on track by adding tasks and setting deadlines
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate("/tasks")}
                      >
                        Create a Task
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* OTJ logs */}
                    {recentOtjLogs && recentOtjLogs.slice(0, 2).map((log: any, index: number) => (
                      <div key={`otj-${index}`} className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="text-sm font-medium">OTJ Hours Logged</h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.date), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.hours} hours - {log.activityType.replace('_', ' ')}
                          </p>
                          <p className="text-xs line-clamp-1 mt-1">{log.description}</p>
                        </div>
                      </div>
                    ))}

                    {/* Evidence submissions */}
                    {recentEvidence && recentEvidence.slice(0, 2).map((evidence: any, index: number) => (
                      <div key={`evidence-${index}`} className="flex items-start gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <FileUp className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h4 className="text-sm font-medium">{evidence.title}</h4>
                            <Badge variant={
                              evidence.status === 'approved' ? 'default' :
                              evidence.status === 'needs_revision' ? 'destructive' :
                              'secondary'
                            } className="text-xs h-5">
                              {evidence.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(evidence.submissionDate), 'dd MMM yyyy')} - {evidence.evidenceType}
                          </p>
                          <p className="text-xs line-clamp-1 mt-1">{evidence.description}</p>
                        </div>
                      </div>
                    ))}

                    {/* If no activities */}
                    {(!recentOtjLogs || recentOtjLogs.length === 0) && 
                     (!recentEvidence || recentEvidence.length === 0) && (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No recent activity found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm"
                    onClick={() => navigate("/activity")}
                  >
                    View All Activity
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{standard?.title || 'Your Apprenticeship'}</CardTitle>
                      <CardDescription>Level {standard?.level || '3'}</CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {ksbProgress.overall}% Complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Learning Modules</h3>
                      
                      <div className="space-y-3">
                        {[
                          { title: "Core Principles", progress: 85, modules: 5, status: "in-progress" },
                          { title: "Applied Skills", progress: 60, modules: 8, status: "in-progress" },
                          { title: "Professional Behaviors", progress: 40, modules: 4, status: "in-progress" },
                          { title: "Assessment Preparation", progress: 10, modules: 3, status: "not-started" },
                        ].map((module, index) => (
                          <div 
                            key={index} 
                            className="border rounded-md p-3 relative cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => navigate(`/modules/${index + 1}`)}
                          >
                            <div className="flex justify-between mb-2">
                              <h4 className="font-medium">{module.title}</h4>
                              <Badge variant={module.status === "in-progress" ? "secondary" : "outline"}>
                                {module.status === "not-started" ? "Not Started" : 
                                module.status === "in-progress" ? "In Progress" : "Completed"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <BookOpen className="h-4 w-4" />
                              <span>{module.modules} Lessons</span>
                            </div>
                            <Progress value={module.progress} className="h-2" />
                            <p className="text-xs text-right mt-1 text-muted-foreground">
                              {module.progress}% Complete
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/50 flex justify-between">
                  <Button variant="ghost" className="text-sm">
                    View All Modules
                  </Button>
                  <Button variant="default" className="text-sm">
                    Continue Learning
                  </Button>
                </CardFooter>
              </Card>

              {/* Learning Resources */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Learning Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {resourcesLoading ? (
                      <div className="col-span-2 flex items-center justify-center h-40">
                        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : learningResources && learningResources.length > 0 ? (
                      learningResources.slice(0, 4).map((resource: any, index: number) => (
                        <Card key={index} className="border shadow-sm">
                          <CardHeader className="p-3">
                            <CardTitle className="text-base">{resource.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {resource.description}
                            </p>
                          </CardContent>
                          <CardFooter className="p-3 pt-0 flex justify-between">
                            <Badge variant="outline" className="text-xs">
                              {resource.type || 'Document'}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              Open
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-10">
                        <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <h3 className="font-medium">No resources found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Resources will appear here when added by your tutor
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm"
                    onClick={() => navigate("/resources")}
                  >
                    View All Resources
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">KSB Achievement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* KSB Category Progress */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg bg-blue-50 border-blue-100">
                        <div className="flex justify-between items-start mb-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          <Badge variant="outline" className="bg-white">
                            {ksbProgress.knowledge}%
                          </Badge>
                        </div>
                        <h3 className="font-medium text-blue-800">Knowledge</h3>
                        <p className="text-xs text-blue-700 mt-1">Core understanding</p>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-green-50 border-green-100">
                        <div className="flex justify-between items-start mb-2">
                          <Target className="h-5 w-5 text-green-600" />
                          <Badge variant="outline" className="bg-white">
                            {ksbProgress.skills}%
                          </Badge>
                        </div>
                        <h3 className="font-medium text-green-800">Skills</h3>
                        <p className="text-xs text-green-700 mt-1">Applied abilities</p>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-amber-50 border-amber-100">
                        <div className="flex justify-between items-start mb-2">
                          <User className="h-5 w-5 text-amber-600" />
                          <Badge variant="outline" className="bg-white">
                            {ksbProgress.behaviors}%
                          </Badge>
                        </div>
                        <h3 className="font-medium text-amber-800">Behaviors</h3>
                        <p className="text-xs text-amber-700 mt-1">Professional conduct</p>
                      </div>
                    </div>

                    {/* KSB Breakdown */}
                    <div className="border rounded-md overflow-hidden mt-4">
                      <div className="bg-muted p-3 border-b">
                        <h3 className="font-medium">KSB Breakdown</h3>
                      </div>
                      <div className="p-3 max-h-[300px] overflow-y-auto">
                        {ksbsLoading ? (
                          <div className="flex items-center justify-center h-40">
                            <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        ) : ksbElements && ksbElements.length > 0 ? (
                          <div className="space-y-2">
                            {ksbElements.slice(0, 8).map((ksb: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                <div className="flex items-center">
                                  <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 ${
                                    ksb.type === 'K' ? 'bg-blue-100 text-blue-700' :
                                    ksb.type === 'S' ? 'bg-green-100 text-green-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {ksb.type}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{ksb.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {ksb.type === 'K' ? 'Knowledge' : 
                                       ksb.type === 'S' ? 'Skill' : 'Behavior'} {ksb.reference}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  {/* Status badge - random status for demo */}
                                  <Badge variant={
                                    index % 3 === 0 ? 'default' : 
                                    index % 3 === 1 ? 'secondary' : 'outline'
                                  }>
                                    {index % 3 === 0 ? 'Achieved' : 
                                     index % 3 === 1 ? 'In Progress' : 'Not Started'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-muted-foreground">No KSB elements found</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm"
                    onClick={() => navigate("/ksb-tracker")}
                  >
                    View Full KSB Tracker
                  </Button>
                </CardFooter>
              </Card>

              {/* Qualification Progress */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Qualification Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <div className="h-32 w-32 rounded-full border-8 border-primary/30 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{ksbProgress.overall}%</p>
                            <p className="text-xs text-muted-foreground">Complete</p>
                          </div>
                        </div>
                        <div 
                          className="absolute top-0 left-0 h-32 w-32 rounded-full border-8 border-transparent border-t-primary border-r-primary"
                          style={{ 
                            transform: `rotate(${ksbProgress.overall * 3.6}deg)`,
                            transition: 'transform 1s ease-in-out'
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-center p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center">
                          <GraduationCap className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <p className="font-medium">End Point Assessment</p>
                            <p className="text-xs text-muted-foreground">Estimated date: May 2025</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {ksbProgress.overall >= 90 ? 'Ready' : 'Preparing'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Gateway Requirements</h4>
                        <div className="space-y-1">
                          {[
                            { name: "Portfolio Complete", complete: ksbProgress.overall >= 85 },
                            { name: "Knowledge Test Preparation", complete: ksbProgress.knowledge >= 90 },
                            { name: "Functional Skills", complete: true },
                            { name: "Employer Confirmation", complete: false },
                          ].map((req, index) => (
                            <div key={index} className="flex items-center text-sm">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                                req.complete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {req.complete ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Clock className="h-4 w-4" />
                                )}
                              </div>
                              <span>{req.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar - Goals, Deadlines & Recommendations */}
        <div className="lg:col-span-3 space-y-4">
          {/* Learning Goals */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Learning Goals</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={() => navigate("/goals/add")}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Goal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : learningGoals && learningGoals.length > 0 ? (
                <div className="space-y-2">
                  {learningGoals.map((goal: any, index: number) => (
                    <div key={index} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-sm">{goal.title}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Edit Goal</DropdownMenuItem>
                            <DropdownMenuItem>Mark as Complete</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {goal.description}
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <Badge variant={
                          goal.status === 'completed' ? 'default' : 
                          goal.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {goal.status?.replace('_', ' ')}
                        </Badge>
                        <span className="text-muted-foreground">
                          Due {format(new Date(goal.dueDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <h3 className="font-medium">No goals set yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Setting goals helps track your learning progress
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/goals/add")}
                  >
                    Create Your First Goal
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate("/goals")}
              >
                View All Goals
              </Button>
            </CardFooter>
          </Card>

          {/* Recommended Resources */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recommended Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { title: "Essential Project Management", type: "Course", progress: 0 },
                  { title: "Technical Documentation Skills", type: "Tutorial", progress: 25 },
                  { title: "Communication for Professionals", type: "Video", progress: 50 },
                ].map((resource, index) => (
                  <div key={index} className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-sm">{resource.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {resource.type}
                      </Badge>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{resource.progress}%</span>
                      </div>
                      <Progress value={resource.progress} className="h-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate("/resources")}
              >
                View All Resources
              </Button>
            </CardFooter>
          </Card>

          {/* Upcoming Reviews */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: "Progress Review", date: addDays(new Date(), 12), status: "scheduled" },
                  { type: "Quarterly Assessment", date: addDays(new Date(), 25), status: "not_scheduled" },
                ].map((review, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border rounded-md ${
                      review.status === 'scheduled' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-sm">{review.type}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(review.date, 'dd MMMM yyyy')}
                        </p>
                      </div>
                      <Badge variant={review.status === 'scheduled' ? 'secondary' : 'outline'} className="text-xs">
                        {review.status === 'scheduled' ? 'Scheduled' : 'Not Scheduled'}
                      </Badge>
                    </div>
                    
                    {review.status === 'scheduled' && (
                      <Button 
                        variant="link" 
                        className="text-xs p-0 h-6 mt-1"
                        onClick={() => navigate("/calendar")}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate("/calendar")}
              >
                View Calendar
              </Button>
            </CardFooter>
          </Card>

          {/* AI Assistant Prompt */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center mr-2">
                  <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                </div>
                AI Learning Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Get personalized help with your learning journey. Ask questions, get recommendations, or request feedback.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => navigate("/ai-assistant")}
              >
                Talk to Assistant
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}