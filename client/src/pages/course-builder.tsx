import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Import our new components
import { KSBSelectionAccordion } from "@/components/course-builder/KSBSelectionAccordion";
import { StandardInfoCard } from "@/components/course-builder/StandardInfoCard";
import { ResourcesPanel } from "@/components/course-builder/ResourcesPanel";
import { KSBDetailModal } from "@/components/course-builder/KSBDetailModal";

// Import autosave utilities
import { saveDraft, loadDraft, clearDraft, formatTimestamp } from "@/lib/autosave";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  BookOpen, 
  FileText, 
  Layers, 
  Plus, 
  Trash2, 
  Upload, 
  Wand2,
  Save,
  Info,
  RotateCcw,
  Clock,
  Eye
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StandardAnalyzer } from "@/components/ai-assistant/StandardAnalyzer";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";

// Form schema for creating a new course template
const courseTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  standardId: z.coerce.number().min(1, "Standard is required"),
  isPublic: z.boolean().default(false),
  includeResources: z.boolean().default(true),
  includeAssessments: z.boolean().default(true),
});

type CourseTemplateFormValues = z.infer<typeof courseTemplateSchema>;

// Building blocks for a course
interface ModuleBlock {
  id: string;
  title: string;
  description: string;
  ksbIds: number[];
  order: number;
  lessons: LessonBlock[];
}

interface LessonBlock {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: "content" | "assessment" | "resource";
  ksbIds: number[];
  order: number;
  content?: string;
}

// KSB type for accordion and detail modal
interface KsbElement {
  id: number;
  type: "knowledge" | "skill" | "behavior";
  code: string;
  description: string;
  standardId: number;
}

// Component for the AI Course Builder
export default function CourseBuilder() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("builder");
  const [showStandardAnalyzer, setShowStandardAnalyzer] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [courseModules, setCourseModules] = useState<ModuleBlock[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [standardKSBs, setStandardKSBs] = useState<KsbElement[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [autoSelectAllKsbs, setAutoSelectAllKsbs] = useState(true);
  const [selectedKsb, setSelectedKsb] = useState<KsbElement | null>(null);
  const [isKsbDetailOpen, setIsKsbDetailOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [hasDraftDialog, setHasDraftDialog] = useState(false);
  
  // Get available apprenticeship standards
  const { data: standards, isLoading: standardsLoading } = useQuery({
    queryKey: ["/api/standards"],
    enabled: !authLoading && !!user,
  });

  // Get templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/course-builder/templates"],
    enabled: !authLoading && !!user,
  });

  // Form for creating a new course template
  const form = useForm<CourseTemplateFormValues>({
    resolver: zodResolver(courseTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      standardId: 0,
      isPublic: false,
      includeResources: true,
      includeAssessments: true,
    },
  });

  // Check for existing draft on component mount
  useEffect(() => {
    if (user) {
      const draft = loadDraft(user.id);
      if (draft) {
        setHasDraft(true);
        setDraftTimestamp(draft.timestamp);
        setHasDraftDialog(true);
      }
    }
  }, [user]);

  // Auto-save course builder progress every 60 seconds if enabled
  useEffect(() => {
    if (!autoSaveEnabled || !user) return;
    
    const autoSaveInterval = setInterval(() => {
      if (form.getValues().title || courseModules.length > 0) {
        const currentState = {
          formValues: form.getValues(),
          courseModules,
          selectedModule,
          standardKSBs
        };
        saveDraft(currentState, user.id);
        console.log("Auto-saved course builder draft");
      }
    }, 60000); // Auto-save every 60 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [autoSaveEnabled, user, form, courseModules, selectedModule, standardKSBs]);

  // Load draft data
  const loadDraftData = () => {
    if (user) {
      const draft = loadDraft(user.id);
      if (draft) {
        const { formValues, courseModules: draftModules, standardKSBs: draftKSBs } = draft.data;
        
        // Set form values
        if (formValues) {
          Object.entries(formValues).forEach(([key, value]) => {
            form.setValue(key as any, value);
          });
        }
        
        // Set course modules
        if (draftModules) {
          setCourseModules(draftModules);
        }
        
        // Set standard KSBs
        if (draftKSBs) {
          setStandardKSBs(draftKSBs);
        }
        
        toast({
          title: "Draft Loaded",
          description: `Loaded draft from ${formatTimestamp(draft.timestamp)}`,
        });
        
        setHasDraftDialog(false);
      }
    }
  };

  // Discard draft
  const discardDraft = () => {
    if (user) {
      clearDraft(user.id);
      setHasDraft(false);
      setDraftTimestamp(null);
      setHasDraftDialog(false);
      
      toast({
        title: "Draft Discarded",
        description: "The saved draft has been discarded",
      });
    }
  };

  // When standard changes, fetch KSBs for that standard
  useEffect(() => {
    const standardId = form.watch("standardId");
    if (standardId) {
      // Fetch KSBs for this standard
      const fetchKSBs = async () => {
        try {
          const response = await apiRequest(`/api/ksbs?standardId=${standardId}`, {
            method: "GET",
          });
          setStandardKSBs(response);
        } catch (error) {
          console.error("Error fetching KSBs:", error);
          toast({
            title: "Error",
            description: "Failed to fetch KSBs for the selected standard",
            variant: "destructive",
          });
        }
      };
      fetchKSBs();
    }
  }, [form.watch("standardId")]);

  // Create new template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (values: CourseTemplateFormValues) => {
      return apiRequest("/api/course-builder/templates", {
        method: "POST",
        data: values,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Course template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/course-builder/templates"] });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create course template",
        variant: "destructive",
      });
    },
  });

  // Generate course structure with AI
  const generateCourseStructure = async () => {
    try {
      setAiGenerating(true);
      const standardId = form.getValues("standardId");
      if (!standardId) {
        toast({
          title: "Required",
          description: "Please select an apprenticeship standard first",
          variant: "destructive",
        });
        setAiGenerating(false);
        return;
      }

      // Call the API to generate course structure using AI
      const generated = await apiRequest("/api/course-builder/generate-structure", {
        method: "POST",
        data: {
          standardId,
          includeResources: form.getValues("includeResources"),
          includeAssessments: form.getValues("includeAssessments"),
        },
      });

      if (generated?.modules) {
        setCourseModules(generated.modules);
        toast({
          title: "Success",
          description: "AI has generated a course structure based on the selected standard",
        });
      }
    } catch (error) {
      console.error("Error generating course structure:", error);
      toast({
        title: "Error",
        description: "Failed to generate course structure with AI",
        variant: "destructive",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Add new module
  const addModule = () => {
    const newModule: ModuleBlock = {
      id: `module_${Date.now()}`,
      title: "New Module",
      description: "",
      ksbIds: [],
      order: courseModules.length + 1,
      lessons: [],
    };
    setCourseModules([...courseModules, newModule]);
    setSelectedModule(newModule.id);
  };

  // Add new lesson to module
  const addLesson = (moduleId: string, type: "content" | "assessment" | "resource") => {
    const moduleIndex = courseModules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const updatedModules = [...courseModules];
      const newLesson: LessonBlock = {
        id: `lesson_${Date.now()}`,
        moduleId,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: "",
        type,
        ksbIds: [],
        order: updatedModules[moduleIndex].lessons.length + 1,
      };
      updatedModules[moduleIndex].lessons.push(newLesson);
      setCourseModules(updatedModules);
    }
  };

  // Update module
  const updateModule = (moduleId: string, data: Partial<Omit<ModuleBlock, "id" | "lessons">>) => {
    const moduleIndex = courseModules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const updatedModules = [...courseModules];
      updatedModules[moduleIndex] = {
        ...updatedModules[moduleIndex],
        ...data,
      };
      setCourseModules(updatedModules);
    }
  };

  // Update lesson
  const updateLesson = (
    moduleId: string,
    lessonId: string,
    data: Partial<Omit<LessonBlock, "id" | "moduleId">>
  ) => {
    const moduleIndex = courseModules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const lessonIndex = courseModules[moduleIndex].lessons.findIndex(l => l.id === lessonId);
      if (lessonIndex !== -1) {
        const updatedModules = [...courseModules];
        updatedModules[moduleIndex].lessons[lessonIndex] = {
          ...updatedModules[moduleIndex].lessons[lessonIndex],
          ...data,
        };
        setCourseModules(updatedModules);
      }
    }
  };

  // Delete module
  const deleteModule = (moduleId: string) => {
    setCourseModules(courseModules.filter(m => m.id !== moduleId));
    if (selectedModule === moduleId) {
      setSelectedModule(null);
    }
  };

  // Delete lesson
  const deleteLesson = (moduleId: string, lessonId: string) => {
    const moduleIndex = courseModules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const updatedModules = [...courseModules];
      updatedModules[moduleIndex].lessons = updatedModules[moduleIndex].lessons.filter(
        l => l.id !== lessonId
      );
      setCourseModules(updatedModules);
    }
  };

  // Toggle KSB in a module
  const toggleKsbInModule = (moduleId: string, ksbId: number) => {
    const moduleIndex = courseModules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const updatedModules = [...courseModules];
      const module = updatedModules[moduleIndex];
      
      if (module.ksbIds.includes(ksbId)) {
        // Remove KSB
        module.ksbIds = module.ksbIds.filter(id => id !== ksbId);
      } else {
        // Add KSB
        module.ksbIds.push(ksbId);
      }
      
      setCourseModules(updatedModules);
    }
  };

  // Add a KSB to currently selected module
  const addKsbToCurrentModule = (ksbId: number) => {
    if (selectedModule) {
      toggleKsbInModule(selectedModule, ksbId);
      setIsKsbDetailOpen(false);
    }
  };

  // Select all KSBs of a specific type for the current module
  const selectAllKsbsOfType = (type: "knowledge" | "skill" | "behavior") => {
    if (!selectedModule) return;
    
    const ksbsOfType = standardKSBs.filter(ksb => ksb.type === type);
    const ksbIds = ksbsOfType.map(ksb => ksb.id);
    
    const moduleIndex = courseModules.findIndex(m => m.id === selectedModule);
    if (moduleIndex !== -1) {
      const updatedModules = [...courseModules];
      const module = updatedModules[moduleIndex];
      
      // Add all KSBs of the specified type
      const updatedKsbIds = [...new Set([...module.ksbIds, ...ksbIds])];
      module.ksbIds = updatedKsbIds;
      
      setCourseModules(updatedModules);
    }
  };

  // Add a resource to a lesson
  const addResourceToLesson = (moduleId: string, lessonId: string, resource: any) => {
    const moduleIndex = courseModules.findIndex(m => m.id === moduleId);
    if (moduleIndex !== -1) {
      const lessonIndex = courseModules[moduleIndex].lessons.findIndex(l => l.id === lessonId);
      if (lessonIndex !== -1) {
        const updatedModules = [...courseModules];
        const lesson = updatedModules[moduleIndex].lessons[lessonIndex];
        
        // Update lesson with resource info
        lesson.title = resource.title;
        lesson.description = resource.description;
        lesson.content = resource.url;
        lesson.ksbIds = resource.ksbIds;
        
        setCourseModules(updatedModules);
        
        toast({
          title: "Resource Added",
          description: "Resource has been added to the lesson",
        });
      }
    }
  };

  // Save template with current modules and lessons
  const saveTemplate = async () => {
    try {
      const values = form.getValues();
      if (!values.title || !values.description || !values.standardId) {
        toast({
          title: "Required",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      if (courseModules.length === 0) {
        toast({
          title: "Required",
          description: "Please add at least one module to your course",
          variant: "destructive",
        });
        return;
      }

      const templateData = {
        ...values,
        modules: courseModules,
      };

      const response = await apiRequest("/api/course-builder/templates", {
        method: "POST",
        data: templateData,
      });

      toast({
        title: "Success",
        description: "Course template saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/course-builder/templates"] });
      
      // Clear draft after successful save
      if (user) {
        clearDraft(user.id);
        setHasDraft(false);
        setDraftTimestamp(null);
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save course template",
        variant: "destructive",
      });
    }
  };

  // Manual save draft
  const saveCurrentDraft = () => {
    if (user) {
      const currentState = {
        formValues: form.getValues(),
        courseModules,
        selectedModule,
        standardKSBs
      };
      saveDraft(currentState, user.id);
      setHasDraft(true);
      setDraftTimestamp(new Date().toISOString());
      
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved as a draft",
      });
    }
  };

  // Utility function to load and process standard information
  const loadStandardInfo = (data: any) => {
    if (data && data.ksbElements) {
      // Store KSB elements
      setStandardKSBs(data.ksbElements);
      
      // If auto-select all KSBs is enabled, pre-select all KSBs for modules
      if (autoSelectAllKsbs) {
        // Group KSBs by type for easier module assignment
        const knowledgeItems = data.ksbElements.filter((k: any) => k.type === 'knowledge');
        const skillItems = data.ksbElements.filter((k: any) => k.type === 'skill');
        const behaviorItems = data.ksbElements.filter((k: any) => k.type === 'behavior');
        
        // Pre-select appropriate KSBs for each module in generateSuggestedStructure
        const suggestedModules = generateSuggestedStructure([
          ...knowledgeItems,
          ...skillItems,
          ...behaviorItems
        ]);
        setCourseModules(suggestedModules);
      } else {
        // Just generate structure but don't pre-select KSBs
        const suggestedModules = generateSuggestedStructure(data.ksbElements);
        setCourseModules(suggestedModules);
      }

      // Update form with standard info if available
      if (data.standardId) {
        form.setValue("standardId", data.standardId);
      }
      
      toast({
        title: "Success",
        description: "Standard information loaded and course structure suggested",
      });
      
      return true;
    }
    return false;
  };
  
  // Handle standard analysis results
  const handleStandardAnalysisResults = (results: any) => {
    if (loadStandardInfo(results)) {
      // Close the analyzer
      setShowStandardAnalyzer(false);
    }
  };

  // Generate a suggested course structure from KSB elements
  const generateSuggestedStructure = (ksbElements: any[]) => {
    // Group KSBs by type
    const knowledgeItems = ksbElements.filter(k => k.type === 'knowledge');
    const skillItems = ksbElements.filter(k => k.type === 'skill');
    const behaviorItems = ksbElements.filter(k => k.type === 'behavior');
    
    // Create modules based on knowledge groups
    const modules: ModuleBlock[] = [];
    
    // Create a foundation module
    const foundationModule: ModuleBlock = {
      id: `module_${Date.now()}`,
      title: "Foundations and Core Knowledge",
      description: "Core knowledge and foundations for the apprenticeship",
      ksbIds: knowledgeItems.slice(0, Math.min(5, knowledgeItems.length)).map(k => k.id),
      order: 1,
      lessons: [
        {
          id: `lesson_${Date.now()}`,
          moduleId: `module_${Date.now()}`,
          title: "Introduction to the Standard",
          description: "Overview of the apprenticeship standard and expectations",
          type: "content",
          ksbIds: [],
          order: 1,
        }
      ]
    };
    modules.push(foundationModule);
    
    // Create a skills module
    if (skillItems.length > 0) {
      const skillsModule: ModuleBlock = {
        id: `module_${Date.now()+1}`,
        title: "Practical Skills Development",
        description: "Development of key practical skills",
        ksbIds: skillItems.slice(0, Math.min(5, skillItems.length)).map(k => k.id),
        order: 2,
        lessons: [
          {
            id: `lesson_${Date.now()+1}`,
            moduleId: `module_${Date.now()+1}`,
            title: "Core Skills Introduction",
            description: "Introduction to the core skills for this standard",
            type: "content",
            ksbIds: skillItems.slice(0, Math.min(3, skillItems.length)).map(k => k.id),
            order: 1,
          }
        ]
      };
      modules.push(skillsModule);
    }
    
    // Create a behaviors module
    if (behaviorItems.length > 0) {
      const behaviorsModule: ModuleBlock = {
        id: `module_${Date.now()+2}`,
        title: "Professional Behaviors",
        description: "Development of key professional behaviors",
        ksbIds: behaviorItems.slice(0, Math.min(5, behaviorItems.length)).map(k => k.id),
        order: 3,
        lessons: [
          {
            id: `lesson_${Date.now()+2}`,
            moduleId: `module_${Date.now()+2}`,
            title: "Professional Conduct and Expectations",
            description: "Introduction to professional behaviors and expectations",
            type: "content",
            ksbIds: behaviorItems.slice(0, Math.min(3, behaviorItems.length)).map(k => k.id),
            order: 1,
          }
        ]
      };
      modules.push(behaviorsModule);
    }
    
    // Add an assessment module
    const assessmentModule: ModuleBlock = {
      id: `module_${Date.now()+3}`,
      title: "Assessment Preparation",
      description: "Preparation for final assessment",
      ksbIds: [],
      order: modules.length + 1,
      lessons: [
        {
          id: `lesson_${Date.now()+3}`,
          moduleId: `module_${Date.now()+3}`,
          title: "Assessment Overview",
          description: "Overview of the assessment process and requirements",
          type: "content",
          ksbIds: [],
          order: 1,
        },
        {
          id: `lesson_${Date.now()+4}`,
          moduleId: `module_${Date.now()+3}`,
          title: "Mock Assessment",
          description: "Practice assessment activities",
          type: "assessment",
          ksbIds: [],
          order: 2,
        }
      ]
    };
    modules.push(assessmentModule);
    
    return modules;
  };

  // Calculate KSB counts for standard info card
  const getKsbCounts = () => {
    const knowledge = standardKSBs.filter(ksb => ksb.type === "knowledge").length;
    const skills = standardKSBs.filter(ksb => ksb.type === "skill").length;
    const behaviors = standardKSBs.filter(ksb => ksb.type === "behavior").length;
    
    return { knowledge, skills, behaviors };
  };

  // Show KSB details
  const showKsbDetails = (ksb: KsbElement) => {
    setSelectedKsb(ksb);
    setIsKsbDetailOpen(true);
  };

  // Selected standard info
  const selectedStandard = standards?.find((s: any) => s.id === form.getValues().standardId);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 py-6 px-6 md:px-8 lg:px-10">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Course Builder</h1>

            {/* Draft recovery dialog */}
            <Dialog open={hasDraftDialog} onOpenChange={setHasDraftDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recover Draft</DialogTitle>
                  <DialogDescription>
                    We found a saved draft from {draftTimestamp ? formatTimestamp(draftTimestamp) : 'earlier'}. Would you like to continue where you left off?
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={discardDraft}>
                    Discard Draft
                  </Button>
                  <Button onClick={loadDraftData}>
                    Load Draft
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Tabs defaultValue="builder" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="builder">Builder</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="analyzer">Standard Analyzer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="builder">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Course details form */}
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle>Course Details</CardTitle>
                        <CardDescription>
                          Define the basic information for your course template
                        </CardDescription>
                        
                        {/* Auto-save toggle */}
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch
                            id="auto-save"
                            checked={autoSaveEnabled}
                            onCheckedChange={setAutoSaveEnabled}
                          />
                          <label htmlFor="auto-save" className="text-sm font-medium">
                            Auto-save draft
                          </label>
                        </div>
                        
                        {/* Draft info */}
                        {hasDraft && draftTimestamp && (
                          <div className="flex items-center text-xs text-muted-foreground mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Draft saved at {formatTimestamp(draftTimestamp)}</span>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <Form {...form}>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter a title for your course" {...field} />
                                  </FormControl>
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
                                      placeholder="Describe what this course covers"
                                      className="resize-none min-h-[100px]"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="standardId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Apprenticeship Standard</FormLabel>
                                  <FormControl>
                                    <Select
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                      defaultValue={field.value?.toString()}
                                      value={field.value?.toString() || undefined}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a standard" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {standardsLoading ? (
                                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                                        ) : standards && standards.length > 0 ? (
                                          standards.map((standard: any) => (
                                            <SelectItem key={standard.id} value={standard.id.toString()}>
                                              {standard.title} (Level {standard.level})
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem value="none" disabled>No standards available</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="pt-2">
                              <h4 className="text-sm font-medium mb-2">Course Options</h4>
                              <div className="space-y-2">
                                <FormField
                                  control={form.control}
                                  name="includeResources"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Include learning resources
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="includeAssessments"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Include assessments
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="isPublic"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        Make this template public
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={autoSelectAllKsbs}
                                      onCheckedChange={setAutoSelectAllKsbs}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    Pre-select all KSBs
                                  </FormLabel>
                                </FormItem>
                              </div>
                            </div>
                          </div>
                        </Form>
                      </CardContent>
                      <CardFooter className="flex-col space-y-2">
                        <Button 
                          onClick={generateCourseStructure} 
                          className="w-full" 
                          disabled={!form.getValues().standardId || aiGenerating}
                        >
                          <Wand2 className="mr-2 h-4 w-4" />
                          {aiGenerating ? "Generating..." : "Generate with AI"}
                        </Button>
                        
                        <div className="flex w-full space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={saveCurrentDraft} 
                            className="flex-1"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Draft
                          </Button>
                          <Button 
                            onClick={saveTemplate} 
                            className="flex-1"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Save Template
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                    
                    {/* Display selected standard info */}
                    {selectedStandard && (
                      <div className="mt-4">
                        <StandardInfoCard
                          standard={selectedStandard}
                          ksbCounts={getKsbCounts()}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Middle panel: Course structure */}
                  <div className="lg:col-span-1">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle>Course Structure</CardTitle>
                        <CardDescription>
                          Define modules and lessons for your course
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {courseModules.length === 0 ? (
                          <div className="text-center py-12 border rounded-lg bg-gray-50">
                            <Layers className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-base font-medium">No modules yet</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {form.getValues().standardId
                                ? "Click 'Generate with AI' or add a module manually"
                                : "Select a standard first"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {courseModules
                              .sort((a, b) => a.order - b.order)
                              .map((module) => (
                                <Card key={module.id} className={`border ${selectedModule === module.id ? 'border-primary' : ''}`}>
                                  <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setSelectedModule(module.id)}>
                                    <div className="flex justify-between items-center">
                                      <div className="space-y-1">
                                        <CardTitle className="text-base">{module.title}</CardTitle>
                                        <CardDescription className="text-xs">
                                          Order: {module.order} | KSBs: {module.ksbIds.length}
                                        </CardDescription>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteModule(module.id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  
                                  {selectedModule === module.id && (
                                    <CardContent className="pt-0 px-4 pb-4">
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <label className="text-xs font-medium">Title</label>
                                          <Input
                                            value={module.title}
                                            onChange={(e) => updateModule(module.id, { title: e.target.value })}
                                            className="h-8 text-sm"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs font-medium">Description</label>
                                          <Textarea
                                            value={module.description}
                                            onChange={(e) => updateModule(module.id, { description: e.target.value })}
                                            className="h-20 text-sm resize-none"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs font-medium">Order</label>
                                          <Input
                                            type="number"
                                            value={module.order}
                                            onChange={(e) => updateModule(module.id, { order: parseInt(e.target.value) })}
                                            className="h-8 text-sm w-20"
                                            min={1}
                                          />
                                        </div>
                                        
                                        <Separator />
                                        
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-medium">Lessons</h4>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addLesson(module.id, "content")}
                                                className="h-7 px-2 text-xs"
                                              >
                                                <FileText className="h-3 w-3 mr-1" />
                                                Content
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addLesson(module.id, "assessment")}
                                                className="h-7 px-2 text-xs"
                                              >
                                                <BookOpen className="h-3 w-3 mr-1" />
                                                Assessment
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addLesson(module.id, "resource")}
                                                className="h-7 px-2 text-xs"
                                              >
                                                <BookOpen className="h-3 w-3 mr-1" />
                                                Resource
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          {module.lessons.length === 0 ? (
                                            <div className="text-center py-8 border rounded-lg bg-gray-50">
                                              <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                                              <h5 className="mt-2 text-sm font-medium">No lessons yet</h5>
                                              <p className="mt-1 text-xs text-gray-500">
                                                Add lessons to this module
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="space-y-4">
                                              {module.lessons.sort((a, b) => a.order - b.order).map((lesson) => (
                                                <div key={lesson.id} className="border rounded-lg p-4">
                                                  <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                      <Badge variant={
                                                        lesson.type === "content" ? "default" :
                                                        lesson.type === "assessment" ? "destructive" : "secondary"
                                                      }>
                                                        {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
                                                      </Badge>
                                                      <span className="text-xs text-gray-500">Order: {lesson.order}</span>
                                                    </div>
                                                    <Button 
                                                      variant="ghost" 
                                                      size="icon" 
                                                      onClick={() => deleteLesson(module.id, lesson.id)}
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                  
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                      <div className="space-y-1">
                                                        <label className="text-xs font-medium">Title</label>
                                                        <Input 
                                                          value={lesson.title}
                                                          onChange={(e) => updateLesson(
                                                            module.id, 
                                                            lesson.id, 
                                                            { title: e.target.value }
                                                          )}
                                                          className="h-8 text-sm"
                                                        />
                                                      </div>
                                                      <div className="space-y-1">
                                                        <label className="text-xs font-medium">Description</label>
                                                        <Textarea 
                                                          value={lesson.description}
                                                          onChange={(e) => updateLesson(
                                                            module.id,
                                                            lesson.id,
                                                            { description: e.target.value }
                                                          )}
                                                          className="h-20 text-sm resize-none"
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                      <div className="space-y-1">
                                                        <label className="text-xs font-medium">Order</label>
                                                        <Input
                                                          type="number"
                                                          value={lesson.order}
                                                          onChange={(e) => updateLesson(
                                                            module.id,
                                                            lesson.id,
                                                            { order: parseInt(e.target.value) }
                                                          )}
                                                          className="h-8 text-sm w-20"
                                                          min={1}
                                                        />
                                                      </div>
                                                      {lesson.type === "resource" && (
                                                        <div className="space-y-1">
                                                          <label className="text-xs font-medium">Resource URL</label>
                                                          <Input
                                                            value={lesson.content || ''}
                                                            onChange={(e) => updateLesson(
                                                              module.id,
                                                              lesson.id,
                                                              { content: e.target.value }
                                                            )}
                                                            className="h-8 text-sm"
                                                            placeholder="https://"
                                                          />
                                                        </div>
                                                      )}
                                                      {lesson.content && (
                                                        <Button 
                                                          variant="outline" 
                                                          size="sm"
                                                          className="mt-2 text-xs h-7"
                                                          onClick={() => window.open(lesson.content, '_blank')}
                                                        >
                                                          <Eye className="h-3 w-3 mr-1" />
                                                          View
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  )}
                                </Card>
                              ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button onClick={addModule} className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Module
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                  
                  {/* Right panel: KSBs and resources */}
                  <div className="lg:col-span-1">
                    <div className="grid grid-cols-1 gap-4">
                      {/* KSB selection panel */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Knowledge, Skills & Behaviors</CardTitle>
                          <CardDescription>
                            Select KSBs to include in the selected module
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!selectedModule ? (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertTitle>No module selected</AlertTitle>
                              <AlertDescription>
                                Select a module to add KSBs to it
                              </AlertDescription>
                            </Alert>
                          ) : standardKSBs.length === 0 ? (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertTitle>No KSBs available</AlertTitle>
                              <AlertDescription>
                                Select a standard first to load KSBs
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <KSBSelectionAccordion
                              ksbs={standardKSBs}
                              selectedKsbIds={courseModules.find(m => m.id === selectedModule)?.ksbIds || []}
                              onKsbToggle={(ksbId) => toggleKsbInModule(selectedModule, ksbId)}
                              onSelectAllType={(type) => selectAllKsbsOfType(type)}
                            />
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Resources panel */}
                      {form.getValues().standardId && (
                        <ResourcesPanel
                          standardId={form.getValues().standardId}
                          selectedKsbIds={selectedModule ? 
                            courseModules.find(m => m.id === selectedModule)?.ksbIds || [] : 
                            []
                          }
                          onAddResource={selectedModule && courseModules.find(m => m.id === selectedModule) ?
                            (resource) => addLesson(selectedModule, "resource")
                            : undefined
                          }
                        />
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Templates</CardTitle>
                    <CardDescription>
                      Browse and manage available course templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templatesLoading ? (
                      <div className="text-center py-8">Loading templates...</div>
                    ) : templates && templates.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template: any) => (
                          <Card key={template.id} className="cursor-pointer hover:bg-gray-50">
                            <CardHeader className="p-4 pb-2">
                              <CardTitle className="text-base">{template.title}</CardTitle>
                              <CardDescription className="text-xs">
                                Created by {template.createdBy?.firstName} {template.createdBy?.lastName}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <p className="text-sm line-clamp-2 mb-2">
                                {template.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline">
                                  {template.standard?.title}
                                </Badge>
                                {template.isPublic && (
                                  <Badge variant="secondary">Public</Badge>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                              <Button
                                variant="ghost"
                                className="w-full text-xs h-8"
                                onClick={() => {
                                  // Load template data into builder
                                  setSelectedTemplate(template);
                                  form.setValue("title", template.title);
                                  form.setValue("description", template.description);
                                  form.setValue("standardId", template.standardId);
                                  form.setValue("isPublic", template.isPublic);
                                  
                                  // Parse the structure from JSON
                                  const structure = typeof template.structure === 'string' 
                                    ? JSON.parse(template.structure) 
                                    : template.structure;
                                    
                                  if (structure?.modules) {
                                    setCourseModules(structure.modules);
                                  }
                                  
                                  // Switch to builder tab
                                  setActiveTab("builder");
                                  
                                  toast({
                                    title: "Template Loaded",
                                    description: "You can now edit this template",
                                  });
                                }}
                              >
                                Edit Template
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border rounded-lg bg-gray-50">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-base font-medium">No templates yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Create your first course template
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analyzer">
                <Card>
                  <CardHeader>
                    <CardTitle>Standard Analyzer</CardTitle>
                    <CardDescription>
                      Upload and analyze apprenticeship standard documents to extract KSBs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StandardAnalyzer 
                      onAnalysisComplete={handleStandardAnalysisResults}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <AppFooter />

      {/* KSB Detail Modal */}
      <KSBDetailModal
        isOpen={isKsbDetailOpen}
        onClose={() => setIsKsbDetailOpen(false)}
        ksb={selectedKsb}
        onAddToModule={addKsbToCurrentModule}
      />
    </div>
  );
}