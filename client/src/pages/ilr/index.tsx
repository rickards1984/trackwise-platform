import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { FileUp, PenLine, Table, FileText, BarChart4 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ILRIndexPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // State for ILR export dialog
  const [exportAcademicYear, setExportAcademicYear] = useState("2024-25");
  const [exportReturnPeriod, setExportReturnPeriod] = useState("01");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch recent uploads
  const { data: recentUploads, isLoading: isLoadingUploads } = useQuery({
    queryKey: ["/api/ilr/recent-uploads"],
    enabled: isAuthenticated,
  });
  
  // Extract the latestReturns from recentUploads
  const latestReturns = recentUploads?.uploads || [];

  // Fetch learner counts
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Fetch learner statistics
  const { data: learnerStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/ilr/stats"],
    enabled: isAuthenticated,
  });
  
  // Fetch learner records with filters and pagination
  const { data: learnerData, isLoading: isLoadingLearners } = useQuery({
    queryKey: ["/api/ilr/learners", { search: searchTerm, status: statusFilter, page: currentPage, limit: pageSize }],
    enabled: isAuthenticated && activeTab === "learners",
  });
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-6">Please log in to access the ILR management system.</p>
        <Button onClick={() => navigate("/auth/login")}>
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ILR Management</h1>
          <p className="text-gray-600">
            Individualized Learner Record (ILR) management for ESFA reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => navigate("/ilr/manual-entry")}
          >
            <PenLine className="h-4 w-4" />
            Manual Entry
          </Button>
          <Button 
            className="flex items-center gap-2"
            onClick={() => navigate("/ilr/upload")}
          >
            <FileUp className="h-4 w-4" />
            Upload ILR
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="learners">Learner Records</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Active Learners</CardTitle>
                <CardDescription>Current active apprentices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoadingStats ? "..." : learnerStats?.activeLearners || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Latest Return</CardTitle>
                <CardDescription>Most recent ILR submission</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoadingUploads ? "..." : recentUploads?.latestReturn || "No submissions"}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {isLoadingUploads ? "" : recentUploads?.latestReturnDate ? 
                    `Submitted on ${new Date(recentUploads.latestReturnDate).toLocaleDateString()}` : 
                    "No recent submissions"}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Next Return</CardTitle>
                <CardDescription>Upcoming ILR return deadline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  R08
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Due by April 6, 2025
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent ILR Activity</CardTitle>
                  <CardDescription>Latest uploads and validation results</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingUploads ? (
                    <div className="text-center py-6">Loading recent activity...</div>
                  ) : !recentUploads?.uploads || recentUploads.uploads.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
                      <p>No recent ILR uploads found</p>
                      <p className="text-sm mt-1">Upload your first ILR file to get started</p>
                      <Button 
                        className="mt-4"
                        onClick={() => navigate("/ilr/upload")}
                      >
                        Upload ILR File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentUploads.uploads.map((upload: any, index: number) => (
                        <div key={index} className="border rounded-md p-4 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{upload.filename}</p>
                            <p className="text-sm text-gray-500">
                              {upload.academicYear} • R{upload.returnPeriod.toString().padStart(2, '0')} • 
                              {new Date(upload.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              upload.status === 'complete' ? 'bg-green-100 text-green-800' :
                              upload.status === 'error' ? 'bg-red-100 text-red-800' :
                              upload.status === 'validating' ? 'bg-blue-100 text-blue-800' :
                              upload.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/ilr/uploads/${upload.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setActiveTab("history")}
                  >
                    View All Upload History
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                  <CardDescription>Common ILR tools & resources</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/ilr/manual-entry")}
                  >
                    <PenLine className="h-4 w-4 mr-2" />
                    Manual Entry Form
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/ilr/upload")}
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    Upload ILR File
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/ilr/learners")}
                  >
                    <Table className="h-4 w-4 mr-2" />
                    View Learner Records
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate("/ilr/reports")}
                  >
                    <BarChart4 className="h-4 w-4 mr-2" />
                    ILR Reports
                  </Button>
                </CardContent>
                <CardFooter className="flex-col items-start space-y-4">
                  <div className="w-full">
                    <p className="text-sm font-medium mb-2">Export ILR Data</p>
                    <div className="flex flex-col space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          // Get current academic year and return period from state or latest upload
                          const currentReturn = latestReturns && latestReturns[0] ? latestReturns[0] : null;
                          const academicYear = currentReturn?.academicYear || "2024-25";
                          const returnPeriod = currentReturn?.returnPeriod?.toString().padStart(2, "0") || "01";
                          
                          window.open(`/api/ilr/export?academicYear=${academicYear}&returnPeriod=${returnPeriod}`, '_blank');
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Export Current ILR Return
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Export Custom ILR
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Export ILR Data</DialogTitle>
                            <DialogDescription>
                              Select the academic year and return period to export
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="academicYear" className="text-right">
                                Academic Year
                              </Label>
                              <Select defaultValue="2024-25" onValueChange={(value) => setExportAcademicYear(value)}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2024-25">2024-25</SelectItem>
                                  <SelectItem value="2023-24">2023-24</SelectItem>
                                  <SelectItem value="2022-23">2022-23</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="returnPeriod" className="text-right">
                                Return Period
                              </Label>
                              <Select defaultValue="01" onValueChange={(value) => setExportReturnPeriod(value)}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="01">R01 (Aug)</SelectItem>
                                  <SelectItem value="02">R02 (Sep)</SelectItem>
                                  <SelectItem value="03">R03 (Oct)</SelectItem>
                                  <SelectItem value="04">R04 (Nov)</SelectItem>
                                  <SelectItem value="05">R05 (Dec)</SelectItem>
                                  <SelectItem value="06">R06 (Jan)</SelectItem>
                                  <SelectItem value="07">R07 (Feb)</SelectItem>
                                  <SelectItem value="08">R08 (Mar)</SelectItem>
                                  <SelectItem value="09">R09 (Apr)</SelectItem>
                                  <SelectItem value="10">R10 (May)</SelectItem>
                                  <SelectItem value="11">R11 (Jun)</SelectItem>
                                  <SelectItem value="12">R12 (Jul)</SelectItem>
                                  <SelectItem value="13">R13 (Year-End)</SelectItem>
                                  <SelectItem value="14">R14 (Final)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => {
                              window.open(`/api/ilr/export?academicYear=${exportAcademicYear}&returnPeriod=${exportReturnPeriod}`, '_blank');
                              setDialogOpen(false);
                            }}>Export ILR</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  <div className="w-full">
                    <p className="text-sm font-medium mb-2">External Resources</p>
                    <div className="text-sm text-blue-600 space-y-1 w-full">
                      <a href="https://guidance.submit-learner-data.service.gov.uk/current" target="_blank" rel="noopener" className="block hover:underline">
                        ILR Specification 2024/25
                      </a>
                      <a href="https://submit-learner-data.service.gov.uk/" target="_blank" rel="noopener" className="block hover:underline">
                        ESFA Submit Learner Data
                      </a>
                      <a href="https://www.gov.uk/government/collections/individualised-learner-record-ilr" target="_blank" rel="noopener" className="block hover:underline">
                        Gov.uk ILR Guidance
                      </a>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Learner Records Tab */}
        <TabsContent value="learners">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:items-center">
              <div>
                <CardTitle>Learner Records</CardTitle>
                <CardDescription>
                  View all learner records from ILR submissions
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Input 
                  placeholder="Search learners..."
                  className="w-full sm:w-64"
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                />
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1); // Reset to first page on filter change
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Learner records table */}
              {isLoadingLearners ? (
                <div className="py-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mb-4"></div>
                  <p>Loading learner records...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ULN</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {learnerData?.learners && learnerData.learners.length > 0 ? (
                        learnerData.learners.map((learner: any) => (
                          <tr key={learner.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {`${learner.lastName}, ${learner.firstName}`}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(learner.dateOfBirth).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{learner.uln}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{learner.employerName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(learner.startDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                learner.status === 'active' ? 'bg-green-100 text-green-800' :
                                learner.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                learner.status === 'withdrawn' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {learner.status.charAt(0).toUpperCase() + learner.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/ilr/learners/${learner.id}`)}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center">
                            <p className="text-gray-500">No learner records found</p>
                            <p className="text-sm text-gray-500 mt-1">
                              Try adjusting your search or upload a new ILR file
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination controls */}
              {learnerData?.totalLearners > 0 && (
                <div className="flex items-center justify-between py-4">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((learnerData.currentPage - 1) * learnerData.pageSize) + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(learnerData.currentPage * learnerData.pageSize, learnerData.totalLearners)}
                    </span>{" "}
                    of <span className="font-medium">{learnerData.totalLearners}</span> results
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={learnerData?.totalPages ? currentPage >= learnerData.totalPages : true}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Upload History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>ILR Upload History</CardTitle>
              <CardDescription>
                Complete history of all ILR file uploads and validation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUploads ? (
                <div className="text-center py-6">Loading upload history...</div>
              ) : !recentUploads?.uploads || recentUploads.uploads.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 mb-3 opacity-30" />
                  <p>No ILR upload history found</p>
                  <p className="text-sm mt-1">Upload your first ILR file to get started</p>
                  <Button 
                    className="mt-4"
                    onClick={() => navigate("/ilr/upload")}
                  >
                    Upload ILR File
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ILR Return
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upload Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Learner Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentUploads.uploads.map((upload: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-gray-400" />
                              <div className="text-sm font-medium text-gray-900">{upload.filename}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{upload.academicYear} R{upload.returnPeriod.toString().padStart(2, '0')}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{new Date(upload.uploadDate).toLocaleDateString()}</div>
                            <div className="text-sm text-gray-500">{new Date(upload.uploadDate).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              upload.status === 'complete' ? 'bg-green-100 text-green-800' :
                              upload.status === 'error' ? 'bg-red-100 text-red-800' :
                              upload.status === 'validating' ? 'bg-blue-100 text-blue-800' :
                              upload.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {upload.learnerCount || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/ilr/uploads/${upload.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}