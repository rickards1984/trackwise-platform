import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ArrowLeft, 
  FileCog, 
  Users, 
  AlertTriangle,
  CheckCircle, 
  Clock,
  XCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

// Status badge component (reused from index)
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case 'validating':
      return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Validating</Badge>;
    case 'processing':
      return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</Badge>;
    case 'complete':
      return <Badge className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="h-3 w-3" /> Complete</Badge>;
    case 'error':
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

// Severity badge component for validation results
const SeverityBadge = ({ severity }: { severity: string }) => {
  switch (severity.toLowerCase()) {
    case 'error':
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Error</Badge>;
    case 'warning':
      return <Badge className="flex items-center gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200"><AlertTriangle className="h-3 w-3" /> Warning</Badge>;
    case 'info':
      return <Badge variant="outline" className="flex items-center gap-1">Info</Badge>;
    default:
      return <Badge>{severity}</Badge>;
  }
};

export default function IlrFileDetails() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, params] = useRoute<{ id: string }>("/admin/ilr/:id");
  const fileId = params?.id || "";
  
  const [activeTab, setActiveTab] = useState("overview");
  const [learnerPage, setLearnerPage] = useState(1);
  const [learnerLimit] = useState(10);

  // Check if user has access to ILR tools
  const hasAccess = isAuthenticated && 
    ['admin', 'training_provider', 'assessor', 'iqa', 'operations'].includes(user?.role || '');

  // Fetch ILR file details
  const { 
    data: fileData, 
    isLoading: fileLoading, 
    isError: fileError 
  } = useQuery({
    queryKey: [`/api/v2/ilr/files/${fileId}`],
    enabled: hasAccess && Boolean(fileId) && !authLoading,
  });

  // Fetch validation results
  const { 
    data: validationData, 
    isLoading: validationLoading,
    isError: validationError
  } = useQuery({
    queryKey: [`/api/v2/ilr/files/${fileId}/validation`],
    enabled: hasAccess && Boolean(fileId) && !authLoading && activeTab === "validation",
  });

  // Fetch learner records with pagination
  const { 
    data: learnersData, 
    isLoading: learnersLoading,
    isError: learnersError
  } = useQuery({
    queryKey: [`/api/v2/ilr/files/${fileId}/learners`, learnerPage, learnerLimit],
    enabled: hasAccess && Boolean(fileId) && !authLoading && activeTab === "learners",
  });

  if (authLoading || fileLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !hasAccess) {
    return (
      <Card className="mx-auto my-8 max-w-4xl">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access the ILR Management tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This area is restricted to administrators, training providers, assessors, and IQA staff.
          </p>
          <Link href="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (fileError || !fileData) {
    return (
      <Card className="mx-auto my-8 max-w-4xl">
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load ILR file details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            The requested ILR file could not be found or there was an error retrieving the data.
          </p>
          <Link href="/admin/ilr">
            <Button className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Return to ILR Management
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/admin/ilr">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to ILR Files
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <span>{fileData.filename}</span>
              <StatusBadge status={fileData.status} />
            </h1>
            <p className="text-muted-foreground">
              {fileData.academicYear} - Return {fileData.returnPeriod} | 
              Uploaded {format(new Date(fileData.uploadDate), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <FileCog className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Validation Results
          </TabsTrigger>
          <TabsTrigger value="learners" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Learner Records
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>File Information</CardTitle>
                <CardDescription>Details about this ILR file</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="font-medium">Filename:</dt>
                    <dd className="col-span-2">{fileData.filename}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="font-medium">Academic Year:</dt>
                    <dd className="col-span-2">{fileData.academicYear}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="font-medium">Return Period:</dt>
                    <dd className="col-span-2">R{String(fileData.returnPeriod).padStart(2, '0')}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="font-medium">Upload Date:</dt>
                    <dd className="col-span-2">{format(new Date(fileData.uploadDate), 'dd MMM yyyy HH:mm:ss')}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="font-medium">File Size:</dt>
                    <dd className="col-span-2">{(fileData.fileSize / 1024 / 1024).toFixed(2)} MB</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <dt className="font-medium">Status:</dt>
                    <dd className="col-span-2"><StatusBadge status={fileData.status} /></dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Summary</CardTitle>
                <CardDescription>Validation and processing results</CardDescription>
              </CardHeader>
              <CardContent>
                {!fileData.validationReport ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium">Validation Pending</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mt-2">
                      This file has not been validated yet or is currently in the validation process.
                    </p>
                  </div>
                ) : (
                  <dl className="space-y-4">
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium">Records Processed:</dt>
                      <dd className="col-span-2">{fileData.validationReport.totalRecords}</dd>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium">Errors:</dt>
                      <dd className="col-span-2">
                        <span className={fileData.validationReport.errorCount > 0 ? "text-red-600 font-semibold" : ""}>
                          {fileData.validationReport.errorCount}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium">Warnings:</dt>
                      <dd className="col-span-2">
                        <span className={fileData.validationReport.warningCount > 0 ? "text-amber-600 font-semibold" : ""}>
                          {fileData.validationReport.warningCount}
                        </span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <dt className="font-medium">Validation Time:</dt>
                      <dd className="col-span-2">
                        {fileData.validationReport.validationTimestamp 
                          ? format(new Date(fileData.validationReport.validationTimestamp), 'dd MMM yyyy HH:mm:ss')
                          : 'N/A'
                        }
                      </dd>
                    </div>
                    {fileData.errorDetails && (
                      <div className="grid grid-cols-3 gap-1">
                        <dt className="font-medium">Error Details:</dt>
                        <dd className="col-span-2 text-red-600">{fileData.errorDetails}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Validation Results Tab */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>Issues identified during ILR validation</CardDescription>
            </CardHeader>
            <CardContent>
              {validationLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : validationError ? (
                <div className="flex flex-col justify-center items-center h-64">
                  <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-destructive">Error loading validation results</p>
                </div>
              ) : !validationData?.results || validationData.results.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 opacity-80 mb-3" />
                  <h3 className="text-lg font-medium">No Validation Issues</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    {fileData.status === 'pending' || fileData.status === 'validating' 
                      ? "Validation is in progress. Results will appear here when complete."
                      : "No validation issues were found for this file."
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule ID</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Learner Ref</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Record #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationData.results.map((result: any) => (
                        <TableRow key={`${result.id}-${result.recordNumber}`}>
                          <TableCell className="font-medium">{result.ruleId}</TableCell>
                          <TableCell><SeverityBadge severity={result.severity} /></TableCell>
                          <TableCell>{result.learnRefNumber}</TableCell>
                          <TableCell>{result.message}</TableCell>
                          <TableCell>{result.recordNumber || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learner Records Tab */}
        <TabsContent value="learners">
          <Card>
            <CardHeader>
              <CardTitle>Learner Records</CardTitle>
              <CardDescription>
                Individualised Learner Records extracted from this ILR file
              </CardDescription>
            </CardHeader>
            <CardContent>
              {learnersLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : learnersError ? (
                <div className="flex flex-col justify-center items-center h-64">
                  <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-destructive">Error loading learner records</p>
                </div>
              ) : !learnersData?.data || learnersData.data.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-40 mb-3" />
                  <h3 className="text-lg font-medium">No Learner Records</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    {fileData.status === 'pending' || fileData.status === 'validating' 
                      ? "Processing is in progress. Learner records will appear here when complete."
                      : "No learner records were found in this file."
                    }
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Learner Ref</TableHead>
                          <TableHead>ULN</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Date of Birth</TableHead>
                          <TableHead>Aim Reference</TableHead>
                          <TableHead>Postcode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {learnersData.data.map((learner: any) => (
                          <TableRow key={learner.id}>
                            <TableCell className="font-medium">{learner.learnRefNumber}</TableCell>
                            <TableCell>{learner.uln}</TableCell>
                            <TableCell>
                              {learner.firstName} {learner.lastName}
                            </TableCell>
                            <TableCell>
                              {learner.dateOfBirth ? format(new Date(learner.dateOfBirth), 'dd/MM/yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>{learner.learningAimReference}</TableCell>
                            <TableCell>{learner.postcode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {learnersData?.pagination?.total > learnerLimit && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setLearnerPage(p => Math.max(1, p - 1))}
                              className={learnerPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: learnersData.pagination.totalPages }).map((_, idx) => {
                            const pageNumber = idx + 1;
                            // Only show current page, first, last, and 1 page before and after current
                            if (
                              pageNumber === 1 || 
                              pageNumber === learnersData.pagination.totalPages ||
                              Math.abs(pageNumber - learnerPage) <= 1
                            ) {
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationLink
                                    onClick={() => setLearnerPage(pageNumber)}
                                    isActive={learnerPage === pageNumber}
                                  >
                                    {pageNumber}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            
                            // Show ellipsis for gaps
                            if (pageNumber === 2 && learnerPage > 3 || 
                                pageNumber === learnersData.pagination.totalPages - 1 && learnerPage < learnersData.pagination.totalPages - 2) {
                              return <PaginationItem key={pageNumber}>...</PaginationItem>;
                            }
                            
                            return null;
                          })}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setLearnerPage(p => p < (learnersData.pagination.totalPages || 1) ? p + 1 : p)}
                              className={learnerPage >= (learnersData.pagination.totalPages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}