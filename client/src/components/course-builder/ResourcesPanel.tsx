import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, Link, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Resource {
  id: number;
  title: string;
  description: string;
  url: string;
  resourceType: string;
  ksbIds: number[];
  createdAt?: string;
}

interface ResourcesPanelProps {
  standardId: number;
  selectedKsbIds: number[];
  onAddResource?: (resource: Resource) => void;
}

export function ResourcesPanel({ standardId, selectedKsbIds, onAddResource }: ResourcesPanelProps) {
  // Fetch resources relevant to the selected standard
  const { data: resources, isLoading } = useQuery({
    queryKey: ["/api/resources", standardId],
    enabled: !!standardId,
  });

  // Filter resources to match selected KSBs
  const filteredResources = React.useMemo(() => {
    if (!resources || !selectedKsbIds.length) return [];
    
    return resources.filter((resource: Resource) => 
      resource.ksbIds.some(ksbId => selectedKsbIds.includes(ksbId))
    );
  }, [resources, selectedKsbIds]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Learning Resources</CardTitle>
        <CardDescription>
          Resources relevant to selected KSBs
          {selectedKsbIds.length > 0 && (
            <span className="ml-2">
              <Badge variant="outline">{selectedKsbIds.length} KSBs selected</Badge>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading resources...</p>
        ) : filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {selectedKsbIds.length === 0 
                ? "Select KSBs to see relevant resources" 
                : "No resources found for selected KSBs"}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-400px)] pr-4">
            <div className="space-y-4">
              {filteredResources.map((resource: Resource) => (
                <Card key={resource.id} className="border-muted">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{resource.title}</span>
                      <Badge variant="outline">{resource.resourceType}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                    <div className="flex justify-between items-center">
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm flex items-center text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Resource
                      </a>
                      {onAddResource && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => onAddResource(resource)}
                          className="h-7"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to Course
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}