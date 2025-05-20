import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  BookOpen,
  Lightbulb,
  Wrench,
  ScrollText,
  Loader2
} from "lucide-react";

interface KsbElement {
  id: number;
  type: "knowledge" | "skill" | "behavior";
  reference: string;
  description: string;
  standardId: number;
}

interface Standard {
  id: number;
  title: string;
  level: number;
  description: string;
}

export function StandardAnalyzer() {
  const { user } = useAuth();
  const [standardText, setStandardText] = useState("");
  const [standardTitle, setStandardTitle] = useState("");
  const [standardLevel, setStandardLevel] = useState<number>(4);
  const [analyzedKsbs, setAnalyzedKsbs] = useState<KsbElement[]>([]);
  const [step, setStep] = useState<"input" | "review" | "save">("input");
  const [createdStandard, setCreatedStandard] = useState<Standard | null>(null);

  const analyzeStandardMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch('/api/ai-assistant/analyze-standard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ standardText: text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze standard');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalyzedKsbs(data.ksbs);
      setStep("review");
    },
    onError: (error) => {
      console.error('Error analyzing standard:', error);
    },
  });

  const saveStandardMutation = useMutation({
    mutationFn: async (data: { 
      title: string; 
      level: number; 
      description: string;
      ksbs: KsbElement[];
    }) => {
      const response = await fetch('/api/apprenticeship-standards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save standard');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedStandard(data);
      setStep("save");
    },
    onError: (error) => {
      console.error('Error saving standard:', error);
    },
  });

  const handleAnalyzeStandard = () => {
    if (!standardText.trim()) return;
    analyzeStandardMutation.mutate(standardText);
  };

  const handleSaveStandard = () => {
    saveStandardMutation.mutate({
      title: standardTitle,
      level: standardLevel,
      description: standardText.substring(0, 1000), // Truncate description if needed
      ksbs: analyzedKsbs,
    });
  };

  const updateKsb = (index: number, field: keyof KsbElement, value: string | number | "knowledge" | "skill" | "behavior") => {
    setAnalyzedKsbs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getTypeIcon = (type: "knowledge" | "skill" | "behavior") => {
    switch (type) {
      case "knowledge":
        return <BookOpen className="h-4 w-4" />;
      case "skill":
        return <Wrench className="h-4 w-4" />;
      case "behavior":
        return <Lightbulb className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: "knowledge" | "skill" | "behavior") => {
    switch (type) {
      case "knowledge":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "skill":
        return "bg-green-100 text-green-800 border-green-300";
      case "behavior":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "";
    }
  };

  const renderInputStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <CardTitle>Apprenticeship Standard Analyzer</CardTitle>
        </div>
        <CardDescription>
          Paste the text of an apprenticeship standard below to automatically extract Knowledge, Skills, and Behaviors (KSBs).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="standard-title">Standard Title</Label>
          <Input
            id="standard-title"
            placeholder="e.g., Digital Marketer Level 3"
            value={standardTitle}
            onChange={(e) => setStandardTitle(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="standard-level">Standard Level</Label>
          <div className="flex items-center gap-4">
            {[3, 4, 5, 6, 7].map((level) => (
              <div key={level} className="flex items-center gap-2">
                <RadioGroup value={String(standardLevel)} onValueChange={(value) => setStandardLevel(Number(value))}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={String(level)} id={`level-${level}`} />
                    <Label htmlFor={`level-${level}`}>Level {level}</Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="standard-text">Standard Text</Label>
          <Textarea
            id="standard-text"
            className="min-h-[300px]"
            placeholder="Paste the full text of the apprenticeship standard here..."
            value={standardText}
            onChange={(e) => setStandardText(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAnalyzeStandard}
          disabled={!standardText.trim() || !standardTitle.trim() || analyzeStandardMutation.isPending}
          className="w-full"
        >
          {analyzeStandardMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Analyzing Standard...
            </>
          ) : (
            <>
              <ScrollText className="mr-2 h-4 w-4" /> 
              Analyze Standard
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderReviewStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" />
          <CardTitle>Review Extracted KSBs</CardTitle>
        </div>
        <CardDescription>
          Review and edit the automatically extracted Knowledge, Skills, and Behaviors before saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            Extracted Knowledge, Skills, and Behaviors from "{standardTitle}" (Level {standardLevel})
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[120px]">Reference</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyzedKsbs.map((ksb, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <select
                      value={ksb.type}
                      onChange={(e) => updateKsb(index, "type", e.target.value as "knowledge" | "skill" | "behavior")}
                      className="border rounded p-1 text-sm"
                    >
                      <option value="knowledge">Knowledge</option>
                      <option value="skill">Skill</option>
                      <option value="behavior">Behavior</option>
                    </select>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={ksb.reference}
                    onChange={(e) => updateKsb(index, "reference", e.target.value)}
                    className="text-sm w-full"
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    value={ksb.description}
                    onChange={(e) => updateKsb(index, "description", e.target.value)}
                    className="text-sm w-full min-h-[80px]"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setStep("input")}
        >
          Back to Input
        </Button>
        <Button 
          onClick={handleSaveStandard}
          disabled={saveStandardMutation.isPending}
        >
          {saveStandardMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Saving...
            </>
          ) : (
            <>
              Save Standard
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderSaveStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-green-600">
          <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle>Standard Saved Successfully</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-semibold text-lg">{createdStandard?.title}</h3>
          <p className="text-sm text-muted-foreground">Level {createdStandard?.level}</p>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">KSBs Extracted</h4>
          <div className="flex flex-wrap gap-2">
            {analyzedKsbs.map((ksb, index) => (
              <Badge key={index} variant="outline" className={`${getTypeColor(ksb.type)} flex items-center gap-1`}>
                {getTypeIcon(ksb.type)}
                {ksb.reference}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="border border-green-200 bg-green-50 p-4 rounded-md">
          <p className="text-green-800 font-medium">
            The standard has been successfully saved and is now available for:
          </p>
          <ul className="list-disc list-inside text-green-700 mt-2 text-sm">
            <li>Mapping evidence to KSBs</li>
            <li>Generating learning resources</li>
            <li>Creating course outlines</li>
            <li>Setting learning goals</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => {
            setStep("input");
            setStandardText("");
            setStandardTitle("");
            setStandardLevel(4);
            setAnalyzedKsbs([]);
            setCreatedStandard(null);
          }}
          className="w-full"
        >
          Analyze Another Standard
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex flex-col space-y-6">
      {step === "input" && renderInputStep()}
      {step === "review" && renderReviewStep()}
      {step === "save" && renderSaveStep()}
    </div>
  );
}