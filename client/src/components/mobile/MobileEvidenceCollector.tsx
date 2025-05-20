import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Camera, FileUp, Send, X, Paperclip, Check } from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

// Create a schema for quick evidence collection on mobile
const quickEvidenceSchema = z.object({
  title: z.string({
    required_error: "Title is required",
  }).min(5, "Title must be at least 5 characters"),
  description: z.string({
    required_error: "Description is required",
  }).min(10, "Description must be at least 10 characters"),
  evidenceType: z.enum(["video", "image", "document", "project", "presentation", "other"], {
    required_error: "Evidence type is required",
  }),
  reflection: z.string().optional(),
});

type QuickEvidenceFormValues = z.infer<typeof quickEvidenceSchema>;

export function MobileEvidenceCollector() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [evidence, setEvidence] = useState<string | null>(null);
  const [selectedKsbs, setSelectedKsbs] = useState<number[]>([]);

  // Setup form with react-hook-form and zod
  const form = useForm<QuickEvidenceFormValues>({
    resolver: zodResolver(quickEvidenceSchema),
    defaultValues: {
      title: "",
      description: "",
      evidenceType: "image",
      reflection: "",
    },
  });

  // Get KSB elements for mapping
  const { data: ksbElements } = useQuery({
    queryKey: ["/api/ksbs"],
    enabled: !!user,
  });

  // Toggle KSB selection
  const toggleKsb = (ksbId: number) => {
    if (selectedKsbs.includes(ksbId)) {
      setSelectedKsbs(selectedKsbs.filter(id => id !== ksbId));
    } else {
      setSelectedKsbs([...selectedKsbs, ksbId]);
    }
  };

  // Submit evidence mutation
  const submitEvidenceMutation = useMutation({
    mutationFn: async (data: QuickEvidenceFormValues) => {
      return apiRequest("/api/evidence", {
        method: "POST",
        data: {
          ...data,
          learnerId: user?.id,
          fileData: evidence,
          ksbIds: selectedKsbs,
          submissionDate: new Date(),
          status: "submitted"
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Evidence submitted",
        description: "Your evidence has been submitted for review",
      });
      
      // Reset form
      form.reset({
        title: "",
        description: "",
        evidenceType: "image",
      });
      
      // Reset evidence and KSBs
      setEvidence(null);
      setSelectedKsbs([]);
      setShowCamera(false);
      
      // Navigate back to evidence page
      setLocation("/evidence");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit evidence",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuickEvidenceFormValues) => {
    if (selectedKsbs.length === 0) {
      toast({
        title: "Please select KSBs",
        description: "You must select at least one knowledge, skill, or behavior",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    submitEvidenceMutation.mutate(data);
  };

  // Mock function for camera capture (in a real app, would use device camera API)
  const captureEvidence = () => {
    // In a real implementation, this would access the device camera
    // For now, we'll simulate with a dummy base64 image
    setEvidence("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
    setShowCamera(false);
    
    toast({
      title: "Evidence captured",
      description: "Evidence file attached",
    });
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-xl flex items-center">
            <FileUp className="w-5 h-5 mr-2" />
            Quick Evidence Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Title of evidence" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evidenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select evidence type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your evidence"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Reflection section */}
              <div className="border-l-4 border-primary/70 pl-3 bg-primary/5 rounded-r-md">
                <FormField
                  control={form.control}
                  name="reflection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary flex items-center">
                        <div className="mr-1 text-primary">✍️</div>
                        Reflection
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What did you learn from this experience? How will you apply it?"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        Connecting your learning to your practice helps demonstrate your development
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* KSB mapping section */}
              <div className="border rounded-md p-3 space-y-2">
                <h3 className="text-sm font-medium">Select Knowledge, Skills & Behaviors</h3>
                <p className="text-xs text-muted-foreground">Select which KSBs this evidence demonstrates</p>
                
                <div className="max-h-[150px] overflow-y-auto mt-2 space-y-1">
                  {ksbElements?.length > 0 ? (
                    ksbElements.map((ksb: any) => (
                      <div 
                        key={ksb.id}
                        className={`flex items-center p-2 rounded-md text-sm cursor-pointer transition-colors ${
                          selectedKsbs.includes(ksb.id) 
                            ? 'bg-primary/10 border-primary/20 border' 
                            : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                        onClick={() => toggleKsb(ksb.id)}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                          selectedKsbs.includes(ksb.id) ? 'bg-primary text-white' : 'bg-gray-200'
                        }`}>
                          {selectedKsbs.includes(ksb.id) && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{ksb.title}</div>
                          <div className="text-xs opacity-70">{ksb.type}: {ksb.reference}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">Loading KSBs...</div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedKsbs.length} KSBs selected
                </div>
              </div>

              {/* Evidence capture section */}
              <div className="border rounded-md p-3 bg-primary/5">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Evidence File</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCamera(!showCamera)}
                    className="h-8"
                  >
                    {evidence ? <X className="h-4 w-4 mr-1" /> : <Camera className="h-4 w-4 mr-1" />}
                    {evidence ? 'Remove' : 'Capture'}
                  </Button>
                </div>
                
                {showCamera && (
                  <div className="mt-2 bg-black p-4 rounded-md text-white">
                    <div className="aspect-video bg-gray-800 flex items-center justify-center mb-2">
                      <Camera className="h-8 w-8 opacity-50" />
                    </div>
                    <Button 
                      type="button" 
                      className="w-full"
                      onClick={captureEvidence}
                    >
                      Capture Evidence
                    </Button>
                  </div>
                )}
                
                {evidence && (
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <div className="bg-gray-100 p-2 text-xs text-gray-600 font-medium">
                      Evidence file attached
                    </div>
                    <div className="p-2">
                      <div className="aspect-video bg-gray-100 flex items-center justify-center">
                        <Paperclip className="h-8 w-8 opacity-30" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !evidence}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Evidence
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="border-t bg-primary/5 text-xs text-muted-foreground py-2 px-4">
          <p>Evidence will be reviewed by your assessor</p>
        </CardFooter>
      </Card>
    </div>
  );
}