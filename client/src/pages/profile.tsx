import { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthContext } from "@/App";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { AccessibilitySettings } from "@/components/settings/AccessibilitySettings";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  UserCircle,
  Lock,
  Bookmark,
  Bell,
  Shield,
  Calendar,
  FileText,
  School,
  Settings
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Form schema for profile update
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

// Form schema for password update
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get user profile and related data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/learner-profile'],
    enabled: !!user,
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || "",
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setUser((prev) => prev ? { ...prev, ...data } : null);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      const response = await apiRequest("POST", `/api/auth/change-password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      console.error("Error updating password:", error);
      toast({
        title: "Password update failed",
        description: "There was an error changing your password. Please check your current password and try again.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    await updatePasswordMutation.mutateAsync(data);
  };

  const getFormattedDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-neutral-900">Your Profile</h1>
              <p className="mt-1 text-sm text-neutral-500">
                View and manage your account settings
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Profile Overview Card */}
              <Card className="lg:col-span-4">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <Avatar className="h-24 w-24 bg-primary">
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                      ) : (
                        <AvatarFallback className="text-xl">{getUserInitials(user)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold">{user?.firstName} {user?.lastName}</h2>
                      <p className="text-neutral-500">{user?.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div className="bg-primary-light text-primary text-xs rounded-full px-3 py-1">
                          {user?.role === "learner" ? "Apprentice" : 
                          user?.role === "assessor" ? "Assessor" :
                          user?.role === "iqa" ? "IQA" :
                          user?.role === "training_provider" ? "Training Provider" :
                          user?.role === "admin" ? "Administrator" : user?.role}
                        </div>
                        {profile?.standard && (
                          <div className="bg-neutral-100 text-neutral-800 text-xs rounded-full px-3 py-1">
                            {profile.standard.title} - Level {profile.standard.level}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="md:self-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-0">
                    <Tabs defaultValue="account" orientation="vertical" className="w-full">
                      <TabsList className="flex flex-row lg:flex-col h-auto justify-start bg-white w-full rounded-none space-x-0 border-b lg:border-b-0 lg:border-r">
                        <TabsTrigger value="account" className="justify-start data-[state=active]:bg-neutral-100">
                          <UserCircle className="h-5 w-5 mr-2" />
                          <span>Account</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="justify-start data-[state=active]:bg-neutral-100">
                          <Lock className="h-5 w-5 mr-2" />
                          <span>Security</span>
                        </TabsTrigger>
                        <TabsTrigger value="apprenticeship" className="justify-start data-[state=active]:bg-neutral-100">
                          <School className="h-5 w-5 mr-2" />
                          <span>Apprenticeship</span>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="justify-start data-[state=active]:bg-neutral-100">
                          <Bell className="h-5 w-5 mr-2" />
                          <span>Notifications</span>
                        </TabsTrigger>
                        <TabsTrigger value="accessibility" className="justify-start data-[state=active]:bg-neutral-100">
                          <Settings className="h-5 w-5 mr-2" />
                          <span>Accessibility</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                <Tabs defaultValue="account">
                  {/* Account Tab */}
                  <TabsContent value="account">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Account Information</CardTitle>
                        <CardDescription>Update your account details and personal information</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Form {...profileForm}>
                          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={profileForm.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={profileForm.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={profileForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="email" 
                                      disabled={user?.role !== 'admin' && user?.role !== 'operations'}
                                    />
                                  </FormControl>
                                  {user?.role !== 'admin' && user?.role !== 'operations' && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Email address can only be changed by an administrator
                                    </p>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      disabled={user?.role !== 'admin' && user?.role !== 'operations'}
                                    />
                                  </FormControl>
                                  {user?.role !== 'admin' && user?.role !== 'operations' && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Username can only be changed by an administrator
                                    </p>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="mt-6">
                              <Button 
                                type="submit" 
                                disabled={updateProfileMutation.isPending}
                              >
                                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Security Tab */}
                  <TabsContent value="security">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Password</CardTitle>
                        <CardDescription>Change your password to keep your account secure</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Form {...passwordForm}>
                          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                            <FormField
                              control={passwordForm.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>New Password</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" />
                                  </FormControl>
                                  <FormDescription>
                                    Password must be at least 6 characters long
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={passwordForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirm New Password</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="password" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="mt-6">
                              <Button 
                                type="submit" 
                                disabled={updatePasswordMutation.isPending}
                              >
                                {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>

                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
                        <CardDescription>Add an extra layer of security to your account</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Two-factor authentication</h3>
                            <p className="text-sm text-neutral-500">Secure your account with two-factor authentication</p>
                          </div>
                          <Switch />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Apprenticeship Tab */}
                  <TabsContent value="apprenticeship">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Apprenticeship Details</CardTitle>
                        <CardDescription>View details about your apprenticeship program</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {isLoading ? (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                          </div>
                        ) : profile ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h3 className="text-sm font-medium text-neutral-500">Program</h3>
                                <p className="text-base mt-1">{profile.standard?.title || "N/A"}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-neutral-500">Level</h3>
                                <p className="text-base mt-1">{profile.standard?.level || "N/A"}</p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-neutral-500">Start Date</h3>
                                <p className="text-base mt-1">
                                  {profile?.startDate ? getFormattedDate(profile.startDate) : "N/A"}
                                </p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-neutral-500">Expected End Date</h3>
                                <p className="text-base mt-1">
                                  {profile?.expectedEndDate ? getFormattedDate(profile.expectedEndDate) : "N/A"}
                                </p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-neutral-500">Minimum Weekly OTJ Hours</h3>
                                <p className="text-base mt-1">
                                  {profile.standard?.minimumOtjHours ? 
                                    `${(profile.standard.minimumOtjHours / 52).toFixed(2)} hours/week` : 
                                    "N/A"}
                                </p>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-neutral-500">Total Required OTJ Hours</h3>
                                <p className="text-base mt-1">{profile.standard?.minimumOtjHours || "N/A"} hours</p>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4 mt-4">
                              <h3 className="font-medium mb-3">Support Team</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div>
                                  <h4 className="text-sm font-medium text-neutral-500">Your Tutor</h4>
                                  <p className="text-base mt-1">
                                    {profile.tutor?.firstName && profile.tutor?.lastName ? 
                                      `${profile.tutor.firstName} ${profile.tutor.lastName}` : 
                                      "Not assigned"}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-neutral-500">Your IQA</h4>
                                  <p className="text-base mt-1">
                                    {profile.iqa?.firstName && profile.iqa?.lastName ? 
                                      `${profile.iqa.firstName} ${profile.iqa.lastName}` : 
                                      "Not assigned"}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm mt-4">Your apprenticeship is provided and managed by <span className="font-medium">SkillTrack Training Academy</span>.</p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-neutral-500">No apprenticeship details found.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Notifications Tab */}
                  <TabsContent value="notifications">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Notification Settings</CardTitle>
                        <CardDescription>Control how you receive notifications</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Email Notifications</h3>
                              <p className="text-sm text-neutral-500">Receive email updates about your apprenticeship</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Platform Notifications</h3>
                              <p className="text-sm text-neutral-500">Receive in-app notifications</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Feedback Notifications</h3>
                              <p className="text-sm text-neutral-500">Get notified when you receive feedback</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Reminder Notifications</h3>
                              <p className="text-sm text-neutral-500">Get reminders about upcoming tasks and deadlines</p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Marketing Emails</h3>
                              <p className="text-sm text-neutral-500">Receive information about new features and updates</p>
                            </div>
                            <Switch />
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <Button>Save Preferences</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="accessibility">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Accessibility Settings</CardTitle>
                        <CardDescription>
                          Customize how content appears to make it easier to read and interact with the platform.
                          These settings are especially helpful for users with dyslexia or visual impairments.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {/* Importing the AccessibilitySettings component */}
                        <div className="mt-4">
                          <AccessibilitySettings />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
