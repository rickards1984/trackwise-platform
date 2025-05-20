import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    case 'validating':
      return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Validating</Badge>;
    case 'processing':
      return <Badge variant="secondary" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processing</Badge>;
    case 'complete':
      return <Badge className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200 border-green-300"><CheckCircle className="h-3 w-3" /> Complete</Badge>;
    case 'error':
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function IlrManagement() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Check if user has access to ILR tools
  const hasAccess = isAuthenticated && 
    ['admin', 'training_provider', 'assessor', 'iqa', 'operations'].includes(user?.role || '');

  // Check if user has edit permissions
  const hasEditPermission = isAuthenticated && 
    ['admin', 'operations'].includes(user?.role || '');

  // Fetch ILR files with pagination
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/v2/ilr/files', page, limit],
    enabled: hasAccess && !authLoading,
  });

  if (authLoading) {
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ILR Management</h1>
          <p className="text-muted-foreground">
            Upload, validate, and manage Individualised Learner Records (ILR)
          </p>
        </div>
        {hasEditPermission && (
          <Link href="/admin/ilr/upload">
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload ILR File
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ILR Files</CardTitle>
          <CardDescription>
            View uploaded ILR files and their validation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col justify-center items-center h-64">
              <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-destructive">Error loading ILR files</p>
              <p className="text-sm text-muted-foreground">{(error as any)?.message || 'Unknown error'}</p>
            </div>
          ) : data?.data?.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-2 opacity-40" />
              <h3 className="text-lg font-medium">No ILR files uploaded yet</h3>
              <p className="text-muted-foreground max-w-md mt-2">
                {hasEditPermission 
                  ? "Get started by uploading your first ILR file using the 'Upload ILR File' button above."
                  : "There are no ILR files available to view. Please check back later."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Return Period</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.map((file: any) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.filename}</TableCell>
                        <TableCell>{file.academicYear}</TableCell>
                        <TableCell>{`R${String(file.returnPeriod).padStart(2, '0')}`}</TableCell>
                        <TableCell>
                          {file.uploadDate ? format(new Date(file.uploadDate), 'dd MMM yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={file.status} />
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/ilr/${file.id}`}>
                            <Button size="sm" variant="outline">View Details</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {data?.pagination?.total > limit && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: data.pagination.totalPages }).map((_, idx) => {
                        const pageNumber = idx + 1;
                        // Only show current page, first, last, and 1 page before and after current
                        if (
                          pageNumber === 1 || 
                          pageNumber === data.pagination.totalPages ||
                          Math.abs(pageNumber - page) <= 1
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                onClick={() => setPage(pageNumber)}
                                isActive={page === pageNumber}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        
                        // Show ellipsis for gaps
                        if (pageNumber === 2 && page > 3 || 
                            pageNumber === data.pagination.totalPages - 1 && page < data.pagination.totalPages - 2) {
                          return <PaginationItem key={pageNumber}>...</PaginationItem>;
                        }
                        
                        return null;
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setPage(p => p < (data.pagination.totalPages || 1) ? p + 1 : p)}
                          className={page >= (data.pagination.totalPages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
    </div>
  );
}