import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText, ListChecks, ClipboardSignature, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Builder dashboard for creating various content types
const BuilderDashboard = () => {
  const [_, setLocation] = useLocation();
  
  // Content type cards for the Builder dashboard
  const contentTypes = [
    {
      id: 'form',
      title: 'Form Builder',
      description: 'Create custom forms for data collection, feedback, or reviews',
      icon: <ClipboardSignature className="h-8 w-8 text-primary" />,
      path: '/admin/builder/form'
    },
    {
      id: 'quiz',
      title: 'Quiz Builder',
      description: 'Create assessments, knowledge checks, and practice quizzes',
      icon: <ListChecks className="h-8 w-8 text-primary" />,
      path: '/admin/builder/quiz'
    },
    {
      id: 'template',
      title: 'Review Template',
      description: 'Create templates for 12-weekly reviews with custom questions',
      icon: <FileText className="h-8 w-8 text-primary" />,
      path: '/admin/builder/review-template'
    },
    {
      id: 'settings',
      title: 'Builder Settings',
      description: 'Configure global settings for forms, quizzes, and templates',
      icon: <Settings className="h-8 w-8 text-primary" />,
      path: '/admin/builder/settings'
    }
  ];
  
  // Recent items (placeholder - would fetch from API in real implementation)
  const recentItems = [
    {
      id: 1,
      title: '12-Weekly Review Form',
      type: 'form',
      lastEdited: '2023-09-15T14:30:00Z',
      status: 'published'
    },
    {
      id: 2,
      title: 'KSB Progress Assessment',
      type: 'quiz',
      lastEdited: '2023-09-10T09:15:00Z',
      status: 'draft'
    },
    {
      id: 3,
      title: 'End of Month Feedback',
      type: 'form',
      lastEdited: '2023-09-05T16:45:00Z',
      status: 'published'
    }
  ];
  
  // Navigate to a specific content type creator
  const navigateToBuilder = (path: string) => {
    setLocation(path);
  };
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Content Builder</h1>
      </div>
      
      <p className="text-muted-foreground">
        Create and manage custom forms, quizzes, and templates for your apprenticeship program.
      </p>
      
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Content</TabsTrigger>
          <TabsTrigger value="recent">Recent Items</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {contentTypes.map(contentType => (
              <Card 
                key={contentType.id} 
                className="hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigateToBuilder(contentType.path)}
              >
                <CardHeader className="flex flex-row items-start space-y-0 gap-4 pb-2">
                  <div className="mt-1">{contentType.icon}</div>
                  <div>
                    <CardTitle className="text-xl">{contentType.title}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {contentType.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create {contentType.title.split(' ')[0]}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="recent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recently Edited</CardTitle>
              <CardDescription>Your recently created or edited content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      {item.type === 'form' && <ClipboardSignature className="h-6 w-6 text-blue-500" />}
                      {item.type === 'quiz' && <ListChecks className="h-6 w-6 text-green-500" />}
                      {item.type === 'template' && <FileText className="h-6 w-6 text-purple-500" />}
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          {new Date(item.lastEdited).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{item.status}</p>
                      </div>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Separator className="my-8" />
      
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Form Builder 101</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Learn how to create effective forms for collecting data from learners, employers, and assessors.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Guide</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quiz Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tips for creating engaging quizzes that effectively assess knowledge and skills.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Guide</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                How to design review templates that capture meaningful feedback and progress data.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">View Guide</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BuilderDashboard;