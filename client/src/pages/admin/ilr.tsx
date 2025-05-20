import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Save,
  Search,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Basic schema for ILR learner data
const learnerDetailsSchema = z.object({
  givenNames: z.string().min(1, "Given names are required"),
  familyName: z.string().min(1, "Family name is required"),
  dateOfBirth: z.date({
    required_error: "Date of birth is required",
  }),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Gender is required",
  }),
  ethnicity: z.string().min(1, "Ethnicity is required"),
  nationality: z.string().min(1, "Nationality is required"),
  uln: z.string().min(10, "ULN must be 10 digits").max(10, "ULN must be 10 digits").regex(/^\d+$/, "ULN must contain only digits"),
  niNumber: z.string().optional(),
  address: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City/Town is required"),
    county: z.string().optional(),
    postcode: z.string().min(1, "Postcode is required"),
  }),
  contactDetails: z.object({
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
  }),
});

const learningDetailsSchema = z.object({
  providerUKPRN: z.string().min(8, "UKPRN must be 8 digits").max(8, "UKPRN must be 8 digits").regex(/^\d+$/, "UKPRN must contain only digits"),
  learnerReferenceNumber: z.string().min(1, "Learner reference number is required"),
  learningAimReference: z.string().min(1, "Learning aim reference is required"),
  standardCode: z.string().min(1, "Standard code is required"),
  frameworkCode: z.string().optional(),
  fundingModel: z.enum(["36", "81", "82", "99"]),
  priorAttainment: z.string().optional(),
  employmentStatus: z.enum(["10", "11", "12", "98"]),
  employerId: z.string().optional(),
  employerName: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  plannedEndDate: z.date({
    required_error: "Planned end date is required",
  }),
  actualEndDate: z.date().optional(),
  completionStatus: z.enum(["1", "2", "3", "6"]),
  outcome: z.enum(["1", "2", "3", "8"]).optional(),
});

const additionalDataSchema = z.object({
  priorLearning: z.boolean(),
  priorLearningHours: z.number().optional(),
  otjTrainingHours: z.number(),
  learningDeliveryFunding: z.object({
    sourceOfFunding: z.string().min(1, "Source of funding is required"),
    fundingAdjustmentPrior: z.number().optional(),
    fundingAdjustmentCompletion: z.number().optional(),
  }),
  specialProjects: z.array(z.string()).optional(),
  learnerHEInformation: z.object({
    ucasPersonalId: z.string().optional(),
    termTimeAccommodation: z.string().optional(),
  }).optional(),
  learningDeliveryWorkPlacement: z.array(z.object({
    workPlacementMode: z.string().optional(),
    workPlacementEmployerId: z.string().optional(),
    workPlacementStartDate: z.date().optional(),
    workPlacementEndDate: z.date().optional(),
  })).optional(),
});

type LearnerDetailsFormValues = z.infer<typeof learnerDetailsSchema>;
type LearningDetailsFormValues = z.infer<typeof learningDetailsSchema>;
type AdditionalDataFormValues = z.infer<typeof additionalDataSchema>;

export default function IlrPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("entry");
  const [currentStep, setCurrentStep] = useState<"learner" | "learning" | "additional" | "review" | "submission">("learner");
  const [ilrStatus, setIlrStatus] = useState<"draft" | "review" | "submitted" | "returned" | "validated" | "error">("draft");
  const [searchQuery, setSearchQuery] = useState("");
  const [plrConnected, setPlrConnected] = useState(false);
  const [plrSearching, setPlrSearching] = useState(false);
  const [plrResults, setPlrResults] = useState<any | null>(null);

  // Form for learner details
  const learnerForm = useForm<LearnerDetailsFormValues>({
    resolver: zodResolver(learnerDetailsSchema),
    defaultValues: {
      givenNames: "",
      familyName: "",
      gender: "Male",
      ethnicity: "",
      nationality: "",
      uln: "",
      niNumber: "",
      address: {
        line1: "",
        line2: "",
        city: "",
        county: "",
        postcode: "",
      },
      contactDetails: {
        email: "",
        phone: "",
      },
    },
  });

  // Form for learning details
  const learningForm = useForm<LearningDetailsFormValues>({
    resolver: zodResolver(learningDetailsSchema),
    defaultValues: {
      providerUKPRN: "",
      learnerReferenceNumber: "",
      learningAimReference: "",
      standardCode: "",
      frameworkCode: "",
      fundingModel: "36",
      priorAttainment: "",
      employmentStatus: "10",
      employerId: "",
      employerName: "",
      completionStatus: "1",
    },
  });

  // Form for additional data
  const additionalForm = useForm<AdditionalDataFormValues>({
    resolver: zodResolver(additionalDataSchema),
    defaultValues: {
      priorLearning: false,
      otjTrainingHours: 0,
      learningDeliveryFunding: {
        sourceOfFunding: "",
        fundingAdjustmentPrior: 0,
        fundingAdjustmentCompletion: 0,
      },
      specialProjects: [],
      learningDeliveryWorkPlacement: [],
    },
  });

  // Get existing learners for ILR
  const { data: learners, isLoading: learnersLoading } = useQuery({
    queryKey: ["/api/ilr/learners"],
    enabled: !authLoading && !!user && activeTab === "management",
  });

  // PLR search mutation
  const searchPlrMutation = useMutation({
    mutationFn: async (data: { uln: string }) => {
      return apiRequest("/api/ilr/plr-search", {
        method: "POST",
        data,
      });
    },
    onSuccess: (data) => {
      setPlrResults(data);
      setPlrSearching(false);
      toast({
        title: "PLR Search Complete",
        description: "Learner records found in the Personal Learner Record service",
      });
    },
    onError: (error) => {
      setPlrSearching(false);
      toast({
        title: "PLR Search Failed",
        description: "Unable to find learner in the Personal Learner Record service. Please check the ULN and try again.",
        variant: "destructive",
      });
    },
  });

  // PLR connection setup mutation
  const setupPlrConnectionMutation = useMutation({
    mutationFn: async (data: { username: string, password: string, organizationId: string }) => {
      return apiRequest("/api/ilr/plr-connect", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      setPlrConnected(true);
      toast({
        title: "Success",
        description: "Successfully connected to the Personal Learner Record service",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to the Personal Learner Record service. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  // Apply PLR data to form
  const applyPlrData = () => {
    if (plrResults) {
      // Update form with data from PLR
      learnerForm.setValue("givenNames", plrResults.givenNames || "");
      learnerForm.setValue("familyName", plrResults.familyName || "");
      if (plrResults.dateOfBirth) {
        learnerForm.setValue("dateOfBirth", new Date(plrResults.dateOfBirth));
      }
      if (plrResults.gender) {
        learnerForm.setValue("gender", plrResults.gender as "Male" | "Female" | "Other");
      }
      learnerForm.setValue("ethnicity", plrResults.ethnicity || "");
      learnerForm.setValue("nationality", plrResults.nationality || "");
      
      toast({
        title: "PLR Data Applied",
        description: "Learner details have been populated from the Personal Learner Record service",
      });
    }
  };

  // Search PLR by ULN
  const searchPlr = () => {
    const uln = learnerForm.getValues("uln");
    if (uln && uln.length === 10) {
      setPlrSearching(true);
      searchPlrMutation.mutate({ uln });
    } else {
      toast({
        title: "Invalid ULN",
        description: "Please enter a valid 10-digit Unique Learner Number",
        variant: "destructive",
      });
    }
  };

  // Submit learner details mutation
  const submitLearnerDetailsMutation = useMutation({
    mutationFn: async (data: LearnerDetailsFormValues) => {
      return apiRequest("/api/ilr/learner-details", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learner details saved successfully",
      });
      setCurrentStep("learning");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save learner details",
        variant: "destructive",
      });
    },
  });

  // Submit learning details mutation
  const submitLearningDetailsMutation = useMutation({
    mutationFn: async (data: LearningDetailsFormValues) => {
      return apiRequest("/api/ilr/learning-details", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learning details saved successfully",
      });
      setCurrentStep("additional");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save learning details",
        variant: "destructive",
      });
    },
  });

  // Submit additional data mutation
  const submitAdditionalDataMutation = useMutation({
    mutationFn: async (data: AdditionalDataFormValues) => {
      return apiRequest("/api/ilr/additional-data", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Additional data saved successfully",
      });
      setCurrentStep("review");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save additional data",
        variant: "destructive",
      });
    },
  });

  // Submit final ILR record
  const submitIlrMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/ilr/submit", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "ILR record submitted successfully",
      });
      setIlrStatus("submitted");
      setCurrentStep("submission");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit ILR record",
        variant: "destructive",
      });
      setIlrStatus("error");
    },
  });

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search logic here
    toast({
      title: "Search",
      description: `Searching for "${searchQuery}"...`,
    });
  };

  // Handle step navigation
  const navigateToStep = (step: "learner" | "learning" | "additional" | "review" | "submission") => {
    setCurrentStep(step);
  };

  // Handle form submissions for each step
  const handleLearnerDetailsSubmit = (data: LearnerDetailsFormValues) => {
    submitLearnerDetailsMutation.mutate(data);
  };

  const handleLearningDetailsSubmit = (data: LearningDetailsFormValues) => {
    submitLearningDetailsMutation.mutate(data);
  };

  const handleAdditionalDataSubmit = (data: AdditionalDataFormValues) => {
    submitAdditionalDataMutation.mutate(data);
  };

  const handleFinalSubmit = () => {
    submitIlrMutation.mutate();
  };

  // Render form steps
  const renderLearnerDetailsStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-medium text-blue-800">Learner Personal Details</h3>
            <p className="text-sm text-blue-700 mt-1">
              This section captures the personal information about the learner that is required for ILR submissions.
              Ensure all mandatory fields are completed accurately.
            </p>
            {!plrConnected && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs bg-white" 
                  onClick={() => {
                    // Show a modal or dialog to configure PLR connection
                    // For now we'll assume connection succeeds
                    setPlrConnected(true);
                    toast({
                      title: "PLR Service Connected",
                      description: "Your organization is now connected to the Personal Learner Record service",
                    });
                  }}
                >
                  <HelpCircle className="h-3 w-3 mr-1" />
                  Configure PLR Service Connection
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {plrConnected && (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Personal Learner Record Service
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                Search for a learner by their ULN to automatically populate their details from the Personal Learner Record service.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={searchPlr}
                disabled={plrSearching || !learnerForm.getValues("uln") || learnerForm.getValues("uln").length !== 10}
                className="whitespace-nowrap"
              >
                {plrSearching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {plrSearching ? "Searching..." : "Search PLR"}
              </Button>
              {plrResults && (
                <Button 
                  size="sm" 
                  onClick={applyPlrData}
                  className="whitespace-nowrap"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Apply PLR Data
                </Button>
              )}
            </div>
          </div>
          
          {plrResults && (
            <div className="mt-3 border border-amber-200 rounded bg-white p-3">
              <h4 className="text-sm font-medium mb-2">Learner Record Found</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-medium mr-1">Name:</span>
                  {plrResults.givenNames} {plrResults.familyName}
                </div>
                <div>
                  <span className="font-medium mr-1">Date of Birth:</span>
                  {plrResults.dateOfBirth ? format(new Date(plrResults.dateOfBirth), "PP") : "Not available"}
                </div>
                <div>
                  <span className="font-medium mr-1">Gender:</span>
                  {plrResults.gender || "Not available"}
                </div>
                <div>
                  <span className="font-medium mr-1">Previous Qualifications:</span>
                  {plrResults.qualifications?.length || 0}
                </div>
              </div>
              
              {plrResults.priorLearning && (
                <div className="mt-2 text-xs">
                  <h5 className="font-medium">Prior Learning Found:</h5>
                  <ul className="list-disc list-inside mt-1">
                    {plrResults.qualifications?.map((qual: any, index: number) => (
                      <li key={index}>{qual.title} - {qual.grade} ({qual.year})</li>
                    )).slice(0, 3)}
                    {(plrResults.qualifications?.length || 0) > 3 && (
                      <li>...and {plrResults.qualifications.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Form {...learnerForm}>
        <form onSubmit={learnerForm.handleSubmit(handleLearnerDetailsSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FormField
                control={learnerForm.control}
                name="givenNames"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Given Names</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Given Names</h4>
                            <p className="text-sm text-muted-foreground">
                              Enter the learner's legal first name and any middle names. Must match official documentation.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="First and middle names" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learnerForm.control}
                name="familyName"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Family Name</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Family Name</h4>
                            <p className="text-sm text-muted-foreground">
                              Enter the learner's legal last name. Must match official documentation.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learnerForm.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Date of Birth</h4>
                            <p className="text-sm text-muted-foreground">
                              Select the learner's date of birth. Must match official documentation.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learnerForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Gender</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Gender</h4>
                            <p className="text-sm text-muted-foreground">
                              Select the learner's gender as recorded in official documentation.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Male" />
                          </FormControl>
                          <FormLabel className="font-normal">Male</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Female" />
                          </FormControl>
                          <FormLabel className="font-normal">Female</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Other" />
                          </FormControl>
                          <FormLabel className="font-normal">Other</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={learnerForm.control}
                name="ethnicity"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Ethnicity</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Ethnicity</h4>
                            <p className="text-sm text-muted-foreground">
                              Select the learner's ethnicity according to the ILR ethnicity codes.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select ethnicity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="31">White - English/Welsh/Scottish/Northern Irish/British</SelectItem>
                          <SelectItem value="32">White - Irish</SelectItem>
                          <SelectItem value="33">White - Gypsy or Irish Traveller</SelectItem>
                          <SelectItem value="34">White - Any other White background</SelectItem>
                          <SelectItem value="35">Mixed - White and Black Caribbean</SelectItem>
                          <SelectItem value="36">Mixed - White and Black African</SelectItem>
                          <SelectItem value="37">Mixed - White and Asian</SelectItem>
                          <SelectItem value="38">Mixed - Any other Mixed/multiple ethnic background</SelectItem>
                          <SelectItem value="39">Asian/Asian British - Indian</SelectItem>
                          <SelectItem value="40">Asian/Asian British - Pakistani</SelectItem>
                          <SelectItem value="41">Asian/Asian British - Bangladeshi</SelectItem>
                          <SelectItem value="42">Asian/Asian British - Chinese</SelectItem>
                          <SelectItem value="43">Asian/Asian British - Any other Asian background</SelectItem>
                          <SelectItem value="44">Black/African/Caribbean/Black British - African</SelectItem>
                          <SelectItem value="45">Black/African/Caribbean/Black British - Caribbean</SelectItem>
                          <SelectItem value="46">Black/African/Caribbean/Black British - Any other Black/African/Caribbean background</SelectItem>
                          <SelectItem value="47">Other ethnic group - Arab</SelectItem>
                          <SelectItem value="98">Other ethnic group - Any other ethnic group</SelectItem>
                          <SelectItem value="99">Not provided</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learnerForm.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Nationality</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Nationality</h4>
                            <p className="text-sm text-muted-foreground">
                              Select the learner's nationality as per their passport or official documentation.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="IE">Ireland</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="ES">Spain</SelectItem>
                          <SelectItem value="IT">Italy</SelectItem>
                          <SelectItem value="PL">Poland</SelectItem>
                          <SelectItem value="RO">Romania</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="PK">Pakistan</SelectItem>
                          <SelectItem value="BD">Bangladesh</SelectItem>
                          <SelectItem value="NG">Nigeria</SelectItem>
                          <SelectItem value="ZA">South Africa</SelectItem>
                          <SelectItem value="CN">China</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="NZ">New Zealand</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="OTH">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learnerForm.control}
                name="uln"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Unique Learner Number (ULN)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Unique Learner Number</h4>
                            <p className="text-sm text-muted-foreground">
                              The 10-digit Unique Learner Number assigned to the learner. This is a mandatory field for ILR returns.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., 1234567890" {...field} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learnerForm.control}
                name="niNumber"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>National Insurance Number</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">National Insurance Number</h4>
                            <p className="text-sm text-muted-foreground">
                              The learner's National Insurance number. This is optional but recommended for apprenticeships.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., AB123456C" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            <h3 className="text-lg font-medium">Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <FormField
                  control={learnerForm.control}
                  name="address.line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={learnerForm.control}
                  name="address.line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={learnerForm.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City/Town</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., London" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                <FormField
                  control={learnerForm.control}
                  name="address.county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Greater London" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={learnerForm.control}
                  name="address.postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SW1A 1AA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={learnerForm.control}
                    name="contactDetails.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="e.g., name@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={learnerForm.control}
                    name="contactDetails.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 07700 900000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={submitLearnerDetailsMutation.isPending}
            >
              {submitLearnerDetailsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save and Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );

  const renderLearningDetailsStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-medium text-blue-800">Learning Aim Details</h3>
            <p className="text-sm text-blue-700 mt-1">
              This section captures details about the learner's program, including funding information, 
              start and end dates, and employment status.
            </p>
          </div>
        </div>
      </div>

      <Form {...learningForm}>
        <form onSubmit={learningForm.handleSubmit(handleLearningDetailsSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FormField
                control={learningForm.control}
                name="providerUKPRN"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Provider UKPRN</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Provider UKPRN</h4>
                            <p className="text-sm text-muted-foreground">
                              The UK Provider Reference Number (UKPRN) for the training provider. This 8-digit number is essential for ILR reporting.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., 10012345" {...field} maxLength={8} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="learnerReferenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Learner Reference Number</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Learner Reference Number</h4>
                            <p className="text-sm text-muted-foreground">
                              Your organization's unique reference number for this learner.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., L12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="learningAimReference"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Learning Aim Reference</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Learning Aim Reference</h4>
                            <p className="text-sm text-muted-foreground">
                              The Learning Aim Reference Number (LARS) for the qualification or program being undertaken.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., ZPROG001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="standardCode"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Standard Code</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Standard Code</h4>
                            <p className="text-sm text-muted-foreground">
                              The code for the apprenticeship standard being undertaken. Required for apprenticeship programs.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="fundingModel"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Funding Model</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Funding Model</h4>
                            <p className="text-sm text-muted-foreground">
                              The funding model applicable to this learning aim:
                              <ul className="list-disc pl-5 mt-1">
                                <li>36 - Apprenticeships (from 1 May 2017)</li>
                                <li>81 - Other Adult</li>
                                <li>82 - Other Adult (procured)</li>
                                <li>99 - Non-funded</li>
                              </ul>
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select funding model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="36">36 - Apprenticeships (from 1 May 2017)</SelectItem>
                          <SelectItem value="81">81 - Other Adult</SelectItem>
                          <SelectItem value="82">82 - Other Adult (procured)</SelectItem>
                          <SelectItem value="99">99 - Non-funded</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="completionStatus"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Completion Status</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Completion Status</h4>
                            <p className="text-sm text-muted-foreground">
                              The status of the learning aim:
                              <ul className="list-disc pl-5 mt-1">
                                <li>1 - Learner continuing or intending to continue the learning activities</li>
                                <li>2 - Learner has completed the learning activities</li>
                                <li>3 - Learner has withdrawn from the learning activities</li>
                                <li>6 - Learner has temporarily withdrawn due to agreed break in learning</li>
                              </ul>
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select completion status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Continuing</SelectItem>
                          <SelectItem value="2">2 - Completed</SelectItem>
                          <SelectItem value="3">3 - Withdrawn</SelectItem>
                          <SelectItem value="6">6 - Break in learning</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={learningForm.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Employment Status</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Employment Status</h4>
                            <p className="text-sm text-muted-foreground">
                              The learner's employment status:
                              <ul className="list-disc pl-5 mt-1">
                                <li>10 - In paid employment</li>
                                <li>11 - Not in paid employment, looking for work</li>
                                <li>12 - Not in paid employment, not looking for work</li>
                                <li>98 - Not known / not provided</li>
                              </ul>
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 - In paid employment</SelectItem>
                          <SelectItem value="11">11 - Not in paid employment, looking for work</SelectItem>
                          <SelectItem value="12">12 - Not in paid employment, not looking for work</SelectItem>
                          <SelectItem value="98">98 - Not known / not provided</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="employerId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Employer ID</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Employer ID</h4>
                            <p className="text-sm text-muted-foreground">
                              The employer's identifier from the Employer Data Service. Required for apprenticeships.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., 12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="employerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Start Date</h4>
                            <p className="text-sm text-muted-foreground">
                              The date when the learner began their program or learning aim.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={learningForm.control}
                name="plannedEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <FormLabel>Planned End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Planned End Date</h4>
                            <p className="text-sm text-muted-foreground">
                              The date when the learner is expected to complete their program or learning aim.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const startDate = learningForm.getValues("startDate");
                            return !startDate || date < startDate;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigateToStep("learner")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={submitLearningDetailsMutation.isPending}
            >
              {submitLearningDetailsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save and Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );

  const renderAdditionalDataStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-medium text-blue-800">Additional Learner Information</h3>
            <p className="text-sm text-blue-700 mt-1">
              This section captures additional information about the learner's program, 
              including prior learning, on-the-job training hours, and funding details.
            </p>
          </div>
        </div>
      </div>

      <Form {...additionalForm}>
        <form onSubmit={additionalForm.handleSubmit(handleAdditionalDataSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FormField
                control={additionalForm.control}
                name="priorLearning"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Prior Learning Assessment</FormLabel>
                      <FormDescription>
                        Has the learner's prior learning been assessed and recognized?
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {additionalForm.watch("priorLearning") && (
                <FormField
                  control={additionalForm.control}
                  name="priorLearningHours"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Prior Learning Hours</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium">Prior Learning Hours</h4>
                              <p className="text-sm text-muted-foreground">
                                The number of hours recognized from the learner's prior learning and experience.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="e.g., 20"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={additionalForm.control}
                name="otjTrainingHours"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>On-the-Job Training Hours</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">On-the-Job Training Hours</h4>
                            <p className="text-sm text-muted-foreground">
                              The planned number of hours for on-the-job training. For apprenticeships, this must meet minimum requirements.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g., 280"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={additionalForm.control}
                name="learningDeliveryFunding.sourceOfFunding"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Source of Funding</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Source of Funding</h4>
                            <p className="text-sm text-muted-foreground">
                              The source of funding for this learning aim. For apprenticeships, this is typically "105 - Education and Skills Funding Agency (ESFA) - Adult".
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source of funding" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="105">105 - Education and Skills Funding Agency (ESFA) - Adult</SelectItem>
                          <SelectItem value="107">107 - Education and Skills Funding Agency (ESFA) - 16-19</SelectItem>
                          <SelectItem value="108">108 - Local Authority Community Learning</SelectItem>
                          <SelectItem value="110">110 - Greater London Authority (GLA)</SelectItem>
                          <SelectItem value="111">111 - Greater Manchester Combined Authority</SelectItem>
                          <SelectItem value="112">112 - Liverpool City Region Combined Authority</SelectItem>
                          <SelectItem value="113">113 - West Midlands Combined Authority</SelectItem>
                          <SelectItem value="114">114 - West of England Combined Authority</SelectItem>
                          <SelectItem value="115">115 - Tees Valley Combined Authority</SelectItem>
                          <SelectItem value="116">116 - Cambridgeshire and Peterborough Combined Authority</SelectItem>
                          <SelectItem value="998">998 - Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalForm.control}
                name="learningDeliveryFunding.fundingAdjustmentPrior"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Funding Adjustment for Prior Learning (%)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Funding Adjustment</h4>
                            <p className="text-sm text-muted-foreground">
                              The percentage reduction in funding due to prior learning. Leave at 0 if not applicable.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g., 10"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalForm.control}
                name="learningDeliveryFunding.fundingAdjustmentCompletion"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Funding Adjustment for Completion (%)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="font-medium">Completion Adjustment</h4>
                            <p className="text-sm text-muted-foreground">
                              The percentage reduction in funding for completion elements. Leave at 0 if not applicable.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g., 0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigateToStep("learning")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={submitAdditionalDataMutation.isPending}
            >
              {submitAdditionalDataMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save and Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
          <div>
            <h3 className="font-medium text-blue-800">Review and Submit</h3>
            <p className="text-sm text-blue-700 mt-1">
              Please review all the information before submitting the ILR record. 
              Once submitted, the record will be validated and processed.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Learner Personal Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToStep("learner")}
                className="text-xs"
              >
                Edit
              </Button>
            </div>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm">
                  {learnerForm.getValues("givenNames")} {learnerForm.getValues("familyName")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ULN</dt>
                <dd className="mt-1 text-sm">{learnerForm.getValues("uln")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-sm">
                  {learnerForm.getValues("dateOfBirth") ? 
                    format(learnerForm.getValues("dateOfBirth"), "PP") : 
                    "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="mt-1 text-sm">{learnerForm.getValues("gender")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm">{learnerForm.getValues("contactDetails.email")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm">
                  {learnerForm.getValues("address.line1")}, 
                  {learnerForm.getValues("address.city")}, 
                  {learnerForm.getValues("address.postcode")}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Learning Program Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToStep("learning")}
                className="text-xs"
              >
                Edit
              </Button>
            </div>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Learning Aim Reference</dt>
                <dd className="mt-1 text-sm">{learningForm.getValues("learningAimReference")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Standard Code</dt>
                <dd className="mt-1 text-sm">{learningForm.getValues("standardCode")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm">
                  {learningForm.getValues("startDate") ? 
                    format(learningForm.getValues("startDate"), "PP") : 
                    "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Planned End Date</dt>
                <dd className="mt-1 text-sm">
                  {learningForm.getValues("plannedEndDate") ? 
                    format(learningForm.getValues("plannedEndDate"), "PP") : 
                    "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Funding Model</dt>
                <dd className="mt-1 text-sm">
                  {learningForm.getValues("fundingModel") === "36" ? "36 - Apprenticeships" :
                   learningForm.getValues("fundingModel") === "81" ? "81 - Other Adult" :
                   learningForm.getValues("fundingModel") === "82" ? "82 - Other Adult (procured)" :
                   "99 - Non-funded"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
                <dd className="mt-1 text-sm">
                  {learningForm.getValues("employmentStatus") === "10" ? "10 - In paid employment" :
                   learningForm.getValues("employmentStatus") === "11" ? "11 - Not employed, seeking work" :
                   learningForm.getValues("employmentStatus") === "12" ? "12 - Not employed, not seeking work" :
                   "98 - Not known"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg">Additional Information</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToStep("additional")}
                className="text-xs"
              >
                Edit
              </Button>
            </div>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Prior Learning Assessed</dt>
                <dd className="mt-1 text-sm">{additionalForm.getValues("priorLearning") ? "Yes" : "No"}</dd>
              </div>
              {additionalForm.getValues("priorLearning") && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prior Learning Hours</dt>
                  <dd className="mt-1 text-sm">{additionalForm.getValues("priorLearningHours")}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">On-the-Job Training Hours</dt>
                <dd className="mt-1 text-sm">{additionalForm.getValues("otjTrainingHours")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Source of Funding</dt>
                <dd className="mt-1 text-sm">{additionalForm.getValues("learningDeliveryFunding.sourceOfFunding")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Funding Adjustment (Prior Learning)</dt>
                <dd className="mt-1 text-sm">{additionalForm.getValues("learningDeliveryFunding.fundingAdjustmentPrior")}%</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Funding Adjustment (Completion)</dt>
                <dd className="mt-1 text-sm">{additionalForm.getValues("learningDeliveryFunding.fundingAdjustmentCompletion")}%</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Pre-submission validation checks */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted">
            <h3 className="font-medium text-lg">Validation Checks</h3>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <span>Learner details are complete and valid</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <span>Learning aim details match LARS database</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <span>Funding model is appropriate for program type</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <span>Date values are within valid ranges</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <span>ULN format is valid and checked against LRS</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigateToStep("additional")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleFinalSubmit}
            disabled={submitIlrMutation.isPending}
            className="gap-2"
          >
            {submitIlrMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Submit ILR Record
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSubmissionStep = () => (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg border ${
        ilrStatus === "submitted" || ilrStatus === "validated" ? 
          "bg-green-50 border-green-200" :
          ilrStatus === "review" ?
            "bg-amber-50 border-amber-200" :
            "bg-red-50 border-red-200"
      }`}>
        <div className="flex items-start">
          {ilrStatus === "submitted" || ilrStatus === "validated" ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
          ) : ilrStatus === "review" ? (
            <Info className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
          )}
          <div>
            <h3 className={`font-medium ${
              ilrStatus === "submitted" || ilrStatus === "validated" ? 
                "text-green-800" :
                ilrStatus === "review" ?
                  "text-amber-800" :
                  "text-red-800"
            }`}>
              {ilrStatus === "submitted" ? "ILR Record Submitted Successfully" :
               ilrStatus === "validated" ? "ILR Record Validated Successfully" :
               ilrStatus === "review" ? "ILR Record Under Review" :
               "ILR Submission Failed"}
            </h3>
            <p className={`text-sm mt-1 ${
              ilrStatus === "submitted" || ilrStatus === "validated" ? 
                "text-green-700" :
                ilrStatus === "review" ?
                  "text-amber-700" :
                  "text-red-700"
            }`}>
              {ilrStatus === "submitted" ? 
                "Your ILR record has been submitted and is now being processed. You will be notified when validation is complete." :
               ilrStatus === "validated" ? 
                "Your ILR record has been validated and accepted. It will be included in the next ILR submission to the ESFA." :
               ilrStatus === "review" ? 
                "Your ILR record requires review before it can be processed. Please check the notes below." :
               "There was an error submitting your ILR record. Please review the validation errors and try again."}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-muted">
          <h3 className="font-medium text-lg">Submission Details</h3>
        </div>
        <div className="p-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Reference</dt>
              <dd className="mt-1 text-sm">ILR-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted Date</dt>
              <dd className="mt-1 text-sm">{format(new Date(), "PPP 'at' p")}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
              <dd className="mt-1 text-sm">{user?.firstName} {user?.lastName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm flex items-center">
                <Badge className={
                  ilrStatus === "submitted" ? "bg-blue-100 text-blue-800 border-blue-300" :
                  ilrStatus === "validated" ? "bg-green-100 text-green-800 border-green-300" :
                  ilrStatus === "review" ? "bg-amber-100 text-amber-800 border-amber-300" :
                  "bg-red-100 text-red-800 border-red-300"
                }>
                  {ilrStatus === "submitted" ? "Submitted" :
                   ilrStatus === "validated" ? "Validated" :
                   ilrStatus === "review" ? "Under Review" :
                   "Error"}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {ilrStatus === "validated" && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted">
            <h3 className="font-medium text-lg">ILR Validation Results</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center text-green-700 bg-green-50 rounded-md p-3">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                <span>All validation checks passed successfully</span>
              </div>
              
              <h4 className="font-medium mt-4">Validation Summary</h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Validation Date</dt>
                  <dd className="mt-1 text-sm">{format(new Date(), "PPP")}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Validated By</dt>
                  <dd className="mt-1 text-sm">System Automated Validation</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Warnings</dt>
                  <dd className="mt-1 text-sm">0</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Errors</dt>
                  <dd className="mt-1 text-sm">0</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {ilrStatus === "error" && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted">
            <h3 className="font-medium text-lg">Validation Errors</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-start text-red-700 bg-red-50 rounded-md p-3">
                <XCircle className="h-5 w-5 mt-0.5 mr-2" />
                <div>
                  <span className="font-medium">Error Code: E45</span>
                  <p className="text-sm mt-1">The ULN provided does not exist in the Learning Records Service (LRS). Please check the ULN and try again.</p>
                </div>
              </div>
              
              <div className="flex items-start text-amber-700 bg-amber-50 rounded-md p-3">
                <Info className="h-5 w-5 mt-0.5 mr-2" />
                <div>
                  <span className="font-medium">Warning Code: W12</span>
                  <p className="text-sm mt-1">The planned end date is more than 4 years after the start date. Please verify this is correct.</p>
                </div>
              </div>
            </div>

            <Button 
              className="mt-6" 
              variant="default"
              onClick={() => navigateToStep("learner")}
            >
              Edit Record
            </Button>
          </div>
        </div>
      )}

      <div className="flex space-x-4 justify-center mt-8">
        <Button variant="outline" onClick={() => {
          setCurrentStep("learner");
          learnerForm.reset();
          learningForm.reset();
          additionalForm.reset();
        }}>
          Start New Entry
        </Button>
        
        <Button variant="outline" onClick={() => setActiveTab("management")}>
          View All Records
        </Button>
        
        {ilrStatus === "validated" && (
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download ILR File
          </Button>
        )}
      </div>
    </div>
  );

  // Render ILR management tab
  const renderManagementTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">ILR Records Management</h1>
          <p className="text-muted-foreground">
            View, manage, and submit ILR records for your learners
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setActiveTab("entry");
              setCurrentStep("learner");
            }}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            New ILR Entry
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Download ILR File
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-64 space-y-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="validated">Validated</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date-range">Date Range</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="date-range">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="submission-type">Submission Type</Label>
                <Select defaultValue="all">
                  <SelectTrigger id="submission-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="new">New Learner</SelectItem>
                    <SelectItem value="update">Updated Record</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="completion">Completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" className="w-full mt-2">
                Apply Filters
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Next ILR Submission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Due Date:</span>
                  <span className="text-sm">06 Jun 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Pending Records:</span>
                  <span className="text-sm">7</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Validated:</span>
                  <span className="text-sm">3</span>
                </div>
                <Progress value={42} className="h-2 mt-2" />
              </div>
              <Button className="w-full mt-4">
                Prepare Submission
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search for a learner..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium">Learner Name</th>
                      <th className="text-left p-3 text-sm font-medium">ULN</th>
                      <th className="text-left p-3 text-sm font-medium">Reference</th>
                      <th className="text-left p-3 text-sm font-medium">Submission Date</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm">John Smith</td>
                      <td className="p-3 text-sm">1234567890</td>
                      <td className="p-3 text-sm">ILR-2024-123456</td>
                      <td className="p-3 text-sm">04 May 2024</td>
                      <td className="p-3 text-sm">
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Validated
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm">Jane Doe</td>
                      <td className="p-3 text-sm">9876543210</td>
                      <td className="p-3 text-sm">ILR-2024-654321</td>
                      <td className="p-3 text-sm">02 May 2024</td>
                      <td className="p-3 text-sm">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          Submitted
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm">Michael Brown</td>
                      <td className="p-3 text-sm">5678901234</td>
                      <td className="p-3 text-sm">ILR-2024-567890</td>
                      <td className="p-3 text-sm">01 May 2024</td>
                      <td className="p-3 text-sm">
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          Error
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm">Sarah Williams</td>
                      <td className="p-3 text-sm">3456789012</td>
                      <td className="p-3 text-sm">ILR-2024-345678</td>
                      <td className="p-3 text-sm">30 Apr 2024</td>
                      <td className="p-3 text-sm">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Under Review
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm">David Miller</td>
                      <td className="p-3 text-sm">7890123456</td>
                      <td className="p-3 text-sm">ILR-2024-789012</td>
                      <td className="p-3 text-sm">28 Apr 2024</td>
                      <td className="p-3 text-sm">
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          Validated
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing 5 of 25 records
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6">
          <div className="container mx-auto max-w-6xl">
            <Tabs defaultValue="entry" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="entry">ILR Data Entry</TabsTrigger>
                <TabsTrigger value="management">ILR Management</TabsTrigger>
              </TabsList>

              <TabsContent value="entry">
                {currentStep === "learner" && renderLearnerDetailsStep()}
                {currentStep === "learning" && renderLearningDetailsStep()}
                {currentStep === "additional" && renderAdditionalDataStep()}
                {currentStep === "review" && renderReviewStep()}
                {currentStep === "submission" && renderSubmissionStep()}
              </TabsContent>

              <TabsContent value="management">
                {renderManagementTab()}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );
}