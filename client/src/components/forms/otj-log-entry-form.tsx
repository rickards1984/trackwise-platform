import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Create a schema for OTJ log entry validation
const otjLogSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z.string()
    .min(1, "Hours are required")
    .refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0.5 && num <= 24;
    }, { message: "Hours must be between 0.5 and 24" }),
  activityType: z.string().min(1, "Activity type is required"),
  category: z.enum(["otj", "enrichment"], {
    required_error: "Category is required",
  }),
  ksbId: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  // Omit evidenceId as it's optional and would be handled separately for file uploads
  status: z.enum(["draft", "submitted"], {
    required_error: "Status is required",
  }),
});

type FormData = z.infer<typeof otjLogSchema>;

interface KsbOption {
  id: number;
  type: string;
  code: string;
  description: string;
}

interface OtjLogEntryFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function OtjLogEntryForm({ initialData, isEdit = false }: OtjLogEntryFormProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch KSB options for the dropdown
  const { data: ksbOptions = [] } = useQuery<KsbOption[]>({
    queryKey: ['/api/ksbs?standardId=1'], // Assuming standard ID 1 for simplicity
  });

  // Initialize form with default values or edit data
  const form = useForm<FormData>({
    resolver: zodResolver(otjLogSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          hours: initialData.hours.toString(),
          date: new Date(initialData.date).toISOString().split("T")[0],
          ksbId: initialData.ksbId ? initialData.ksbId.toString() : "",
        }
      : {
          date: new Date().toISOString().split("T")[0],
          hours: "",
          activityType: "",
          category: "otj",
          ksbId: "",
          description: "",
          status: "draft",
        },
  });

  // Create or update OTJ log entry
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const endpoint = isEdit && initialData?.id 
        ? `/api/otj-logs/${initialData.id}` 
        : "/api/otj-logs";
      
      const method = isEdit ? "PATCH" : "POST";
      
      const payload = {
        ...data,
        hours: parseFloat(data.hours),
        ksbId: data.ksbId ? parseInt(data.ksbId) : null,
      };
      
      const response = await apiRequest(method, endpoint, payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isEdit ? "OTJ log updated" : "OTJ log created",
        description: isEdit 
          ? "Your OTJ log entry has been updated successfully." 
          : "Your OTJ log entry has been recorded successfully.",
        variant: "default",
      });
      navigate("/otj-logs");
    },
    onError: (error) => {
      console.error("Error saving OTJ log:", error);
      toast({
        title: "Error",
        description: "There was an error saving your OTJ log entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSaveDraft = async () => {
    const currentData = form.getValues();
    currentData.status = "draft";
    
    // Validate required fields for draft
    if (!currentData.date || !currentData.hours || !currentData.activityType || !currentData.category) {
      toast({
        title: "Required fields missing",
        description: "Please fill in the required fields (date, hours, activity type, and category).",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(currentData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">
          {isEdit ? "Edit OTJ Training Hours" : "Log OTJ Training Hours"}
        </h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours Spent</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.0"
                        min="0.5"
                        step="0.5"
                        max="24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter time in hours, minimum 0.5
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="activityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an activity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="course">Online Course</SelectItem>
                        <SelectItem value="research">Research and Reading</SelectItem>
                        <SelectItem value="workshop">Workshop or Webinar</SelectItem>
                        <SelectItem value="project">Project Work</SelectItem>
                        <SelectItem value="mentoring">Mentoring Session</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="otj">Off-The-Job Training (OTJ)</SelectItem>
                        <SelectItem value="enrichment">Enrichment Activity</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      OTJ must be during paid work hours
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="ksbId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related KSB</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select related knowledge, skill or behavior" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {ksbOptions.map((ksb) => (
                            <SelectItem key={ksb.id} value={ksb.id.toString()}>
                              {ksb.code}: {ksb.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link your activity to the relevant KSB element
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Describe what you learned and how it relates to your apprenticeship..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="md:col-span-2">
                <FormLabel>Evidence (optional)</FormLabel>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-neutral-400" />
                    <div className="flex text-sm text-neutral-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-neutral-500">PDF, DOC, DOCX, PNG, JPG up to 10MB</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onSaveDraft}
                disabled={isSubmitting}
              >
                Save as Draft
              </Button>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    onClick={() => field.onChange("submitted")}
                  >
                    Submit for Verification
                  </Button>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
