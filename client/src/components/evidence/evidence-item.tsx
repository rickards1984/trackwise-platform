import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/status-badge";
import { File, FileText, Video, FileCode, MessageSquare, Download, Edit, ChevronLeft } from "lucide-react";
import { getUserInitials } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface KsbElement {
  id: number;
  type: string;
  code: string;
  description: string;
}

interface FeedbackComment {
  id: number;
  message: string;
  date: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl: string | null;
  };
}

interface EvidenceItemProps {
  id: number;
  title: string;
  description: string;
  evidenceType: string;
  submissionDate: string;
  status: string;
  fileUrl: string | null;
  ksbs: KsbElement[];
  feedback: FeedbackComment[];
  learnerId?: number;
  canEdit?: boolean;
}

export default function EvidenceItem({
  id,
  title,
  description,
  evidenceType,
  submissionDate,
  status,
  fileUrl,
  ksbs,
  feedback,
  canEdit = false
}: EvidenceItemProps) {
  
  const getEvidenceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document':
        return <FileText className="h-6 w-6" />;
      case 'video':
        return <Video className="h-6 w-6" />;
      case 'project':
        return <File className="h-6 w-6" />;
      default:
        return <File className="h-6 w-6" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };
  
  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };
  
  const getKsbTypeLabel = (type: string) => {
    switch(type.toLowerCase()) {
      case 'knowledge':
        return 'Knowledge';
      case 'skill':
        return 'Skill';
      case 'behavior':
        return 'Behavior';
      default:
        return type;
    }
  };
  
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'assessor':
        return 'Tutor';
      case 'iqa':
        return 'IQA';
      case 'training_provider':
        return 'Training Provider';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="mr-4" asChild>
            <Link href="/evidence">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Evidence
            </Link>
          </Button>
          <StatusBadge status={status} />
        </div>
        
        {canEdit && status !== 'approved' && (
          <Button size="sm" asChild>
            <Link href={`/evidence/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Evidence
            </Link>
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center">
            <div className="w-10 h-10 bg-primary-light rounded-md flex items-center justify-center text-primary mr-3">
              {getEvidenceTypeIcon(evidenceType)}
            </div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-neutral-500">
            Submitted: {formatDate(submissionDate)} ({getRelativeTime(submissionDate)})
          </div>
          
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="feedback">
                Feedback ({feedback.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <div className="p-4 bg-neutral-50 rounded-md text-neutral-700">
                  {description}
                </div>
              </div>
              
              {ksbs.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Linked KSBs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ksbs.map((ksb) => (
                      <div key={ksb.id} className="flex items-start p-3 border border-neutral-200 rounded-md">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-primary">
                          {ksb.type === 'knowledge' ? (
                            <FileText className="h-4 w-4" />
                          ) : ksb.type === 'skill' ? (
                            <FileCode className="h-4 w-4" />
                          ) : (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium">{ksb.code}: {ksb.description}</div>
                          <div className="text-xs text-neutral-500">{getKsbTypeLabel(ksb.type)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {fileUrl && (
                <div>
                  <h3 className="font-medium mb-2">Attached Evidence</h3>
                  <Button variant="outline" className="w-full justify-center py-8" asChild>
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-6 w-6 mr-2" />
                      Download Evidence File
                    </a>
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="feedback">
              <div className="space-y-4">
                {feedback.length > 0 ? (
                  feedback.map((item) => (
                    <div key={item.id} className="p-4 border border-neutral-200 rounded-lg">
                      <div className="flex items-start mb-3">
                        <Avatar className="h-10 w-10">
                          {item.sender.avatarUrl ? (
                            <AvatarImage src={item.sender.avatarUrl} alt={`${item.sender.firstName} ${item.sender.lastName}`} />
                          ) : (
                            <AvatarFallback>
                              {getUserInitials({
                                firstName: item.sender.firstName,
                                lastName: item.sender.lastName
                              } as any)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{item.sender.firstName} {item.sender.lastName}</p>
                              <p className="text-sm text-neutral-500">{getRoleDisplay(item.sender.role)}</p>
                            </div>
                            <p className="text-sm text-neutral-500">{getRelativeTime(item.date)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-neutral-50 p-3 rounded-md">
                        <p className="text-sm">{item.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-neutral-500">
                    <MessageSquare className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
                    <p>No feedback yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
