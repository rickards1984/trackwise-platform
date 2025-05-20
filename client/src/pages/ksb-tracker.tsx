import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileUp,
  Filter,
  Search,
  SlidersHorizontal,
  Target,
  User,
  Zap
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function KsbTracker() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["K", "S", "B"]);
  const [filterStatus, setFilterStatus] = useState<string[]>(["not_started", "in_progress", "completed"]);
  const [activeTab, setActiveTab] = useState("tracker");

  // Get learner profile
  const { data: learnerProfile } = useQuery({
    queryKey: ["/api/learner-profile", user?.id],
    enabled: !!user,
  });

  // Get standards
  const { data: standard } = useQuery({
    queryKey: ["/api/standards", learnerProfile?.standardId],
    enabled: !!learnerProfile?.standardId,
  });

  // Get KSB elements
  const { data: ksbElements, isLoading: ksbsLoading } = useQuery({
    queryKey: ["/api/ksbs", standard?.id],
    enabled: !!standard?.id,
  });

  // Get evidence items
  const { data: evidenceItems, isLoading: evidenceLoading } = useQuery({
    queryKey: ["/api/evidence", user?.id],
    enabled: !!user,
  });

  // Get recent OTJ logs that contribute to KSB progress
  const { data: recentOtjLogs, isLoading: otjLogsLoading } = useQuery({
    queryKey: ["/api/otj-logs/recent-with-ksbs", user?.id],
    queryFn: () => apiRequest(`/api/otj-logs/recent-with-ksbs?userId=${user?.id}&limit=10`),
    enabled: !!user,
  });

  if (isLoading) {
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

  // Calculate KSB progress
  const calculateProgress = (ksbId: number) => {
    if (!evidenceItems || evidenceItems.length === 0) return 0;
    
    // Count evidence items that map to this KSB
    const relevantEvidence = evidenceItems.filter((evidence: any) => 
      evidence.ksbIds && evidence.ksbIds.includes(ksbId) && 
      evidence.status === "approved"
    );
    
    // Simple progress calculation (can be made more sophisticated)
    const progress = Math.min(100, relevantEvidence.length * 25);
    return progress;
  };

  // Get KSB status based on evidence
  const getKsbStatus = (ksbId: number) => {
    const progress = calculateProgress(ksbId);
    if (progress >= 100) return "completed";
    if (progress > 0) return "in_progress";
    return "not_started";
  };

  // Filter KSBs based on search, type, and status
  const filteredKsbs = ksbElements 
    ? ksbElements.filter((ksb: any) => {
        const matchesSearch = searchQuery === "" || 
          ksb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ksb.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${ksb.type}${ksb.reference}`.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType = selectedTypes.includes(ksb.type);
        const matchesStatus = filterStatus.includes(getKsbStatus(ksb.id));
        
        return matchesSearch && matchesType && matchesStatus;
      })
    : [];

  // Update KSB status (for demo) - would connect to actual API
  const markKsbComplete = (ksbId: number) => {
    toast({
      title: "KSB status updated",
      description: "The KSB has been marked as completed",
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/ksbs"] });
  };

  // Find evidence that matches a KSB
  const getEvidenceForKsb = (ksbId: number) => {
    if (!evidenceItems) return [];
    
    return evidenceItems.filter((evidence: any) => 
      evidence.ksbIds && evidence.ksbIds.includes(ksbId)
    );
  };

  // Get OTJ logs that match a KSB
  const getOtjLogsForKsb = (ksbId: number) => {
    if (!recentOtjLogs) return [];
    
    return recentOtjLogs.filter((log: any) => 
      log.ksbIds && log.ksbIds.includes(ksbId)
    );
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Knowledge, Skills & Behaviors</h1>
            <p className="text-muted-foreground">
              Track your progress on all {standard?.title || 'apprenticeship'} KSBs
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/dashboard")}
            >
              Return to Dashboard
            </Button>
            <Button
              className="gap-2"
              onClick={() => navigate("/evidence/add")}
            >
              <FileUp className="h-4 w-4" /> Add Evidence
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracker">
            <SlidersHorizontal className="h-4 w-4 mr-2" /> KSB Tracker
          </TabsTrigger>
          <TabsTrigger value="summary">
            <Zap className="h-4 w-4 mr-2" /> Progress Summary
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tracker" className="space-y-4">
          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-1/3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search KSBs..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2 flex-1 justify-end">
              {/* KSB Type filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <BookOpen className="h-4 w-4" /> KSB Type
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={selectedTypes.includes("K")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes([...selectedTypes, "K"]);
                      } else {
                        setSelectedTypes(selectedTypes.filter(t => t !== "K"));
                      }
                    }}
                  >
                    Knowledge
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={selectedTypes.includes("S")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes([...selectedTypes, "S"]);
                      } else {
                        setSelectedTypes(selectedTypes.filter(t => t !== "S"));
                      }
                    }}
                  >
                    Skills
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={selectedTypes.includes("B")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes([...selectedTypes, "B"]);
                      } else {
                        setSelectedTypes(selectedTypes.filter(t => t !== "B"));
                      }
                    }}
                  >
                    Behaviors
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Status filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" /> Status
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("not_started")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "not_started"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "not_started"));
                      }
                    }}
                  >
                    Not Started
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("in_progress")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "in_progress"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "in_progress"));
                      }
                    }}
                  >
                    In Progress
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("completed")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "completed"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "completed"));
                      }
                    }}
                  >
                    Completed
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* KSB List */}
          <div className="space-y-3">
            {ksbsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredKsbs.length > 0 ? (
              filteredKsbs.map((ksb: any) => {
                const progress = calculateProgress(ksb.id);
                const status = getKsbStatus(ksb.id);
                const evidenceForKsb = getEvidenceForKsb(ksb.id);
                const otjLogsForKsb = getOtjLogsForKsb(ksb.id);
                
                return (
                  <Collapsible key={ksb.id} className="border rounded-md overflow-hidden">
                    <div className="bg-muted/30 p-4 flex items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                        ksb.type === 'K' ? 'bg-blue-100 text-blue-700' :
                        ksb.type === 'S' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {ksb.type === 'K' ? <BookOpen className="h-5 w-5" /> :
                         ksb.type === 'S' ? <Target className="h-5 w-5" /> :
                         <User className="h-5 w-5" />}
                      </div>
                      
                      <div className="flex-1 mr-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {ksb.type}{ksb.reference}: {ksb.title}
                            </h3>
                            <Badge variant={
                              status === 'completed' ? 'default' :
                              status === 'in_progress' ? 'secondary' :
                              'outline'
                            }>
                              {status === 'completed' ? 'Completed' :
                               status === 'in_progress' ? 'In Progress' :
                               'Not Started'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-2">{progress}%</span>
                            <div className="w-24 hidden sm:block">
                              <Progress value={progress} className="h-2" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-1 sm:hidden">
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                      
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="group">
                          <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="p-4 border-t">
                        {/* KSB details */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-1">Description</h4>
                          <p className="text-sm text-muted-foreground">
                            {ksb.description || 'No description available for this KSB.'}
                          </p>
                        </div>
                        
                        {/* Evidence related to this KSB */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Related Evidence</h4>
                          {evidenceForKsb.length > 0 ? (
                            <div className="space-y-2">
                              {evidenceForKsb.map((evidence: any, index: number) => (
                                <div key={index} className="border rounded-md p-3 bg-muted/20">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium text-sm">{evidence.title}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(evidence.submissionDate), 'dd MMM yyyy')}
                                      </div>
                                    </div>
                                    <Badge variant={
                                      evidence.status === 'approved' ? 'default' :
                                      evidence.status === 'needs_revision' ? 'destructive' :
                                      evidence.status === 'submitted' ? 'secondary' :
                                      'outline'
                                    } className="text-xs">
                                      {evidence.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/20">
                              No evidence submitted for this KSB yet.
                            </div>
                          )}
                        </div>
                        
                        {/* OTJ logs related to this KSB */}
                        {otjLogsForKsb.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Related OTJ Activities</h4>
                            <div className="space-y-2">
                              {otjLogsForKsb.map((log: any, index: number) => (
                                <div key={index} className="border rounded-md p-3 bg-muted/20">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-medium text-sm">{log.activityType.replace('_', ' ')} ({log.hours} hrs)</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {format(new Date(log.date), 'dd MMM yyyy')}
                                      </div>
                                      <div className="text-xs mt-1 line-clamp-2">{log.description}</div>
                                    </div>
                                    <Badge variant={
                                      log.verifiedByTutor && log.verifiedByEmployer ? 'default' :
                                      log.verifiedByTutor || log.verifiedByEmployer ? 'secondary' :
                                      'outline'
                                    } className="text-xs">
                                      {log.verifiedByTutor && log.verifiedByEmployer ? 'Verified' :
                                       log.verifiedByTutor || log.verifiedByEmployer ? 'Partially Verified' :
                                       'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate("/evidence/add?ksbId=" + ksb.id)}
                          >
                            <FileUp className="h-4 w-4 mr-2" />
                            Add Evidence
                          </Button>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => markKsbComplete(ksb.id)}
                                  disabled={status === 'completed'}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as Complete
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marks this KSB as completed. Normally this would be done by your assessor.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            ) : (
              <div className="text-center py-8 border rounded-md">
                <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-medium text-lg">No KSBs match your filters</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedTypes(["K", "S", "B"]);
                    setFilterStatus(["not_started", "in_progress", "completed"]);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="summary" className="space-y-4">
          {/* Progress summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-32 w-32 rounded-full border-8 border-primary/30 flex items-center justify-center">
                      <div className="text-center">
                        {ksbsLoading ? (
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        ) : (
                          <>
                            <p className="text-2xl font-bold">
                              {filteredKsbs.length > 0 ? 
                                Math.round(filteredKsbs.reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) / filteredKsbs.length) : 
                                0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Complete</p>
                          </>
                        )}
                      </div>
                    </div>
                    {!ksbsLoading && filteredKsbs.length > 0 && (
                      <div 
                        className="absolute top-0 left-0 h-32 w-32 rounded-full border-8 border-transparent border-t-primary border-r-primary"
                        style={{ 
                          transform: `rotate(${Math.round(filteredKsbs.reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) / filteredKsbs.length) * 3.6}deg)`,
                          transition: 'transform 1s ease-in-out'
                        }}
                      ></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Knowledge Progress */}
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-700" />
                  Knowledge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {ksbsLoading ? "..." : 
                        filteredKsbs.filter((ksb: any) => ksb.type === "K").length > 0 ?
                          Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "K")
                            .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                            / filteredKsbs.filter((ksb: any) => ksb.type === "K").length) :
                          0}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={ksbsLoading ? 0 : 
                      filteredKsbs.filter((ksb: any) => ksb.type === "K").length > 0 ?
                        Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "K")
                          .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                          / filteredKsbs.filter((ksb: any) => ksb.type === "K").length) :
                        0
                    } 
                    className="h-2 bg-blue-200" 
                    indicatorClassName="bg-blue-600" 
                  />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total KSBs</span>
                    <span>{ksbsLoading ? "..." : filteredKsbs.filter((ksb: any) => ksb.type === "K").length}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Completed</span>
                    <span>
                      {ksbsLoading ? "..." : 
                        filteredKsbs.filter((ksb: any) => 
                          ksb.type === "K" && getKsbStatus(ksb.id) === "completed"
                        ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Skills Progress */}
            <Card className="bg-green-50 border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Target className="h-5 w-5 mr-2 text-green-700" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {ksbsLoading ? "..." : 
                        filteredKsbs.filter((ksb: any) => ksb.type === "S").length > 0 ?
                          Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "S")
                            .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                            / filteredKsbs.filter((ksb: any) => ksb.type === "S").length) :
                          0}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={ksbsLoading ? 0 : 
                      filteredKsbs.filter((ksb: any) => ksb.type === "S").length > 0 ?
                        Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "S")
                          .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                          / filteredKsbs.filter((ksb: any) => ksb.type === "S").length) :
                        0
                    } 
                    className="h-2 bg-green-200" 
                    indicatorClassName="bg-green-600" 
                  />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total KSBs</span>
                    <span>{ksbsLoading ? "..." : filteredKsbs.filter((ksb: any) => ksb.type === "S").length}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Completed</span>
                    <span>
                      {ksbsLoading ? "..." : 
                        filteredKsbs.filter((ksb: any) => 
                          ksb.type === "S" && getKsbStatus(ksb.id) === "completed"
                        ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Behaviors Progress */}
            <Card className="bg-amber-50 border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2 text-amber-700" />
                  Behaviors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {ksbsLoading ? "..." : 
                        filteredKsbs.filter((ksb: any) => ksb.type === "B").length > 0 ?
                          Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "B")
                            .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                            / filteredKsbs.filter((ksb: any) => ksb.type === "B").length) :
                          0}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={ksbsLoading ? 0 : 
                      filteredKsbs.filter((ksb: any) => ksb.type === "B").length > 0 ?
                        Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "B")
                          .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                          / filteredKsbs.filter((ksb: any) => ksb.type === "B").length) :
                        0
                    } 
                    className="h-2 bg-amber-200" 
                    indicatorClassName="bg-amber-600" 
                  />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Total KSBs</span>
                    <span>{ksbsLoading ? "..." : filteredKsbs.filter((ksb: any) => ksb.type === "B").length}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Completed</span>
                    <span>
                      {ksbsLoading ? "..." : 
                        filteredKsbs.filter((ksb: any) => 
                          ksb.type === "B" && getKsbStatus(ksb.id) === "completed"
                        ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Evidence */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Evidence Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {evidenceLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : evidenceItems && evidenceItems.length > 0 ? (
                <div className="space-y-3">
                  {evidenceItems.slice(0, 5).map((evidence: any, index: number) => (
                    <div key={index} className="flex justify-between items-start p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{evidence.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {format(new Date(evidence.submissionDate), 'dd MMM yyyy')} · {evidence.evidenceType}
                        </div>
                        
                        {/* KSBs covered by this evidence */}
                        {evidence.ksbIds && evidence.ksbIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {evidence.ksbIds.map((ksbId: number) => {
                              const ksb = ksbElements?.find((k: any) => k.id === ksbId);
                              return ksb ? (
                                <Badge key={ksbId} variant="outline" className="text-xs">
                                  {ksb.type}{ksb.reference}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                      
                      <Badge variant={
                        evidence.status === 'approved' ? 'default' :
                        evidence.status === 'needs_revision' ? 'destructive' :
                        evidence.status === 'submitted' ? 'secondary' :
                        'outline'
                      }>
                        {evidence.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-md">
                  <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <h3 className="font-medium">No evidence submitted yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Submit evidence to demonstrate your skills and knowledge
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/evidence/add")}
                  >
                    Add Your First Evidence
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Gateway Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">End Point Assessment Gateway</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Track your progress towards End Point Assessment gateway requirements
                </p>
                
                <div className="space-y-3">
                  {[
                    { name: "Complete all Knowledge elements", 
                      criteria: "All Knowledge KSBs must be completed", 
                      progress: ksbsLoading ? 0 : 
                        filteredKsbs.filter((ksb: any) => ksb.type === "K").length > 0 ?
                          Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "K")
                            .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                            / filteredKsbs.filter((ksb: any) => ksb.type === "K").length) :
                          0,
                      complete: false
                    },
                    { name: "Complete all Skills elements", 
                      criteria: "All Skills KSBs must be completed", 
                      progress: ksbsLoading ? 0 : 
                        filteredKsbs.filter((ksb: any) => ksb.type === "S").length > 0 ?
                          Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "S")
                            .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                            / filteredKsbs.filter((ksb: any) => ksb.type === "S").length) :
                          0,
                      complete: false
                    },
                    { name: "Complete all Behavior elements", 
                      criteria: "All Behavior KSBs must be completed", 
                      progress: ksbsLoading ? 0 : 
                        filteredKsbs.filter((ksb: any) => ksb.type === "B").length > 0 ?
                          Math.round(filteredKsbs.filter((ksb: any) => ksb.type === "B")
                            .reduce((sum: number, ksb: any) => sum + calculateProgress(ksb.id), 0) 
                            / filteredKsbs.filter((ksb: any) => ksb.type === "B").length) :
                          0,
                      complete: false
                    },
                    { name: "Meet required OTJ hours", 
                      criteria: "20% of total apprenticeship duration", 
                      progress: 65,
                      complete: false
                    },
                    { name: "Functional skills qualifications", 
                      criteria: "Maths & English Level 2", 
                      progress: 100,
                      complete: true
                    },
                    { name: "Employer confirmation", 
                      criteria: "Employer must confirm readiness", 
                      progress: 0,
                      complete: false
                    },
                  ].map((requirement, index) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium flex items-center">
                            {requirement.complete ? (
                              <Check className="h-4 w-4 mr-1 text-green-600" />
                            ) : (
                              <div className={`h-2 w-2 rounded-full mr-2 ${
                                requirement.progress >= 100 ? 'bg-green-600' :
                                requirement.progress > 0 ? 'bg-amber-500' :
                                'bg-gray-300'
                              }`} />
                            )}
                            {requirement.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {requirement.criteria}
                          </p>
                        </div>
                        <Badge variant={requirement.complete ? 'default' : 'outline'}>
                          {requirement.complete ? 'Complete' : 'In Progress'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{requirement.progress}%</span>
                        </div>
                        <Progress value={requirement.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}