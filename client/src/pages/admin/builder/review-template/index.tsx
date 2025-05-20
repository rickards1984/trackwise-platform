import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronLeft, Trash2, Plus, MoveVertical, Eye, Save, Settings, FileDown, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Template section types with predefined fields for 12-weekly reviews
type SectionType = 
  | 'progress' 
  | 'challenges' 
  | 'goals' 
  | 'feedback' 
  | 'action_plan'
  | 'otj_hours'
  | 'ksb_review'
  | 'signatures'
  | 'custom';

interface TemplateSection {
  id: string;
  type: SectionType;
  title: string;
  description?: string;
  questions: TemplateQuestion[];
  required: boolean;
}

interface TemplateQuestion {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'scale' | 'date' | 'signature';
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
}

interface ReviewTemplate {
  id: string;
  title: string;
  description: string;
  standardId?: number;
  sections: TemplateSection[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Default template sections for 12-weekly reviews
const defaultSections: TemplateSection[] = [
  {
    id: 'section-progress',
    type: 'progress',
    title: 'Progress Review',
    description: 'Review the learner\'s progress since the last review',
    required: true,
    questions: [
      {
        id: 'q-progress-1',
        type: 'textarea',
        label: 'What progress has been made since the last review?',
        placeholder: 'Describe the progress in detail...',
        required: true,
      },
      {
        id: 'q-progress-2',
        type: 'radio',
        label: 'How would you rate the overall progress?',
        required: true,
        options: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Unsatisfactory']
      }
    ]
  },
  {
    id: 'section-otj',
    type: 'otj_hours',
    title: 'Off-the-Job Training Hours',
    description: 'Review of OTJ hours completed during this period',
    required: true,
    questions: [
      {
        id: 'q-otj-1',
        type: 'text',
        label: 'Total OTJ hours completed in this period',
        placeholder: 'Enter the number of hours',
        required: true,
      },
      {
        id: 'q-otj-2',
        type: 'radio',
        label: 'Is the learner on track to meet the minimum OTJ hours requirement?',
        required: true,
        options: ['Yes, exceeding target', 'Yes, meeting target', 'Slightly behind target', 'Significantly behind target']
      },
      {
        id: 'q-otj-3',
        type: 'textarea',
        label: 'Action plan for OTJ hours (if behind target)',
        placeholder: 'Describe steps to address any shortfall in OTJ hours...',
        required: false,
      }
    ]
  },
  {
    id: 'section-ksb',
    type: 'ksb_review',
    title: 'Knowledge, Skills & Behaviors Review',
    description: 'Assessment of KSB progress and development',
    required: true,
    questions: [
      {
        id: 'q-ksb-1',
        type: 'textarea',
        label: 'Which KSBs have been addressed during this period?',
        placeholder: 'List the specific KSBs from the standard...',
        required: true,
      },
      {
        id: 'q-ksb-2',
        type: 'textarea',
        label: 'Which KSBs require further development?',
        placeholder: 'Identify areas needing additional focus...',
        required: true,
      }
    ]
  },
  {
    id: 'section-goals',
    type: 'goals',
    title: 'Goals & Targets',
    description: 'Set goals for the next review period',
    required: true,
    questions: [
      {
        id: 'q-goals-1',
        type: 'textarea',
        label: 'Goals from previous review',
        placeholder: 'List goals from the previous review session...',
        required: true,
      },
      {
        id: 'q-goals-2',
        type: 'textarea',
        label: 'New goals for the next review period',
        placeholder: 'Set SMART goals for the coming weeks...',
        required: true,
      }
    ]
  },
  {
    id: 'section-challenges',
    type: 'challenges',
    title: 'Challenges & Support',
    description: 'Identify any challenges and required support',
    required: true,
    questions: [
      {
        id: 'q-challenges-1',
        type: 'textarea',
        label: 'What challenges is the learner facing?',
        placeholder: 'Describe any barriers or difficulties...',
        required: true,
      },
      {
        id: 'q-challenges-2',
        type: 'textarea',
        label: 'What support is needed from the employer?',
        placeholder: 'Specify any resources or assistance required...',
        required: true,
      },
      {
        id: 'q-challenges-3',
        type: 'textarea',
        label: 'What support is needed from the training provider?',
        placeholder: 'Specify any resources or assistance required...',
        required: true,
      }
    ]
  },
  {
    id: 'section-feedback',
    type: 'feedback',
    title: 'Feedback',
    description: 'Collect feedback from all parties',
    required: true,
    questions: [
      {
        id: 'q-feedback-1',
        type: 'textarea',
        label: 'Learner feedback on their apprenticeship journey',
        placeholder: 'Please provide your thoughts on your apprenticeship experience...',
        required: true,
      },
      {
        id: 'q-feedback-2',
        type: 'textarea',
        label: 'Employer feedback',
        placeholder: 'Please provide feedback on the learner\'s workplace performance...',
        required: true,
      },
      {
        id: 'q-feedback-3',
        type: 'textarea',
        label: 'Training provider feedback',
        placeholder: 'Please provide feedback on the learner\'s academic progress...',
        required: true,
      }
    ]
  },
  {
    id: 'section-action',
    type: 'action_plan',
    title: 'Action Plan',
    description: 'Agree on actions to be taken before the next review',
    required: true,
    questions: [
      {
        id: 'q-action-1',
        type: 'textarea',
        label: 'Actions for the learner',
        placeholder: 'List specific actions for the learner to complete...',
        required: true,
      },
      {
        id: 'q-action-2',
        type: 'textarea',
        label: 'Actions for the employer',
        placeholder: 'List specific actions for the employer to complete...',
        required: true,
      },
      {
        id: 'q-action-3',
        type: 'textarea',
        label: 'Actions for the training provider',
        placeholder: 'List specific actions for the training provider to complete...',
        required: true,
      },
      {
        id: 'q-action-date',
        type: 'date',
        label: 'Date of next review',
        required: true,
      }
    ]
  },
  {
    id: 'section-signatures',
    type: 'signatures',
    title: 'Signatures',
    description: 'Confirmation of review by all parties',
    required: true,
    questions: [
      {
        id: 'q-sig-1',
        type: 'signature',
        label: 'Learner signature',
        required: true,
      },
      {
        id: 'q-sig-2',
        type: 'signature',
        label: 'Employer signature',
        required: true,
      },
      {
        id: 'q-sig-3',
        type: 'signature',
        label: 'Training provider signature',
        required: true,
      },
      {
        id: 'q-sig-date',
        type: 'date',
        label: 'Date signed',
        required: true,
      }
    ]
  }
];

// Component for building 12-weekly review templates
const ReviewTemplateBuilder = () => {
  const [_, setLocation] = useLocation();
  
  // Initialize with default template
  const [template, setTemplate] = useState<ReviewTemplate>({
    id: 'new-template',
    title: 'New 12-Weekly Review Template',
    description: 'A template for 12-weekly progress reviews',
    sections: [...defaultSections],
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [activeSection, setActiveSection] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  
  // Get section icon based on type
  const getSectionIcon = (type: SectionType) => {
    switch (type) {
      case 'progress':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'challenges':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'otj_hours':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'ksb_review':
        return <CheckCircle2 className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Add a new question to the current section
  const handleAddQuestion = () => {
    const newQuestion: TemplateQuestion = {
      id: `q-${Date.now()}`,
      type: 'text',
      label: 'New Question',
      placeholder: 'Enter your answer here...',
      required: false
    };
    
    const updatedSections = [...template.sections];
    updatedSections[activeSection].questions.push(newQuestion);
    
    setTemplate({
      ...template,
      sections: updatedSections,
      updatedAt: new Date()
    });
    
    setActiveQuestion(newQuestion.id);
  };
  
  // Add a new custom section to the template
  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      type: 'custom',
      title: 'New Custom Section',
      description: 'Description for this custom section',
      questions: [],
      required: false
    };
    
    setTemplate({
      ...template,
      sections: [...template.sections, newSection],
      updatedAt: new Date()
    });
    
    setActiveSection(template.sections.length);
  };
  
  // Delete a question
  const handleDeleteQuestion = (questionId: string) => {
    const updatedSections = [...template.sections];
    const sectionIndex = updatedSections.findIndex(section => 
      section.questions.some(q => q.id === questionId)
    );
    
    if (sectionIndex !== -1) {
      updatedSections[sectionIndex].questions = updatedSections[sectionIndex].questions.filter(
        q => q.id !== questionId
      );
      
      setTemplate({
        ...template,
        sections: updatedSections,
        updatedAt: new Date()
      });
      
      setActiveQuestion(null);
    }
  };
  
  // Update a question's properties
  const handleUpdateQuestion = (questionId: string, data: Partial<TemplateQuestion>) => {
    const updatedSections = [...template.sections];
    const sectionIndex = updatedSections.findIndex(section => 
      section.questions.some(q => q.id === questionId)
    );
    
    if (sectionIndex !== -1) {
      const questionIndex = updatedSections[sectionIndex].questions.findIndex(q => q.id === questionId);
      
      updatedSections[sectionIndex].questions[questionIndex] = {
        ...updatedSections[sectionIndex].questions[questionIndex],
        ...data
      };
      
      setTemplate({
        ...template,
        sections: updatedSections,
        updatedAt: new Date()
      });
    }
  };
  
  // Update section properties
  const handleUpdateSection = (sectionIndex: number, data: Partial<TemplateSection>) => {
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      ...data
    };
    
    setTemplate({
      ...template,
      sections: updatedSections,
      updatedAt: new Date()
    });
  };
  
  // Handle dragging and dropping questions to reorder them
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    const sectionIndex = activeSection;
    const questions = [...template.sections[sectionIndex].questions];
    
    const [removed] = questions.splice(source.index, 1);
    questions.splice(destination.index, 0, removed);
    
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].questions = questions;
    
    setTemplate({
      ...template,
      sections: updatedSections,
      updatedAt: new Date()
    });
  };
  
  // Get the currently selected question
  const getSelectedQuestion = () => {
    if (!activeQuestion) return null;
    
    for (const section of template.sections) {
      const question = section.questions.find(q => q.id === activeQuestion);
      if (question) return question;
    }
    
    return null;
  };
  
  const selectedQuestion = getSelectedQuestion();
  
  // Mock function to save the template
  const handleSaveTemplate = () => {
    alert('Template saved successfully!');
    // In a real app, you would save to the backend here
  };
  
  // Mock function to preview the template
  const handlePreviewTemplate = () => {
    alert('Preview functionality would be implemented here');
    // In a real app, you would show a preview or redirect to a preview page
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2"
          onClick={() => setLocation('/admin/builder')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">12-Weekly Review Template Builder</h1>
        
        <div className="ml-auto flex space-x-2">
          <Button variant="outline" size="sm" onClick={handlePreviewTemplate}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="default" size="sm" onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 mr-1" />
            Save Template
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Template Details Column */}
        <div className="md:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Basic information about your review template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-title">Template Title</Label>
                <Input 
                  id="template-title" 
                  value={template.title} 
                  onChange={(e) => setTemplate({
                    ...template,
                    title: e.target.value,
                    updatedAt: new Date()
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea 
                  id="template-description" 
                  value={template.description} 
                  onChange={(e) => setTemplate({
                    ...template,
                    description: e.target.value,
                    updatedAt: new Date()
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-standard">Apprenticeship Standard</Label>
                <Select
                  value={template.standardId?.toString() || ""}
                  onValueChange={(value) => setTemplate({
                    ...template,
                    standardId: parseInt(value) || undefined,
                    updatedAt: new Date()
                  })}
                >
                  <SelectTrigger id="template-standard">
                    <SelectValue placeholder="Select a standard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 3 Software Developer</SelectItem>
                    <SelectItem value="2">Level 4 Network Engineer</SelectItem>
                    <SelectItem value="3">Level 3 Digital Marketer</SelectItem>
                    <SelectItem value="4">Level 4 Data Analyst</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Template Sections</CardTitle>
              <CardDescription>Manage and reorder sections</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {template.sections.map((section, index) => (
                    <div 
                      key={section.id}
                      className={`p-3 border rounded-md cursor-pointer ${index === activeSection ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => setActiveSection(index)}
                    >
                      <div className="flex items-center gap-2">
                        {getSectionIcon(section.type)}
                        <div>
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center">
                            {section.questions.length} questions
                            {section.required && (
                              <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4">Required</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4" 
                onClick={handleAddSection}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Custom Section
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Template Builder Column */}
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>
                    {template.sections[activeSection]?.title || 'Section Title'}
                  </CardTitle>
                  <CardDescription>
                    {template.sections[activeSection]?.description || 'Section description'}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="section-required"
                    checked={template.sections[activeSection]?.required || false}
                    onCheckedChange={(checked) => handleUpdateSection(activeSection, { required: checked })}
                  />
                  <Label htmlFor="section-required">Required</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="section-title">Section Title</Label>
                  <Input 
                    id="section-title" 
                    value={template.sections[activeSection]?.title || ''} 
                    onChange={(e) => handleUpdateSection(activeSection, { title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="section-description">Description</Label>
                  <Textarea 
                    id="section-description" 
                    value={template.sections[activeSection]?.description || ''} 
                    onChange={(e) => handleUpdateSection(activeSection, { description: e.target.value })}
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="text-sm font-medium mb-3">Questions</h3>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {template.sections[activeSection]?.questions.map((question, index) => (
                        <Draggable key={question.id} draggableId={question.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border p-4 rounded-md ${activeQuestion === question.id ? 'border-primary' : 'border-muted'}`}
                              onClick={() => setActiveQuestion(question.id)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-start gap-2">
                                  <div>
                                    <p className="font-medium">{question.label}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{question.type}</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  <div {...provided.dragHandleProps} className="cursor-move p-1">
                                    <MoveVertical className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteQuestion(question.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Quick preview of the question */}
                              {question.type === 'text' && (
                                <Input disabled placeholder={question.placeholder || 'Enter text...'} />
                              )}
                              {question.type === 'textarea' && (
                                <Textarea disabled placeholder={question.placeholder || 'Enter text...'} />
                              )}
                              {question.type === 'select' && (
                                <Select disabled>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an option" />
                                  </SelectTrigger>
                                </Select>
                              )}
                              {question.type === 'checkbox' && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox disabled id={`preview-${question.id}`} />
                                  <Label htmlFor={`preview-${question.id}`}>{question.options?.[0] || 'Option'}</Label>
                                </div>
                              )}
                              {question.type === 'radio' && (
                                <div className="space-y-1">
                                  <RadioGroup disabled defaultValue="option-1">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="option-1" id={`preview-${question.id}`} />
                                      <Label htmlFor={`preview-${question.id}`}>{question.options?.[0] || 'Option 1'}</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              )}
                              {question.type === 'date' && (
                                <Input disabled type="date" />
                              )}
                              {question.type === 'signature' && (
                                <div className="h-16 border border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center text-muted-foreground text-sm">
                                  Signature field
                                </div>
                              )}
                              
                              {question.required && (
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs">Required</Badge>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={handleAddQuestion}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Question
              </Button>
            </CardContent>
          </Card>
          
          {/* Question Editor */}
          {selectedQuestion && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Question</CardTitle>
                <CardDescription>Configure the selected question</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="question-label">Question Label</Label>
                      <Input
                        id="question-label"
                        value={selectedQuestion.label}
                        onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { label: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="question-type">Question Type</Label>
                      <Select 
                        value={selectedQuestion.type}
                        onValueChange={(value) => handleUpdateQuestion(selectedQuestion.id, { 
                          type: value as TemplateQuestion['type'] 
                        })}
                      >
                        <SelectTrigger id="question-type">
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Paragraph</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="multiselect">Multi-select</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="radio">Radio</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="signature">Signature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(selectedQuestion.type === 'text' || selectedQuestion.type === 'textarea') && (
                      <div className="space-y-2">
                        <Label htmlFor="question-placeholder">Placeholder</Label>
                        <Input
                          id="question-placeholder"
                          value={selectedQuestion.placeholder || ''}
                          onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { placeholder: e.target.value })}
                        />
                      </div>
                    )}
                    
                    {(selectedQuestion.type === 'select' || selectedQuestion.type === 'multiselect' || selectedQuestion.type === 'radio' || selectedQuestion.type === 'checkbox') && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="space-y-2">
                          {(selectedQuestion.options || []).map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(selectedQuestion.options || [])];
                                  newOptions[index] = e.target.value;
                                  handleUpdateQuestion(selectedQuestion.id, { options: newOptions });
                                }}
                              />
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const newOptions = [...(selectedQuestion.options || [])];
                                  newOptions.splice(index, 1);
                                  handleUpdateQuestion(selectedQuestion.id, { options: newOptions });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...(selectedQuestion.options || []), 'New Option'];
                              handleUpdateQuestion(selectedQuestion.id, { options: newOptions });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="question-required"
                        checked={selectedQuestion.required}
                        onCheckedChange={(checked) => handleUpdateQuestion(selectedQuestion.id, { required: checked })}
                      />
                      <Label htmlFor="question-required">Required</Label>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="question-help">Help Text</Label>
                      <Textarea
                        id="question-help"
                        value={selectedQuestion.helpText || ''}
                        onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { helpText: e.target.value })}
                        placeholder="Add instructions or help text for this question"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="question-default">Default Value</Label>
                      <Input
                        id="question-default"
                        value={selectedQuestion.defaultValue || ''}
                        onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { defaultValue: e.target.value })}
                        placeholder="Default answer (if any)"
                      />
                    </div>
                    
                    <div className="pt-2">
                      <h3 className="text-sm font-medium mb-2">Advanced Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        Additional validation rules and conditional logic will be available in a future update.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewTemplateBuilder;