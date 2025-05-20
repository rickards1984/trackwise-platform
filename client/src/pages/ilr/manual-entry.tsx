import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function ILRManualEntryPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("learnerDetails");
  
  // Load draft on component mount
  useEffect(() => {
    loadDraft();
  }, []);
  
  const [learnerForm, setLearnerForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    uniqueLearnerNumber: "",
    learnRefNumber: "",
    postcode: "",
    gender: "",
    ethnicity: "",
    priorAttainment: "",
  });
  
  const [employerForm, setEmployerForm] = useState({
    employerName: "",
    employerUKPRN: "",
    employerContact: "",
    employerPostcode: "",
    workPlacePostcode: "",
  });
  
  const [apprenticeshipForm, setApprenticeshipForm] = useState({
    standardCode: "",
    standardTitle: "",
    startDate: "",
    plannedEndDate: "",
    fundingModel: "36",
    completionStatus: "1",
    weeklyHours: "30",
    priceEpisodes: [{ price: "", effectiveFrom: "", effectiveTo: "" }]
  });

  // Handle form changes for each tab
  const handleLearnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLearnerForm({ ...learnerForm, [e.target.name]: e.target.value });
  };
  
  const handleEmployerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployerForm({ ...employerForm, [e.target.name]: e.target.value });
  };
  
  const handleApprenticeshipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApprenticeshipForm({ ...apprenticeshipForm, [e.target.name]: e.target.value });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    // Determine which form to update based on the active tab
    if (activeTab === "learnerDetails") {
      setLearnerForm({ ...learnerForm, [name]: value });
    } else if (activeTab === "employerDetails") {
      setEmployerForm({ ...employerForm, [name]: value });
    } else if (activeTab === "apprenticeshipDetails") {
      setApprenticeshipForm({ ...apprenticeshipForm, [name]: value });
    }
  };

  // Handle price episode changes (nested array)
  const handlePriceEpisodeChange = (index: number, field: string, value: string) => {
    const updatedEpisodes = [...apprenticeshipForm.priceEpisodes];
    updatedEpisodes[index] = { ...updatedEpisodes[index], [field]: value };
    setApprenticeshipForm({ ...apprenticeshipForm, priceEpisodes: updatedEpisodes });
  };
  
  // Add a new price episode
  const addPriceEpisode = () => {
    setApprenticeshipForm({
      ...apprenticeshipForm,
      priceEpisodes: [
        ...apprenticeshipForm.priceEpisodes,
        { price: "", effectiveFrom: "", effectiveTo: "" }
      ]
    });
  };
  
  // Remove a price episode
  const removePriceEpisode = (index: number) => {
    if (apprenticeshipForm.priceEpisodes.length > 1) {
      const updatedEpisodes = [...apprenticeshipForm.priceEpisodes];
      updatedEpisodes.splice(index, 1);
      setApprenticeshipForm({ ...apprenticeshipForm, priceEpisodes: updatedEpisodes });
    }
  };

  // Navigate to next tab
  const nextTab = () => {
    if (activeTab === "learnerDetails") {
      setActiveTab("employerDetails");
    } else if (activeTab === "employerDetails") {
      setActiveTab("apprenticeshipDetails");
    }
  };
  
  // Navigate to previous tab
  const prevTab = () => {
    if (activeTab === "apprenticeshipDetails") {
      setActiveTab("employerDetails");
    } else if (activeTab === "employerDetails") {
      setActiveTab("learnerDetails");
    }
  };

  // Handle saving draft
  const handleSaveDraft = async () => {
    try {
      const draftData = {
        learner: learnerForm,
        employer: employerForm,
        apprenticeship: apprenticeshipForm,
        isDraft: true
      };
      
      // Save draft to local storage as temporary storage
      localStorage.setItem('ilr_draft', JSON.stringify(draftData));
      
      // In a real implementation, this would call an API endpoint to save to the database
      // const res = await fetch("/api/ilr/draft", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(draftData),
      // });
      
      toast({ 
        title: "Draft saved", 
        description: "Your ILR entry has been saved as a draft.",
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error saving draft",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Check if draft exists on page load
  const loadDraft = () => {
    const savedDraft = localStorage.getItem('ilr_draft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setLearnerForm(draftData.learner);
        setEmployerForm(draftData.employer);
        setApprenticeshipForm(draftData.apprenticeship);
        
        toast({ 
          title: "Draft loaded", 
          description: "Your saved draft has been loaded.",
        });
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  };
  
  // Submit all forms
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perform additional validation before submission
    if (!apprenticeshipForm.fundingModel) {
      toast({
        title: "Missing Funding Model",
        description: "Please select a funding model for the learner",
        variant: "destructive"
      });
      return;
    }
    
    // Check if ULN is exactly 10 digits
    if (learnerForm.uniqueLearnerNumber && !/^\d{10}$/.test(learnerForm.uniqueLearnerNumber)) {
      toast({
        title: "Invalid ULN",
        description: "ULN must be exactly 10 digits",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const ilrData = {
        learner: learnerForm,
        employer: employerForm,
        apprenticeship: apprenticeshipForm
      };
      
      const res = await fetch("/api/ilr/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ilrData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit ILR data");
      }

      toast({ 
        title: "ILR submitted", 
        description: "Learner record has been successfully saved.",
      });
      
      // Reset forms
      setLearnerForm({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        uniqueLearnerNumber: "",
        learnRefNumber: "",
        postcode: "",
        gender: "",
        ethnicity: "",
        priorAttainment: "",
      });
      
      setEmployerForm({
        employerName: "",
        employerUKPRN: "",
        employerContact: "",
        employerPostcode: "",
        workPlacePostcode: "",
      });
      
      setApprenticeshipForm({
        standardCode: "",
        standardTitle: "",
        startDate: "",
        plannedEndDate: "",
        fundingModel: "36",
        completionStatus: "1",
        weeklyHours: "30",
        priceEpisodes: [{ price: "", effectiveFrom: "", effectiveTo: "" }]
      });
      
      // Return to first tab
      setActiveTab("learnerDetails");
      
    } catch (error: any) {
      console.error("ILR submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Submission failed. Please check the data.",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="mb-6">Please log in to access the ILR entry system.</p>
        <Button onClick={() => navigate("/auth/login")}>
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">ILR Manual Entry</h1>
      <p className="text-gray-600 mb-4">
        Create a new ILR record by manually entering learner, employer, and apprenticeship details.
      </p>
      
      {/* Visual progress indicator */}
      <div className="w-full mb-6">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary/10">
                Form Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-primary">
                {activeTab === "learnerDetails" ? "Step 1 of 3" : 
                 activeTab === "employerDetails" ? "Step 2 of 3" : "Step 3 of 3"}
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-primary/10">
            <div 
              style={{ 
                width: activeTab === "learnerDetails" ? "33%" : 
                       activeTab === "employerDetails" ? "67%" : "100%" 
              }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="learnerDetails" className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">1</div>
              Learner Details
            </TabsTrigger>
            <TabsTrigger value="employerDetails" className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">2</div>
              Employer Details
            </TabsTrigger>
            <TabsTrigger value="apprenticeshipDetails" className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm">3</div>
              Apprenticeship Details
            </TabsTrigger>
          </TabsList>
          
          {/* Learner Details Tab */}
          <TabsContent value="learnerDetails">
            <Card>
              <CardHeader>
                <CardTitle>Learner Information</CardTitle>
                <CardDescription>
                  Enter the personal details of the apprentice/learner.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={learnerForm.firstName}
                      onChange={handleLearnerChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={learnerForm.lastName}
                      onChange={handleLearnerChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={learnerForm.dateOfBirth}
                      onChange={handleLearnerChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select 
                      value={learnerForm.gender} 
                      onValueChange={(value) => handleSelectChange("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="NS">Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label htmlFor="uniqueLearnerNumber">ULN (Unique Learner Number)</Label>
                        {learnerForm.uniqueLearnerNumber && /^\d{10}$/.test(learnerForm.uniqueLearnerNumber) && (
                          <span className="text-xs text-green-600 font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Valid ULN
                          </span>
                        )}
                      </div>
                      <Input
                        id="uniqueLearnerNumber"
                        name="uniqueLearnerNumber"
                        value={learnerForm.uniqueLearnerNumber}
                        onChange={handleLearnerChange}
                        placeholder="10-digit number"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        title="ULN must be exactly 10 digits"
                        required
                        className={
                          learnerForm.uniqueLearnerNumber && /^\d{10}$/.test(learnerForm.uniqueLearnerNumber)
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        ULN must be exactly 10 digits, with no letters or special characters
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="learnRefNumber">Learner Reference Number</Label>
                    <Input
                      id="learnRefNumber"
                      name="learnRefNumber"
                      value={learnerForm.learnRefNumber}
                      onChange={handleLearnerChange}
                      placeholder="Your internal reference"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      name="postcode"
                      value={learnerForm.postcode}
                      onChange={handleLearnerChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ethnicity">Ethnicity</Label>
                    <Select 
                      value={learnerForm.ethnicity} 
                      onValueChange={(value) => handleSelectChange("ethnicity", value)}
                    >
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
                        <SelectItem value="38">Mixed - Any other mixed background</SelectItem>
                        <SelectItem value="39">Asian/Asian British - Indian</SelectItem>
                        <SelectItem value="40">Asian/Asian British - Pakistani</SelectItem>
                        <SelectItem value="41">Asian/Asian British - Bangladeshi</SelectItem>
                        <SelectItem value="42">Asian/Asian British - Chinese</SelectItem>
                        <SelectItem value="43">Asian/Asian British - Any other Asian background</SelectItem>
                        <SelectItem value="44">Black/African/Caribbean/Black British - African</SelectItem>
                        <SelectItem value="45">Black/African/Caribbean/Black British - Caribbean</SelectItem>
                        <SelectItem value="46">Black/African/Caribbean/Black British - Any other Black background</SelectItem>
                        <SelectItem value="47">Other ethnic group - Arab</SelectItem>
                        <SelectItem value="98">Other ethnic group - Any other ethnic group</SelectItem>
                        <SelectItem value="99">Not provided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priorAttainment">Prior Attainment</Label>
                  <Select 
                    value={learnerForm.priorAttainment} 
                    onValueChange={(value) => handleSelectChange("priorAttainment", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select prior attainment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">Entry level</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                      <SelectItem value="4">Level 4</SelectItem>
                      <SelectItem value="5">Level 5</SelectItem>
                      <SelectItem value="6">Level 6</SelectItem>
                      <SelectItem value="7">Level 7 and above</SelectItem>
                      <SelectItem value="97">Other qualification, level not known</SelectItem>
                      <SelectItem value="98">Not known</SelectItem>
                      <SelectItem value="99">No qualifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button onClick={nextTab}>Next: Employer Details</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Employer Details Tab */}
          <TabsContent value="employerDetails">
            <Card>
              <CardHeader>
                <CardTitle>Employer Information</CardTitle>
                <CardDescription>
                  Enter details about the employer and workplace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employerName">Employer Name</Label>
                    <Input
                      id="employerName"
                      name="employerName"
                      value={employerForm.employerName}
                      onChange={handleEmployerChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employerUKPRN">Employer UKPRN (if applicable)</Label>
                    <Input
                      id="employerUKPRN"
                      name="employerUKPRN"
                      value={employerForm.employerUKPRN}
                      onChange={handleEmployerChange}
                      placeholder="8-digit number"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="employerContact">Employer Contact</Label>
                  <Input
                    id="employerContact"
                    name="employerContact"
                    value={employerForm.employerContact}
                    onChange={handleEmployerChange}
                    placeholder="Name and contact details"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employerPostcode">Employer's Postcode</Label>
                    <Input
                      id="employerPostcode"
                      name="employerPostcode"
                      value={employerForm.employerPostcode}
                      onChange={handleEmployerChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workPlacePostcode">Workplace Postcode (if different)</Label>
                    <Input
                      id="workPlacePostcode"
                      name="workPlacePostcode"
                      value={employerForm.workPlacePostcode}
                      onChange={handleEmployerChange}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevTab}>
                  Previous: Learner Details
                </Button>
                <Button onClick={nextTab}>
                  Next: Apprenticeship Details
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          {/* Apprenticeship Details Tab */}
          <TabsContent value="apprenticeshipDetails">
            <Card>
              <CardHeader>
                <CardTitle>Apprenticeship Information</CardTitle>
                <CardDescription>
                  Enter details about the apprenticeship program.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="standardCode">Apprenticeship Standard Code</Label>
                    <Input
                      id="standardCode"
                      name="standardCode"
                      value={apprenticeshipForm.standardCode}
                      onChange={handleApprenticeshipChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standardTitle">Apprenticeship Standard Title</Label>
                    <Input
                      id="standardTitle"
                      name="standardTitle"
                      value={apprenticeshipForm.standardTitle}
                      onChange={handleApprenticeshipChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={apprenticeshipForm.startDate}
                      onChange={handleApprenticeshipChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plannedEndDate">Planned End Date</Label>
                    <Input
                      id="plannedEndDate"
                      name="plannedEndDate"
                      type="date"
                      value={apprenticeshipForm.plannedEndDate}
                      onChange={handleApprenticeshipChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label htmlFor="fundingModel">Funding Model</Label>
                      {apprenticeshipForm.fundingModel && (
                        <span className="text-xs text-green-600 font-medium flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                          Selected
                        </span>
                      )}
                    </div>
                    <Select 
                      value={apprenticeshipForm.fundingModel} 
                      onValueChange={(value) => handleSelectChange("fundingModel", value)}
                    >
                      <SelectTrigger className={
                        apprenticeshipForm.fundingModel 
                          ? "border-green-500 focus-visible:ring-green-500" 
                          : ""
                      }>
                        <SelectValue placeholder="Select funding model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="36">36 - Apprenticeships (from 1 May 2017)</SelectItem>
                        <SelectItem value="81">81 - Other Adult</SelectItem>
                        <SelectItem value="82">82 - Other 16-19</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required - Select the appropriate funding model
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="completionStatus">Completion Status</Label>
                    <Select 
                      value={apprenticeshipForm.completionStatus} 
                      onValueChange={(value) => handleSelectChange("completionStatus", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Continuing</SelectItem>
                        <SelectItem value="2">2 - Completed</SelectItem>
                        <SelectItem value="3">3 - Withdrawn</SelectItem>
                        <SelectItem value="6">6 - Break in Learning</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weeklyHours">Weekly Hours</Label>
                    <Input
                      id="weeklyHours"
                      name="weeklyHours"
                      type="number"
                      min="1"
                      step="0.5"
                      value={apprenticeshipForm.weeklyHours}
                      onChange={handleApprenticeshipChange}
                      required
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="mb-4">
                  <h3 className="text-base font-semibold mb-2">Price Episodes</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add price information for this apprenticeship. You can add multiple episodes for price changes over time.
                  </p>
                  
                  {apprenticeshipForm.priceEpisodes.map((episode, index) => (
                    <div key={index} className="border border-slate-200 p-5 rounded-md mb-4 bg-slate-50">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <div className="bg-primary/10 text-primary rounded-full w-7 h-7 flex items-center justify-center mr-2">
                            {index + 1}
                          </div>
                          <h4 className="font-medium">Price Episode {index + 1}</h4>
                        </div>
                        {apprenticeshipForm.priceEpisodes.length > 1 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removePriceEpisode(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor={`price-${index}`}>Price (£)</Label>
                          <Input
                            id={`price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={episode.price}
                            onChange={(e) => handlePriceEpisodeChange(index, "price", e.target.value)}
                            required
                            className={episode.price ? "border-green-500 focus-visible:ring-green-500" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            Required - Total cost in pounds
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`effectiveFrom-${index}`}>Effective From</Label>
                          <Input
                            id={`effectiveFrom-${index}`}
                            type="date"
                            value={episode.effectiveFrom}
                            onChange={(e) => handlePriceEpisodeChange(index, "effectiveFrom", e.target.value)}
                            required
                            className={episode.effectiveFrom ? "border-green-500 focus-visible:ring-green-500" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            Required - Start date
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`effectiveTo-${index}`}>Effective To</Label>
                          <Input
                            id={`effectiveTo-${index}`}
                            type="date"
                            value={episode.effectiveTo}
                            onChange={(e) => handlePriceEpisodeChange(index, "effectiveTo", e.target.value)}
                            className={episode.effectiveTo ? "border-green-500 focus-visible:ring-green-500" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            Optional - End date
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addPriceEpisode}
                  className="mt-2 border-dashed flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                  Add Another Price Episode
                </Button>
                
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={prevTab}>
                    Previous: Employer Details
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleSaveDraft}
                  >
                    Save as Draft
                  </Button>
                </div>
                <Button type="submit">
                  Submit ILR Record
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}