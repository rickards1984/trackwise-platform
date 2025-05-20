import { useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/auth";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  List,
  Search,
  Cog,
  ArrowUpDown,
  UserPlus,
  Upload,
  Download
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // This would be a real API call in production
  const { data: learners = [], isLoading: isLoadingLearners } = useQuery({
    queryKey: ['/api/admin/learners'],
    // In a real app, this would fetch from the API
    queryFn: async () => {
      // Mock data for demonstration
      return [
        {
          id: 1,
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          standardTitle: "Digital Marketing Specialist",
          standardLevel: 4,
          progress: 68,
          status: "active",
          lastActivity: "2023-05-18T13:45:00Z"
        },
        {
          id: 2,
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@example.com",
          standardTitle: "Digital Marketing Specialist",
          standardLevel: 4,
          progress: 42,
          status: "active",
          lastActivity: "2023-05-17T10:30:00Z"
        },
        {
          id: 3,
          firstName: "Michael",
          lastName: "Johnson",
          email: "michael.j@example.com",
          standardTitle: "Software Developer",
          standardLevel: 4,
          progress: 85,
          status: "active",
          lastActivity: "2023-05-18T09:15:00Z"
        },
        {
          id: 4,
          firstName: "Emily",
          lastName: "Williams",
          email: "emily.w@example.com",
          standardTitle: "Digital Marketing Specialist",
          standardLevel: 4,
          progress: 23,
          status: "at_risk",
          lastActivity: "2023-05-10T14:20:00Z"
        },
        {
          id: 5,
          firstName: "David",
          lastName: "Brown",
          email: "david.b@example.com",
          standardTitle: "Software Developer",
          standardLevel: 4,
          progress: 91,
          status: "completed",
          lastActivity: "2023-05-18T11:10:00Z"
        }
      ];
    },
    enabled: !!user && (user.role === "admin" || user.role === "training_provider")
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Filter learners based on search
  const filteredLearners = learners.filter(learner => 
    learner.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learner.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learner.standardTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Convert timestamp to "time ago" format
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return "Just now";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Manage apprentices, standards, and track progress
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/admin/ilr">
                    <Upload className="mr-2 h-4 w-4" />
                    ILR Reports
                  </Link>
                </Button>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Apprentice
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Total Apprentices</p>
                      <p className="text-2xl font-bold text-neutral-900">42</p>
                    </div>
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Active Standards</p>
                      <p className="text-2xl font-bold text-neutral-900">8</p>
                    </div>
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Completion Rate</p>
                      <p className="text-2xl font-bold text-neutral-900">76%</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">At Risk</p>
                      <p className="text-2xl font-bold text-neutral-900">5</p>
                    </div>
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="apprentices" className="mb-6">
              <TabsList className="mb-4">
                <TabsTrigger value="apprentices" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Apprentices
                </TabsTrigger>
                <TabsTrigger value="standards" className="flex items-center">
                  <List className="h-4 w-4 mr-2" />
                  Standards
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center">
                  <Cog className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              {/* Apprentices Tab */}
              <TabsContent value="apprentices">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex justify-between items-center">
                      <span>Apprentice Management</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                        <Input
                          type="text"
                          placeholder="Search apprentices..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Select defaultValue="all">
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select defaultValue="all">
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Standard" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Standards</SelectItem>
                            <SelectItem value="digital_marketing">Digital Marketing</SelectItem>
                            <SelectItem value="software_dev">Software Development</SelectItem>
                            <SelectItem value="data_analyst">Data Analyst</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon">
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isLoadingLearners ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <>
                        {filteredLearners.length > 0 ? (
                          <div className="rounded-md border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Program</TableHead>
                                  <TableHead>Progress</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Last Activity</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredLearners.map((learner) => (
                                  <TableRow key={learner.id}>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <Avatar className="h-8 w-8 mr-3">
                                          <AvatarFallback>
                                            {getUserInitials({
                                              firstName: learner.firstName,
                                              lastName: learner.lastName
                                            } as any)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium">{learner.firstName} {learner.lastName}</div>
                                          <div className="text-xs text-neutral-500">{learner.email}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {learner.standardTitle} (L{learner.standardLevel})
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <div className="w-full max-w-[100px] bg-neutral-200 rounded-full h-2 mr-2">
                                          <div 
                                            className="h-2 rounded-full bg-primary"
                                            style={{ width: `${learner.progress}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-xs">{learner.progress}%</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <StatusBadge 
                                        status={
                                          learner.status === "active" ? "approved" :
                                          learner.status === "at_risk" ? "needs_revision" :
                                          learner.status === "completed" ? "completed" : "draft"
                                        } 
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm text-neutral-500">
                                        {timeAgo(learner.lastActivity)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="sm">
                                        View
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 border rounded-md">
                            <div className="mx-auto h-12 w-12 text-neutral-300 mb-3 flex items-center justify-center">
                              <Users className="h-10 w-10" />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-900 mb-1">No apprentices found</h3>
                            <p className="text-neutral-500 mb-4">
                              {searchTerm 
                                ? "Try adjusting your search term" 
                                : "There are no apprentices matching your selected filters"}
                            </p>
                            {searchTerm && (
                              <Button onClick={() => setSearchTerm("")} variant="outline">
                                Clear Search
                              </Button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Standards Tab */}
              <TabsContent value="standards">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex justify-between items-center">
                      <span>Apprenticeship Standards</span>
                      <Button size="sm">
                        <Upload className="mr-2 h-4 w-4" />
                        Add Standard
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Standard</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Active Learners</TableHead>
                            <TableHead>Min. OTJ Hours</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Digital Marketing Specialist</TableCell>
                            <TableCell>4</TableCell>
                            <TableCell>28</TableCell>
                            <TableCell>312</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Software Developer</TableCell>
                            <TableCell>4</TableCell>
                            <TableCell>14</TableCell>
                            <TableCell>360</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">Edit</Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Settings Tab */}
              <TabsContent value="settings">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Platform Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Data Management</h3>
                        <div className="flex flex-col md:flex-row gap-3">
                          <Button variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Import Data
                          </Button>
                          <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Export Data
                          </Button>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h3 className="font-medium mb-2">ILR Settings</h3>
                        <p className="text-sm text-neutral-500 mb-3">Configure ILR report generation settings</p>
                        <Button asChild>
                          <Link href="/admin/ilr">
                            Configure ILR Settings
                          </Link>
                        </Button>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h3 className="font-medium mb-2">User Management</h3>
                        <p className="text-sm text-neutral-500 mb-3">Manage staff accounts and permissions</p>
                        <Button variant="outline">
                          Manage Staff Access
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
