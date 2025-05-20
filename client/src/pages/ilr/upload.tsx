import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, FileText, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ILRUploadPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [returnPeriod, setReturnPeriod] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Academic year options (add more as needed)
  const academicYears = ["2024-25", "2023-24", "2022-23"];
  
  // Return periods (1-14)
  const returnPeriods = Array.from({ length: 14 }, (_, i) => (i + 1).toString());
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file is the right type (typically XML or ZIP for ILR)
      const validFileTypes = ['.xml', '.zip', '.csv'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
      
      if (!validFileTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an XML, ZIP, or CSV file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size limit (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };
  
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !academicYear || !returnPeriod) {
      toast({
        title: "Missing information",
        description: "Please select a file, academic year, and return period",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setValidationResults(null);
    setErrorMessage("");
    
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('academicYear', academicYear);
    formData.append('returnPeriod', returnPeriod);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 200);
      
      const response = await fetch('/api/ilr/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || (errorData.errors?.join(", ") || "Failed to upload ILR file"));
      }
      
      const result = await response.json();
      
      setValidationResults(result.validationReport);
      
      // Reset form on success
      setFile(null);
      setAcademicYear("");
      setReturnPeriod("");
      
      toast({
        title: "Upload successful",
        description: `File ${file.name} uploaded and processed successfully.`,
      });
      
    } catch (error: any) {
      console.error("ILR upload error:", error);
      setErrorMessage(error.message || "Failed to upload file. Please try again.");
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during file upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-6">Please log in to access the ILR upload system.</p>
        <Button onClick={() => navigate("/auth/login")}>
          Log In
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">ILR File Upload</h1>
      <p className="text-gray-600 mb-6">
        Upload your Individualised Learner Record (ILR) file for processing and validation.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload ILR File</CardTitle>
              <CardDescription>
                Select and upload your ILR file in XML, ZIP, or CSV format.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">ILR File</Label>
                  <Input 
                    id="file" 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".xml,.zip,.csv"
                    disabled={uploading}
                    required
                  />
                  {file && (
                    <p className="text-sm text-gray-500">
                      Selected file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Select 
                      value={academicYear} 
                      onValueChange={setAcademicYear}
                      disabled={uploading}
                    >
                      <SelectTrigger id="academicYear">
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="returnPeriod">Return Period</Label>
                    <Select 
                      value={returnPeriod} 
                      onValueChange={setReturnPeriod}
                      disabled={uploading}
                    >
                      <SelectTrigger id="returnPeriod">
                        <SelectValue placeholder="Select return period" />
                      </SelectTrigger>
                      <SelectContent>
                        {returnPeriods.map(period => (
                          <SelectItem key={period} value={period}>R{period.padStart(2, '0')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Upload Progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
                
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={!file || uploading}
                    onClick={() => {
                      if (file) {
                        // Show preview information about the file
                        toast({
                          title: "File Preview",
                          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
                        });
                        
                        // In a real implementation, this would parse the file to display
                        // a preview of its structure, learner count, etc.
                        setValidationResults({
                          fileSize: file.size,
                          learnerCount: "Preview only",
                          warnings: [],
                          errors: [],
                          preview: true
                        });
                      }
                    }}
                  >
                    Preview File
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={!file || !academicYear || !returnPeriod || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload and Process ILR File'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>ILR Upload Guidelines</CardTitle>
              <CardDescription>
                Follow these guidelines for successful ILR submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Accepted File Formats</h3>
                  <p className="text-sm text-gray-500">XML, ZIP, or CSV formats only</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Upload className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Maximum File Size</h3>
                  <p className="text-sm text-gray-500">Files must be under 10MB</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium">Validation Process</h3>
                  <p className="text-sm text-gray-500">All files undergo validation against the latest ILR schemas</p>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-2">Need Help?</h3>
                <p className="text-sm text-gray-500">
                  For assistance with ILR submissions, contact support or refer to the 
                  <span className="text-blue-600 hover:underline cursor-pointer"> ILR documentation</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Validation Results Section */}
      {validationResults && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              Review validation results for your ILR file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validationResults.errors && validationResults.errors.length > 0 ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    Your file contains {validationResults.errors.length} validation errors that must be fixed
                  </AlertDescription>
                </Alert>
                
                <div className="border rounded-md">
                  <div className="bg-gray-100 px-4 py-2 font-medium border-b">
                    Error Details
                  </div>
                  <div className="divide-y">
                    {validationResults.errors.map((error: any, index: number) => (
                      <div key={index} className="px-4 py-3">
                        <p className="font-medium text-red-600">{error.ruleId || 'Error'}</p>
                        <p className="text-sm mt-1">{error.message}</p>
                        {error.learner && (
                          <p className="text-xs text-gray-500 mt-1">
                            Learner: {error.learner} | Line: {error.line || 'N/A'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Validation Successful</AlertTitle>
                <AlertDescription>
                  Your ILR file passed validation with no errors.
                  {validationResults.warnings && validationResults.warnings.length > 0 && 
                    ` There are ${validationResults.warnings.length} warnings to review.`}
                </AlertDescription>
              </Alert>
            )}
            
            {validationResults.warnings && validationResults.warnings.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-medium">Warnings ({validationResults.warnings.length})</h3>
                <div className="border rounded-md">
                  <div className="bg-gray-100 px-4 py-2 font-medium border-b">
                    Warning Details
                  </div>
                  <div className="divide-y">
                    {validationResults.warnings.map((warning: any, index: number) => (
                      <div key={index} className="px-4 py-3">
                        <p className="font-medium text-amber-600">{warning.ruleId || 'Warning'}</p>
                        <p className="text-sm mt-1">{warning.message}</p>
                        {warning.learner && (
                          <p className="text-xs text-gray-500 mt-1">
                            Learner: {warning.learner} | Line: {warning.line || 'N/A'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {validationResults.learnerCount && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium mb-2">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Learners</p>
                    <p className="font-medium">{validationResults.learnerCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">New Learners</p>
                    <p className="font-medium">{validationResults.newLearners || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Updated Learners</p>
                    <p className="font-medium">{validationResults.updatedLearners || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">File Size</p>
                    <p className="font-medium">{validationResults.fileSize ? `${(validationResults.fileSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setValidationResults(null)}>
              Clear Results
            </Button>
            <Button 
              disabled={validationResults.errors && validationResults.errors.length > 0}
              onClick={() => {
                toast({
                  title: "ILR Processed",
                  description: "Your ILR data has been successfully imported into the system.",
                });
                // Navigate to a results page or something similar
              }}
            >
              {validationResults.errors && validationResults.errors.length > 0 
                ? 'Fix Errors and Re-upload' 
                : 'Confirm and Process ILR Data'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}