import { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { AuthContext } from "@/App";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Upload, ChevronLeft, ChevronDown, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Form validation schema
const evidenceSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  evidenceType: z.string().min(1, "Evidence type is required"),
  ksbIds: z.array(z.number()).optional(),
  status: z.enum(["draft", "submitted"]),
});

export default function SubmitEvidence() {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedKsbs, setSelectedKsbs] = useState<any[]>([]);
  
  // Fetch KSB options
  const { data: ksbOptions = [] } = useQuery({
    queryKey: ['/api/ksbs?standardId=1'], // Assuming standard ID 1 for simplicity
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const form = useForm<z.infer<typeof evidenceSchema>>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      title: "",
      description: "",
      evidenceType: "",
      ksbIds: [],
      status: "draft",
    },
  });

  // Create evidence mutation
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof evidenceSchema>) => {
      const response = await apiRequest("POST", "/api/evidence", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evidence submitted",
        description: "Your evidence has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence'] });
      navigate("/evidence");
    },
    onError: (error) => {
      console.error("Error submitting evidence:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your evidence. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof evidenceSchema>) => {
    // Add selected KSBs to the form data
    data.ksbIds = selectedKsbs.map(ksb => ksb.id);
    await mutation.mutateAsync(data);
  };

  const saveDraft = () => {
    const data = form.getValues();
    form.setValue("status", "draft");
    
    // Validate required fields for draft
    if (!data.title || !data.evidenceType) {
      toast({
        title: "Required fields missing",
        description: "Please provide a title and evidence type before saving as draft.",
        variant: "destructive",
      });
      return;
    }
    
    data.ksbIds = selectedKsbs.map(ksb => ksb.id);
    mutation.mutate(data);
  };

  const selectKsb = (ksb: any) => {
    if (!selectedKsbs.some(selected => selected.id === ksb.id)) {
      setSelectedKsbs([...selectedKsbs, ksb]);
    }
  };

  const removeKsb = (ksbId: number) => {
    setSelectedKsbs(selectedKsbs.filter(ksb => ksb.id !== ksbId));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="mb-6">
              <Button variant="outline" size="sm" asChild>
                <a href="/evidence" className="flex items-center">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Evidence Library
                </a>
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Submit New Evidence
                </CardTitle>
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
                            <Input placeholder="Enter a title for your evidence" {...field} />
                          </FormControl>
                          <FormDescription>
                            Provide a clear, descriptive title for your evidence
                          </FormDescription>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select evidence type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="project">Project</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
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
                              placeholder="Describe what this evidence demonstrates about your skills and knowledge"
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Explain how this evidence relates to your apprenticeship
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div>
                      <FormLabel>Link to KSBs</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            Select KSBs
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search KSBs..." />
                            <CommandEmpty>No KSBs found.</CommandEmpty>
                            <CommandGroup>
                              {ksbOptions.map((ksb: any) => (
                                <CommandItem
                                  key={ksb.id}
                                  onSelect={() => selectKsb(ksb)}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedKsbs.some(selected => selected.id === ksb.id)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {ksb.code}: {ksb.description}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {selectedKsbs.length > 0 && (
                        <div className="mt-3">
                          <h3 className="text-sm font-medium mb-2">Selected KSBs:</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedKsbs.map((ksb) => (
                              <div 
                                key={ksb.id} 
                                className="bg-primary-light text-primary text-xs rounded-full px-3 py-1 flex items-center"
                              >
                                {ksb.code}: {ksb.description}
                                <button 
                                  type="button"
                                  onClick={() => removeKsb(ksb.id)}
                                  className="ml-2 rounded-full hover:bg-primary-dark hover:text-white w-4 h-4 inline-flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <FormLabel>Evidence File</FormLabel>
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
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={saveDraft}
                        disabled={mutation.isPending}
                      >
                        Save as Draft
                      </Button>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <Button
                            type="submit"
                            disabled={mutation.isPending}
                            onClick={() => field.onChange("submitted")}
                          >
                            {mutation.isPending ? "Submitting..." : "Submit for Review"}
                          </Button>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
