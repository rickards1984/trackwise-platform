import { useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  BookOpen,
  Video,
  Link as LinkIcon,
  Search,
  Download,
  ExternalLink,
  Tag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// This would come from the API in a real implementation
const mockResources = [
  {
    id: 1,
    title: "Digital Marketing Fundamentals Guide",
    description: "A comprehensive guide covering the basics of digital marketing strategy and implementation.",
    type: "document",
    url: "#",
    category: "marketing",
    dateAdded: "2023-05-01T00:00:00Z"
  },
  {
    id: 2,
    title: "SEO Best Practices 2023",
    description: "Learn the latest search engine optimization techniques to improve website visibility.",
    type: "document",
    url: "#",
    category: "seo",
    dateAdded: "2023-05-15T00:00:00Z"
  },
  {
    id: 3,
    title: "Introduction to Social Media Marketing",
    description: "Video tutorial explaining the fundamentals of creating effective social media campaigns.",
    type: "video",
    url: "#",
    category: "social",
    dateAdded: "2023-04-20T00:00:00Z"
  },
  {
    id: 4,
    title: "Content Creation Workshop",
    description: "Interactive workshop materials for developing engaging content across multiple platforms.",
    type: "document",
    url: "#",
    category: "content",
    dateAdded: "2023-05-10T00:00:00Z"
  },
  {
    id: 5,
    title: "Analytics Tools Comparison",
    description: "A detailed comparison of popular analytics platforms for digital marketing.",
    type: "document",
    url: "#",
    category: "analytics",
    dateAdded: "2023-05-05T00:00:00Z"
  },
  {
    id: 6,
    title: "Email Marketing Best Practices",
    description: "Guidelines and examples for creating effective email marketing campaigns.",
    type: "link",
    url: "https://example.com/email-marketing",
    category: "email",
    dateAdded: "2023-04-25T00:00:00Z"
  },
  {
    id: 7,
    title: "Web Analytics Fundamentals",
    description: "Video tutorial on understanding and implementing web analytics for business growth.",
    type: "video",
    url: "#",
    category: "analytics",
    dateAdded: "2023-05-18T00:00:00Z"
  },
  {
    id: 8,
    title: "Digital Advertising Platforms Guide",
    description: "Overview of major digital advertising platforms and their unique features.",
    type: "document",
    url: "#",
    category: "advertising",
    dateAdded: "2023-05-12T00:00:00Z"
  }
];

export default function Resources() {
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // This would be a real API call in production
  const { data: resources = mockResources, isLoading } = useQuery({
    queryKey: ['/api/resources'],
    // The real implementation would call the API
    queryFn: async () => {
      // Since this is a demo, just return the mock data
      return mockResources;
    },
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Filter resources based on search and active tab
  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchTerm === "" || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || resource.type === activeTab;
    
    return matchesSearch && matchesTab;
  });

  // Get icon for resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'link':
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Get action button based on resource type
  const getActionButton = (resource: any) => {
    switch (resource.type) {
      case 'document':
        return (
          <Button className="w-full" asChild>
            <a href={resource.url}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        );
      case 'video':
        return (
          <Button className="w-full" asChild>
            <a href={resource.url}>
              <Video className="mr-2 h-4 w-4" />
              Watch
            </a>
          </Button>
        );
      case 'link':
        return (
          <Button className="w-full" asChild>
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit
            </a>
          </Button>
        );
      default:
        return (
          <Button className="w-full" asChild>
            <a href={resource.url}>
              <BookOpen className="mr-2 h-4 w-4" />
              Open
            </a>
          </Button>
        );
    }
  };

  // Get color for category badge
  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, string> = {
      marketing: "bg-blue-100 text-blue-800",
      seo: "bg-green-100 text-green-800", 
      social: "bg-purple-100 text-purple-800",
      content: "bg-yellow-100 text-yellow-800",
      analytics: "bg-indigo-100 text-indigo-800",
      email: "bg-red-100 text-red-800",
      advertising: "bg-orange-100 text-orange-800"
    };
    
    return categoryColors[category] || "bg-neutral-100 text-neutral-800";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-neutral-900">Learning Resources</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Access resources to support your apprenticeship learning
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle>Resources Library</CardTitle>
                <CardDescription>
                  Browse resources to help with your apprenticeship
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                    <Input
                      type="text"
                      placeholder="Search resources..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 w-full md:w-auto">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="document">Documents</TabsTrigger>
                      <TabsTrigger value="video">Videos</TabsTrigger>
                      <TabsTrigger value="link">Links</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResources.length > 0 ? (
                      filteredResources.map((resource) => (
                        <Card key={resource.id} className="h-full flex flex-col">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="h-10 w-10 rounded-md bg-primary-light flex items-center justify-center text-primary">
                                {getResourceIcon(resource.type)}
                              </div>
                              <Badge className={cn("text-xs", getCategoryColor(resource.category))}>
                                <Tag className="h-3 w-3 mr-1" />
                                {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg mt-2">{resource.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2 flex-grow">
                            <p className="text-sm text-neutral-600">{resource.description}</p>
                          </CardContent>
                          <CardFooter className="flex justify-between border-t pt-4">
                            <div className="text-xs text-neutral-500">
                              Added {formatDate(resource.dateAdded)}
                            </div>
                            {getActionButton(resource)}
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-8 border rounded-md">
                        <div className="mx-auto h-12 w-12 text-neutral-300 mb-3 flex items-center justify-center">
                          <BookOpen className="h-10 w-10" />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 mb-1">No resources found</h3>
                        <p className="text-neutral-500 mb-4">
                          {searchTerm 
                            ? "Try adjusting your search term" 
                            : "There are no resources matching your selected filter"}
                        </p>
                        {searchTerm && (
                          <Button onClick={() => setSearchTerm("")} variant="outline">
                            Clear Search
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
