import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  BookOpen,
  Check,
  FileUp,
  Link,
  Paperclip,
  Target,
  Upload,
  User,
  X
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// Create schema for evidence submission
const evidenceSubmissionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  evidenceType: z.enum(["image", "video", "document", "project", "presentation", "other"]),
  submissionDate: z.date(),
  status: z.enum(["draft", "submitted", "in_review", "approved", "needs_revision"]).default("draft"),
  fileUrl: z.string().optional(),
  externalLink: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
  reflection: z.string().min(10, "Reflection must be at least 10 characters").max(1000, "Reflection must be less than 1000 characters")
});

type EvidenceSubmissionFormValues = z.infer<typeof evidenceSubmissionSchema>;

export default function AddEvidence() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [selectedKsbs, setSelectedKsbs] = useState<number[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlType, setUrlType] = useState<"file" | "link">("file");

  // Parse query parameters (if any KSB was pre-selected)
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const preselectedKsbId = searchParams.get("ksbId");

  // Define KSB Element type
  interface KsbElement {
    id: number;
    type: 'knowledge' | 'skill' | 'behavior';
    code: string;
    description: string;
    standardId: number;
  }
  
  // Get KSB elements
  const { data: ksbElements, isLoading: ksbsLoading } = useQuery<KsbElement[]>({
    queryKey: ["/api/ksbs"],
    enabled: !!user,
  });

  // Setup form with default values
  const form = useForm<EvidenceSubmissionFormValues>({
    resolver: zodResolver(evidenceSubmissionSchema),
    defaultValues: {
      title: "",
      description: "",
      evidenceType: "document",
      submissionDate: new Date(),
      status: "draft",
      fileUrl: "",
      externalLink: "",
      reflection: ""
    }
  });

  // Effect to set preselected KSB
  useEffect(() => {
    if (preselectedKsbId && ksbElements && ksbElements.length > 0) {
      const ksbId = parseInt(preselectedKsbId);
      if (!isNaN(ksbId) && ksbElements.some(ksb => ksb.id === ksbId)) {
        setSelectedKsbs([ksbId]);
      }
    }
  }, [preselectedKsbId, ksbElements]);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      
      // Create a preview URL for the uploaded file
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Set form file URL value
      form.setValue("fileUrl", "file://" + file.name);
    }
  };

  // Toggle KSB selection
  const toggleKsb = (ksbId: number) => {
    if (selectedKsbs.includes(ksbId)) {
      setSelectedKsbs(selectedKsbs.filter(id => id !== ksbId));
    } else {
      setSelectedKsbs([...selectedKsbs, ksbId]);
    }
  };

  // Handle form submission
  const submitEvidenceMutation = useMutation({
    mutationFn: async (data: EvidenceSubmissionFormValues) => {
      const formData = new FormData();
      
      // Append form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            formData.append(key, value.toISOString());
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      // Append selected KSBs
      formData.append('ksbIds', JSON.stringify(selectedKsbs));
      
      // Append file if uploaded
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }
      
      // Append user ID if available
      if (user) {
        formData.append('learnerId', String(user.id));
      }
      
      // For FormData, we need to use fetch directly rather than apiRequest
      // as apiRequest is configured for JSON data
      return fetch("/api/evidence", {
        method: "POST",
        body: formData,
        credentials: "include"
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: form.getValues("status") === "draft" ? "Draft saved" : "Evidence submitted",
        description: form.getValues("status") === "draft" 
          ? "Your evidence draft has been saved." 
          : "Your evidence has been submitted for review.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      
      // Redirect to evidence list
      navigate("/evidence");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit evidence. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EvidenceSubmissionFormValues) => {
    if (selectedKsbs.length === 0) {
      toast({
        title: "Missing KSBs",
        description: "Please select at least one KSB that this evidence demonstrates.",
        variant: "destructive",
      });
      return;
    }
    
    submitEvidenceMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth/login");
    return null;
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Add Evidence</h1>
            <p className="text-muted-foreground">
              Submit evidence to demonstrate your knowledge, skills, and behaviors
            </p>
          </div>
          <div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/evidence")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form column */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Details</CardTitle>
              <CardDescription>
                Fill out the details of your evidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Evidence title" {...field} />
                        </FormControl>
                        <FormDescription>
                          Give your evidence a clear, descriptive title
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="evidenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evidence Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select evidence type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="project">Project</SelectItem>
                              <SelectItem value="presentation">Presentation</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            What type of evidence are you submitting?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="submissionDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                          />
                          <FormDescription>
                            When was this evidence completed?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your evidence in detail" 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Explain what this evidence demonstrates and how it relates to your KSBs
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Evidence File or Link</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          type="button"
                          variant={urlType === "file" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUrlType("file")}
                        >
                          <Paperclip className="h-4 w-4 mr-2" />
                          Upload File
                        </Button>
                        <Button
                          type="button"
                          variant={urlType === "link" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setUrlType("link")}
                        >
                          <Link className="h-4 w-4 mr-2" />
                          External Link
                        </Button>
                      </div>
                    </div>
                    
                    {urlType === "file" ? (
                      <div className="border rounded-md p-4 bg-muted/30">
                        <Label htmlFor="file-upload">Upload File</Label>
                        <div className="mt-2">
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="file-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              {previewUrl ? (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 relative w-full h-full">
                                  {form.getValues("evidenceType") === "image" ? (
                                    <img
                                      src={previewUrl}
                                      alt="Preview"
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <Paperclip className="h-10 w-10 text-primary mb-2" />
                                      <p className="text-sm text-muted-foreground">
                                        {uploadedFile?.name}
                                      </p>
                                    </div>
                                  )}
                                  
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUploadedFile(null);
                                      setPreviewUrl(null);
                                      form.setValue("fileUrl", "");
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                  <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    PDF, DOCX, JPG, PNG, MP4 (max 20MB)
                                  </p>
                                </div>
                              )}
                              <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                onChange={handleFileChange}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name="externalLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>External Link</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://example.com/my-project" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Link to your project, video, or other online evidence
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                  
                  <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-semibold mb-2 text-primary">Reflection</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Taking time to reflect on your learning is an essential part of your apprenticeship journey.
                      It helps demonstrate how you're applying knowledge in practice and developing your skills.
                    </p>
                    <FormField
                      control={form.control}
                      name="reflection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-primary">Your Reflection</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Reflect on what you've learned from this experience. Consider addressing: What did you learn? How will you apply this to your role? What would you do differently next time?" 
                              className="min-h-[180px] border-primary/30 focus-visible:ring-primary"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            <div className="flex items-start mt-2">
                              <div className="mr-2 mt-1 text-primary">💡</div>
                              <div>
                                <strong>Tip:</strong> Strong reflections connect your evidence to specific KSBs and explain how this has developed your professional practice.
                              </div>
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submission Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Save as Draft</SelectItem>
                            <SelectItem value="submitted">Submit for Review</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Save as draft to complete later, or submit for review
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => navigate("/evidence")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitEvidenceMutation.isPending}
                    >
                      {submitEvidenceMutation.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                          Submitting...
                        </div>
                      ) : form.getValues("status") === "draft" ? (
                        "Save Draft"
                      ) : (
                        "Submit Evidence"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        {/* KSB selection column */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Select KSBs</CardTitle>
              <CardDescription>
                Choose which KSBs this evidence demonstrates
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {ksbsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : ksbElements && ksbElements.length > 0 ? (
                <div className="space-y-4">
                  {/* Knowledge elements */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <BookOpen className="h-4 w-4 text-blue-600 mr-1" />
                      Knowledge
                    </h3>
                    <div className="space-y-2">
                      {ksbElements
                        .filter((ksb: any) => ksb.type === "K")
                        .map((ksb: any) => (
                          <div
                            key={ksb.id}
                            className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                              selectedKsbs.includes(ksb.id)
                                ? "bg-blue-50 border border-blue-200"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => toggleKsb(ksb.id)}
                          >
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                                selectedKsbs.includes(ksb.id)
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted"
                              }`}
                            >
                              {selectedKsbs.includes(ksb.id) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium flex items-center">
                                {ksb.type}
                                {ksb.reference}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Knowledge
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {ksb.title}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Skills elements */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Target className="h-4 w-4 text-green-600 mr-1" />
                      Skills
                    </h3>
                    <div className="space-y-2">
                      {ksbElements
                        .filter((ksb: any) => ksb.type === "S")
                        .map((ksb: any) => (
                          <div
                            key={ksb.id}
                            className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                              selectedKsbs.includes(ksb.id)
                                ? "bg-green-50 border border-green-200"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => toggleKsb(ksb.id)}
                          >
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                                selectedKsbs.includes(ksb.id)
                                  ? "bg-green-600 text-white"
                                  : "bg-muted"
                              }`}
                            >
                              {selectedKsbs.includes(ksb.id) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium flex items-center">
                                {ksb.type}
                                {ksb.reference}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Skill
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {ksb.title}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Behaviors elements */}
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <User className="h-4 w-4 text-amber-600 mr-1" />
                      Behaviors
                    </h3>
                    <div className="space-y-2">
                      {ksbElements
                        .filter((ksb: any) => ksb.type === "B")
                        .map((ksb: any) => (
                          <div
                            key={ksb.id}
                            className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                              selectedKsbs.includes(ksb.id)
                                ? "bg-amber-50 border border-amber-200"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                            onClick={() => toggleKsb(ksb.id)}
                          >
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center mr-2 ${
                                selectedKsbs.includes(ksb.id)
                                  ? "bg-amber-600 text-white"
                                  : "bg-muted"
                              }`}
                            >
                              {selectedKsbs.includes(ksb.id) && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                            <div className="text-sm">
                              <div className="font-medium flex items-center">
                                {ksb.type}
                                {ksb.reference}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Behavior
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {ksb.title}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No KSBs found</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/30 flex justify-between">
              <div className="text-sm text-muted-foreground">
                Selected: {selectedKsbs.length}
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedKsbs([])}
                disabled={selectedKsbs.length === 0}
              >
                Clear All
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}