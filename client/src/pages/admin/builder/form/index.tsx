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
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronLeft, Trash2, Plus, MoveVertical, Eye, Save, Settings, FileDown, ClipboardSignature } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Mock types for the form builder
type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'file' | 'scale';

interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  description?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Form Builder Component
const FormBuilder = () => {
  const [_, setLocation] = useLocation();
  
  // Sample initial form data
  const [formData, setFormData] = useState<FormData>({
    id: 'new-form',
    title: 'Untitled Form',
    description: 'Form description',
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        description: 'First section of your form',
        questions: [
          {
            id: 'q1',
            type: 'text',
            label: 'What progress has been made since the last review?',
            placeholder: 'Enter your answer here...',
            required: true
          },
          {
            id: 'q2',
            type: 'textarea',
            label: 'Describe any challenges or blockers you are facing',
            placeholder: 'Describe in detail...',
            required: false
          },
          {
            id: 'q3',
            type: 'select',
            label: 'How would you rate your progress?',
            required: true,
            options: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement']
          }
        ]
      }
    ],
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [activeSection, setActiveSection] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  
  // Add a new question to the current section
  const handleAddQuestion = () => {
    const newQuestion: FormQuestion = {
      id: `q${Date.now()}`,
      type: 'text',
      label: 'New Question',
      placeholder: 'Enter your answer here...',
      required: false
    };
    
    const updatedSections = [...formData.sections];
    updatedSections[activeSection].questions.push(newQuestion);
    
    setFormData({
      ...formData,
      sections: updatedSections,
      updatedAt: new Date()
    });
    
    setActiveQuestion(newQuestion.id);
  };
  
  // Add a new section to the form
  const handleAddSection = () => {
    const newSection: FormSection = {
      id: `section-${formData.sections.length + 1}`,
      title: `Section ${formData.sections.length + 1}`,
      description: 'Description for this section',
      questions: []
    };
    
    setFormData({
      ...formData,
      sections: [...formData.sections, newSection],
      updatedAt: new Date()
    });
    
    setActiveSection(formData.sections.length);
  };
  
  // Delete a question
  const handleDeleteQuestion = (questionId: string) => {
    const updatedSections = [...formData.sections];
    const sectionIndex = updatedSections.findIndex(section => 
      section.questions.some(q => q.id === questionId)
    );
    
    if (sectionIndex !== -1) {
      updatedSections[sectionIndex].questions = updatedSections[sectionIndex].questions.filter(
        q => q.id !== questionId
      );
      
      setFormData({
        ...formData,
        sections: updatedSections,
        updatedAt: new Date()
      });
      
      setActiveQuestion(null);
    }
  };
  
  // Update a question's properties
  const handleUpdateQuestion = (questionId: string, data: Partial<FormQuestion>) => {
    const updatedSections = [...formData.sections];
    const sectionIndex = updatedSections.findIndex(section => 
      section.questions.some(q => q.id === questionId)
    );
    
    if (sectionIndex !== -1) {
      const questionIndex = updatedSections[sectionIndex].questions.findIndex(q => q.id === questionId);
      
      updatedSections[sectionIndex].questions[questionIndex] = {
        ...updatedSections[sectionIndex].questions[questionIndex],
        ...data
      };
      
      setFormData({
        ...formData,
        sections: updatedSections,
        updatedAt: new Date()
      });
    }
  };
  
  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    const sectionIndex = activeSection;
    const questions = [...formData.sections[sectionIndex].questions];
    
    const [removed] = questions.splice(source.index, 1);
    questions.splice(destination.index, 0, removed);
    
    const updatedSections = [...formData.sections];
    updatedSections[sectionIndex].questions = questions;
    
    setFormData({
      ...formData,
      sections: updatedSections,
      updatedAt: new Date()
    });
  };
  
  // Get the currently selected question
  const getSelectedQuestion = () => {
    if (!activeQuestion) return null;
    
    for (const section of formData.sections) {
      const question = section.questions.find(q => q.id === activeQuestion);
      if (question) return question;
    }
    
    return null;
  };
  
  const selectedQuestion = getSelectedQuestion();
  
  // Mock function to save the form
  const handleSaveForm = () => {
    alert('Form saved successfully!');
    // In a real app, you would save to the backend here
  };
  
  // Mock function to preview the form
  const handlePreviewForm = () => {
    // In a real app, you would open a preview mode or redirect to a preview page
    alert('Preview functionality would be implemented here');
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
        <h1 className="text-2xl font-bold">Form Builder</h1>
        
        <div className="ml-auto flex space-x-2">
          <Button variant="outline" size="sm" onClick={handlePreviewForm}>
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
          <Button variant="default" size="sm" onClick={handleSaveForm}>
            <Save className="h-4 w-4 mr-1" />
            Save Form
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form Details Column */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              <CardDescription>Basic information about your form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-title">Form Title</Label>
                <Input 
                  id="form-title" 
                  value={formData.title} 
                  onChange={(e) => setFormData({
                    ...formData,
                    title: e.target.value,
                    updatedAt: new Date()
                  })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea 
                  id="form-description" 
                  value={formData.description} 
                  onChange={(e) => setFormData({
                    ...formData,
                    description: e.target.value,
                    updatedAt: new Date()
                  })}
                />
              </div>
              
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-medium">Form Sections</h3>
                <div className="space-y-2">
                  {formData.sections.map((section, index) => (
                    <div 
                      key={section.id}
                      className={`p-2 border rounded-md cursor-pointer ${index === activeSection ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => setActiveSection(index)}
                    >
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-muted-foreground">{section.questions.length} questions</div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={handleAddSection}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Form Builder Column */}
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {formData.sections[activeSection]?.title || 'Section Title'}
              </CardTitle>
              <CardDescription>
                {formData.sections[activeSection]?.description || 'Section description'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {formData.sections[activeSection]?.questions.map((question, index) => (
                        <Draggable key={question.id} draggableId={question.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border p-4 rounded-md ${activeQuestion === question.id ? 'border-primary' : ''}`}
                              onClick={() => setActiveQuestion(question.id)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium">{question.label}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{question.type}</p>
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
                                  <Switch disabled id={`preview-${question.id}`} />
                                  <Label htmlFor={`preview-${question.id}`}>Option</Label>
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
                        onValueChange={(value) => handleUpdateQuestion(selectedQuestion.id, { type: value as QuestionType })}
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
                          <SelectItem value="file">File Upload</SelectItem>
                          <SelectItem value="scale">Scale</SelectItem>
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
                    
                    {(selectedQuestion.type === 'select' || selectedQuestion.type === 'multiselect' || selectedQuestion.type === 'radio') && (
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
                                className="h-6 w-6 p-0"
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
                      <Label htmlFor="question-description">Description/Help Text</Label>
                      <Textarea
                        id="question-description"
                        value={selectedQuestion.description || ''}
                        onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { description: e.target.value })}
                        placeholder="Add additional instructions for this question"
                      />
                    </div>
                    
                    <div className="pt-2">
                      <h3 className="text-sm font-medium mb-2">Validation Rules</h3>
                      <p className="text-sm text-muted-foreground">
                        Additional validation rules will be available in a future update.
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

export default FormBuilder;