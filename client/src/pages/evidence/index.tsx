import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { OtjReminder } from "@/components/weekly-otj/OtjReminder";
import {
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  FileUp,
  Filter,
  FolderOpen,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Video,
  Target
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function EvidencePortfolio() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>(["draft", "submitted", "in_review", "approved", "needs_revision"]);
  const [activeTab, setActiveTab] = useState("all");
  const [evidenceToDelete, setEvidenceToDelete] = useState<number | null>(null);

  // Get evidence items
  const { data: evidenceItems, isLoading: evidenceLoading, refetch: refetchEvidence } = useQuery({
    queryKey: ["/api/evidence", user?.id],
    queryFn: () => apiRequest(`/api/evidence?learnerId=${user?.id}`),
    enabled: !!user,
  });

  // Get KSB elements for context
  const { data: ksbElements } = useQuery({
    queryKey: ["/api/ksbs"],
    enabled: !!user,
  });

  // Get evidence stats
  const evidenceStats = {
    total: evidenceItems?.length || 0,
    approved: evidenceItems?.filter((item: any) => item.status === "approved").length || 0,
    inReview: evidenceItems?.filter((item: any) => item.status === "in_review" || item.status === "submitted").length || 0,
    draft: evidenceItems?.filter((item: any) => item.status === "draft").length || 0,
    needsRevision: evidenceItems?.filter((item: any) => item.status === "needs_revision").length || 0
  };

  // Delete evidence mutation
  const deleteEvidenceMutation = useMutation({
    mutationFn: async (evidenceId: number) => {
      return apiRequest(`/api/evidence/${evidenceId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Evidence deleted",
        description: "The evidence item has been deleted successfully.",
      });
      
      setEvidenceToDelete(null);
      refetchEvidence();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete evidence. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteEvidence = (evidenceId: number) => {
    deleteEvidenceMutation.mutate(evidenceId);
  };

  // Filter evidence based on search and status
  const getFilteredEvidence = () => {
    if (!evidenceItems) return [];
    
    return evidenceItems.filter((item: any) => {
      const matchesSearch = searchQuery === "" || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus.includes(item.status);
      const matchesTab = 
        activeTab === "all" ||
        (activeTab === "approved" && item.status === "approved") ||
        (activeTab === "in-progress" && (item.status === "in_review" || item.status === "submitted")) ||
        (activeTab === "draft" && item.status === "draft") ||
        (activeTab === "needs-revision" && item.status === "needs_revision");
      
      return matchesSearch && matchesStatus && matchesTab;
    });
  };

  const filteredEvidence = getFilteredEvidence();

  // Get evidence type icon
  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Camera className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'presentation':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileUp className="h-4 w-4" />;
    }
  };

  // Get KSB counts by type
  const getKsbCounts = (ksbIds: number[]) => {
    if (!ksbElements || !ksbIds) return { knowledge: 0, skills: 0, behaviors: 0 };
    
    const knowledgeCount = ksbElements
      .filter((ksb: any) => ksb.type === "K" && ksbIds.includes(ksb.id))
      .length;
    
    const skillsCount = ksbElements
      .filter((ksb: any) => ksb.type === "S" && ksbIds.includes(ksb.id))
      .length;
    
    const behaviorsCount = ksbElements
      .filter((ksb: any) => ksb.type === "B" && ksbIds.includes(ksb.id))
      .length;
    
    return { knowledge: knowledgeCount, skills: skillsCount, behaviors: behaviorsCount };
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'submitted':
      case 'in_review':
        return 'secondary';
      case 'needs_revision':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        {/* Weekly OTJ Reminder */}
        {user && user.role === 'learner' && (
          <div className="mb-6">
            <OtjReminder userId={user.id} variant="compact" />
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Evidence Portfolio</h1>
            <p className="text-muted-foreground">
              Manage your evidence and track your progress
            </p>
          </div>
          <div>
            <Button
              className="gap-2"
              onClick={() => navigate("/evidence/add")}
            >
              <Plus className="h-4 w-4" /> Add Evidence
            </Button>
          </div>
        </div>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{evidenceStats.total}</div>
            <p className="text-sm text-muted-foreground">Evidence items submitted</p>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{evidenceStats.approved}</div>
            <p className="text-sm text-green-600/80">
              {Math.round((evidenceStats.approved / Math.max(1, evidenceStats.total)) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{evidenceStats.inReview}</div>
            <p className="text-sm text-blue-600/80">
              {Math.round((evidenceStats.inReview / Math.max(1, evidenceStats.total)) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-amber-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-700">Needs Revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{evidenceStats.needsRevision}</div>
            <p className="text-sm text-amber-600/80">
              {Math.round((evidenceStats.needsRevision / Math.max(1, evidenceStats.total)) * 100)}% of total
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Content area */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="in-progress">In Review</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="needs-revision">Needs Revision</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search evidence..."
                  className="pl-8 w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" /> Filter
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("draft")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "draft"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "draft"));
                      }
                    }}
                  >
                    Draft
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("submitted")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "submitted"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "submitted"));
                      }
                    }}
                  >
                    Submitted
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("in_review")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "in_review"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "in_review"));
                      }
                    }}
                  >
                    In Review
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("approved")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "approved"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "approved"));
                      }
                    }}
                  >
                    Approved
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterStatus.includes("needs_revision")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilterStatus([...filterStatus, "needs_revision"]);
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== "needs_revision"));
                      }
                    }}
                  >
                    Needs Revision
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <TabsContent value={activeTab} className="mt-6">
            {evidenceLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredEvidence.length > 0 ? (
              <div className="divide-y">
                {filteredEvidence.map((evidence: any) => {
                  const ksbCounts = getKsbCounts(evidence.ksbIds || []);
                  
                  return (
                    <div key={evidence.id} className="py-4 first:pt-0">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Thumbnail or preview */}
                        <div className="w-full md:w-1/6">
                          <div className="aspect-video rounded-md bg-muted flex items-center justify-center border">
                            {evidence.fileUrl ? (
                              evidence.evidenceType === "image" ? (
                                <img 
                                  src={evidence.fileUrl} 
                                  alt={evidence.title}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <FileUp className="h-8 w-8 text-muted-foreground" />
                              )
                            ) : (
                              <FileUp className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {/* Evidence details */}
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{evidence.title}</h3>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {evidence.evidenceType.replace('_', ' ')}
                                </Badge>
                                <Badge variant={getStatusBadgeVariant(evidence.status)} className="text-xs">
                                  {evidence.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="mt-2 sm:mt-0 flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => navigate(`/evidence/${evidence.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                              
                              {evidence.status === "draft" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => navigate(`/evidence/edit/${evidence.id}`)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                              )}
                              
                              {(evidence.status === "draft" || evidence.status === "needs_revision") && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-red-200 hover:border-red-300 hover:bg-red-50/50 text-red-600"
                                      onClick={() => setEvidenceToDelete(evidence.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                                      Delete
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Confirm Deletion</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete this evidence? This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2 sm:gap-0">
                                      <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                      </DialogClose>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => handleDeleteEvidence(evidence.id)}
                                        disabled={deleteEvidenceMutation.isPending}
                                      >
                                        {deleteEvidenceMutation.isPending ? 'Deleting...' : 'Delete Evidence'}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {evidence.description}
                          </p>
                          
                          <div className="mt-3 flex flex-wrap gap-3 items-center">
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(evidence.submissionDate), 'dd MMM yyyy')}
                            </div>
                            
                            <Separator orientation="vertical" className="h-4" />
                            
                            {/* KSB counts */}
                            <div className="flex flex-wrap gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                                      <BookOpen className="h-3 w-3" />
                                      <span>{ksbCounts.knowledge}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{ksbCounts.knowledge} Knowledge elements</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
                                      <Target className="h-3 w-3" />
                                      <span>{ksbCounts.skills}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{ksbCounts.skills} Skill elements</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                                      <User className="h-3 w-3" />
                                      <span>{ksbCounts.behaviors}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{ksbCounts.behaviors} Behavior elements</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            
                            {/* Verification status */}
                            {evidence.status !== "draft" && (
                              <>
                                <Separator orientation="vertical" className="h-4" />
                                <div className="flex items-center gap-1.5 text-xs">
                                  <div className={`h-2 w-2 rounded-full ${
                                    evidence.status === "approved" ? "bg-green-500" : 
                                    evidence.status === "needs_revision" ? "bg-red-500" : 
                                    "bg-amber-500"
                                  }`}></div>
                                  {evidence.status === "approved" ? (
                                    <span className="text-green-600">Approved</span>
                                  ) : evidence.status === "needs_revision" ? (
                                    <span className="text-red-600">Needs Revision</span>
                                  ) : (
                                    <span className="text-amber-600">Pending Review</span>
                                  )}
                                </div>
                              </>
                            )}
                            
                            {/* Feedback indicator */}
                            {evidence.feedbackId && (
                              <>
                                <Separator orientation="vertical" className="h-4" />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 text-xs font-medium text-purple-600">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        <span>Feedback available</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This evidence has feedback - click view to read it</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-md">
                <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No evidence found</h3>
                <p className="text-muted-foreground mt-1 mb-6">
                  {searchQuery ? "Try adjusting your search or filters" : "Start building your portfolio by adding evidence"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate("/evidence/add")}>
                    <Plus className="h-4 w-4 mr-2" /> Add Your First Evidence
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Help card */}
      <div className="mt-8">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evidence Portfolio Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>
                Your evidence portfolio demonstrates your knowledge, skills, and behaviors for your apprenticeship standard.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="border rounded-md p-3 bg-white">
                  <h4 className="font-medium text-sm flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    How to Submit Great Evidence
                  </h4>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Be specific and detailed in your descriptions</li>
                    <li>Link evidence to multiple KSBs where possible</li>
                    <li>Include reflections on what you've learned</li>
                    <li>Provide context about how this relates to your role</li>
                  </ul>
                </div>
                <div className="border rounded-md p-3 bg-white">
                  <h4 className="font-medium text-sm flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-amber-600" />
                    Evidence Lifecycle
                  </h4>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Draft - Save work in progress</li>
                    <li>Submitted - Sent for review</li>
                    <li>In Review - Being evaluated</li>
                    <li>Needs Revision - Updates required</li>
                    <li>Approved - Successfully completed</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/30">
            <Button 
              variant="outline" 
              className="text-xs w-full"
              onClick={() => navigate("/ksb-tracker")}
            >
              View KSB Tracker
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}