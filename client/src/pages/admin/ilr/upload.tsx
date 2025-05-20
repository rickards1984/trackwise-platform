import { useState, ChangeEvent, FormEvent } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function IlrUpload() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState<string>("");
  const [returnPeriod, setReturnPeriod] = useState<string>("");

  // Check if user has access to upload ILR files
  const hasEditPermission = isAuthenticated && 
    ['admin', 'operations'].includes(user?.role || '');

  // Current academic year (e.g., "2024-25")
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear-1}-${String(currentYear).slice(2)}`,
    `${currentYear}-${String(currentYear+1).slice(2)}`,
    `${currentYear+1}-${String(currentYear+2).slice(2)}`
  ];

  // Generate return periods (R01-R14)
  const returnPeriods = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, '0'));

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/v2/ilr/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File uploaded successfully",
        description: "Your ILR file has been uploaded and scheduled for validation.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/ilr/files'] });
      setLocation("/admin/ilr");
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!academicYear) {
      toast({
        title: "Academic year required",
        description: "Please select an academic year.",
        variant: "destructive",
      });
      return;
    }

    if (!returnPeriod) {
      toast({
        title: "Return period required",
        description: "Please select a return period.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("ilrFile", selectedFile);
    formData.append("academicYear", academicYear);
    formData.append("returnPeriod", returnPeriod);

    uploadMutation.mutate(formData);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !hasEditPermission) {
    return (
      <Card className="mx-auto my-8 max-w-4xl">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to upload ILR files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This area is restricted to administrators and operations staff only.
          </p>
          <Button onClick={() => setLocation("/admin/ilr")}>
            Return to ILR Management
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => setLocation("/admin/ilr")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to ILR Management
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Upload ILR File</h1>
        <p className="text-muted-foreground">
          Upload a new Individualised Learner Record (ILR) file for validation and processing
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload ILR File</CardTitle>
              <CardDescription>
                Select a file, specify the academic year and return period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="ilr-upload-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="file">ILR File (CSV, XML, or ZIP)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xml,.zip"
                    onChange={handleFileChange}
                    disabled={uploadMutation.isPending}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Select 
                      value={academicYear} 
                      onValueChange={setAcademicYear}
                      disabled={uploadMutation.isPending}
                    >
                      <SelectTrigger id="academicYear">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map(year => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnPeriod">Return Period</Label>
                    <Select 
                      value={returnPeriod} 
                      onValueChange={setReturnPeriod}
                      disabled={uploadMutation.isPending}
                    >
                      <SelectTrigger id="returnPeriod">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {returnPeriods.map(period => (
                          <SelectItem key={period} value={period}>
                            R{period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setLocation("/admin/ilr")}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="ilr-upload-form"
                disabled={uploadMutation.isPending || !selectedFile || !academicYear || !returnPeriod}
                className="flex items-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload File
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ILR Upload Guidelines</CardTitle>
              <CardDescription>
                Important information for uploading ILR files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Accepted File Formats</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 ml-2 space-y-1">
                  <li>CSV - Comma Separated Values file</li>
                  <li>XML - XML formatted ILR file</li>
                  <li>ZIP - Compressed archive containing either CSV or XML</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium">File Size Limits</h3>
                <p className="text-sm text-muted-foreground mt-1 ml-2">
                  Maximum file size: 50MB. Larger files may need to be split or compressed.
                </p>
              </div>

              <div>
                <h3 className="font-medium">Processing Time</h3>
                <p className="text-sm text-muted-foreground mt-1 ml-2">
                  Validation and processing may take several minutes depending on file size and complexity.
                </p>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Ensure your ILR file follows the latest ESFA specifications for the selected academic year.
                  Incorrectly formatted files will fail validation.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
              <CardDescription>
                The ILR upload and validation process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-3 ml-2">
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">1.</span>
                  <span>Your file will be uploaded and saved to secure storage</span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">2.</span>
                  <span>The system will validate your ILR data against ESFA validation rules</span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">3.</span>
                  <span>Validation results will show any errors or warnings that need attention</span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-primary mr-2">4.</span>
                  <span>Once validation is complete, the data will be available for reporting and analysis</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}