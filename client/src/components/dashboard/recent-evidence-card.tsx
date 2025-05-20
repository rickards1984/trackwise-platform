import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { File, FileText, Video, Upload, Image, FilePen } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";

export interface EvidenceItem {
  id: number;
  title: string;
  description: string;
  evidenceType: string;
  submissionDate: string;
  status: string;
  ksbs?: {
    id: number;
    type: string;
    code: string;
    description: string;
  }[];
}

interface RecentEvidenceCardProps {
  evidence: EvidenceItem[];
}

export default function RecentEvidenceCard({ evidence }: RecentEvidenceCardProps) {
  const getEvidenceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document':
        return <FileText className="text-sm" />;
      case 'video':
        return <Video className="text-sm" />;
      case 'image':
        return <Image className="text-sm" />;
      case 'presentation':
        return <FilePen className="text-sm" />;
      case 'project':
        return <File className="text-sm" />;
      default:
        return <File className="text-sm" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card className="md:col-span-2">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Recent Evidence</h3>
          <Button variant="ghost" className="text-primary hover:text-primary-dark" asChild>
            <Link href="/evidence/submit">
              Submit New <Upload className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="overflow-hidden">
          <div className="min-w-full rounded-md border">
            <div className="bg-neutral-50 px-6 py-3 border-b grid grid-cols-12 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              <div className="col-span-6 md:col-span-5">Title</div>
              <div className="hidden md:block col-span-2">Type</div>
              <div className="col-span-4 md:col-span-2">Status</div>
              <div className="hidden md:block col-span-2">Date</div>
              <div className="col-span-2 md:col-span-1 text-right">View</div>
            </div>
            
            <div className="divide-y divide-neutral-200 bg-white">
              {evidence.length > 0 ? (
                evidence.map((item) => (
                  <div key={item.id} className="px-6 py-4 grid grid-cols-12 items-center">
                    <div className="col-span-6 md:col-span-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded bg-primary-light flex items-center justify-center text-primary">
                          {getEvidenceTypeIcon(item.evidenceType)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-neutral-900 truncate max-w-[200px]">
                            {item.title}
                          </div>
                          <div className="text-xs text-neutral-500 truncate max-w-[200px]">
                            {item.ksbs && item.ksbs.length > 0 
                              ? `KSB: ${item.ksbs[0].code} - ${item.ksbs[0].description}`
                              : "No KSBs linked"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:block col-span-2 text-sm text-neutral-900">
                      {item.evidenceType}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="hidden md:block col-span-2 text-sm text-neutral-500">
                      {formatDate(item.submissionDate)}
                    </div>
                    <div className="col-span-2 md:col-span-1 text-right text-sm font-medium">
                      <Link href={`/evidence/${item.id}`}>
                        <a className="text-primary hover:text-primary-dark">View</a>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-sm text-neutral-500">
                  <File className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
                  <p>No evidence submitted yet</p>
                  <Button size="sm" className="mt-2" asChild>
                    <Link href="/evidence/submit">
                      Submit Evidence
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {evidence.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="link" className="text-primary hover:text-primary-dark" asChild>
              <Link href="/evidence">
                View All Evidence
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
