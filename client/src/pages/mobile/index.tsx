import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Home, Clock, FileUp, User, Menu, X } from "lucide-react";
import { useLocation } from "wouter";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileOtjLogger } from "@/components/mobile/MobileOtjLogger";
import { MobileEvidenceCollector } from "@/components/mobile/MobileEvidenceCollector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function MobileApp() {
  const { user, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("home");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth/login");
    return null;
  }

  // Format name for display
  const displayName = user.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : user.email || 'Apprentice';

  const initials = user.firstName 
    ? `${user.firstName.charAt(0)}${user.lastName ? user.lastName.charAt(0) : ''}` 
    : 'AP';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-lg font-bold">
              {activeTab === "home" ? "Dashboard" : 
               activeTab === "otj" ? "OTJ Logger" : 
               activeTab === "evidence" ? "Evidence" : "Profile"}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <div className="flex flex-col h-full">
                  <div className="py-6">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl || ''} alt={displayName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="flex-1 space-y-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => { 
                        setActiveTab("home");
                        navigate("/mobile");
                      }}
                    >
                      <Home className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/otj-logs");
                      }}
                    >
                      <Clock className="mr-2 h-4 w-4" /> View OTJ Logs
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/evidence");
                      }}
                    >
                      <FileUp className="mr-2 h-4 w-4" /> Evidence Portfolio
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/profile");
                      }}
                    >
                      <User className="mr-2 h-4 w-4" /> Profile
                    </Button>
                  </nav>
                  
                  <div className="py-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        navigate("/api/logout");
                      }}
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="home" className="mt-0 p-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Welcome, {user.firstName || 'Apprentice'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Quick access to your apprenticeship activities
                </p>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("otj")}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    OTJ Logger
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Log your training hours
                  </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("evidence")}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base flex items-center">
                    <FileUp className="h-4 w-4 mr-2" />
                    Evidence
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Submit new evidence
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="py-2 border-b last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">
                            {i % 2 === 0 ? 'Evidence Submitted' : 'OTJ Hours Logged'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(Date.now() - i * 86400000).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="px-2 py-1 rounded-full bg-primary/10 text-xs">
                          {i % 2 === 0 ? 'Evidence' : 'OTJ'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All Activity
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="otj" className="mt-0 p-0">
            <MobileOtjLogger />
          </TabsContent>

          <TabsContent value="evidence" className="mt-0 p-0">
            <MobileEvidenceCollector />
          </TabsContent>

          <TabsContent value="profile" className="mt-0 p-0">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatarUrl || ''} alt={displayName} />
                    <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{displayName}</h2>
                    <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                    {user.email && <p className="text-sm">{user.email}</p>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Apprenticeship Details</h3>
                    <div className="text-sm mt-1">
                      <p><span className="text-muted-foreground">Standard:</span> [Standard Title]</p>
                      <p><span className="text-muted-foreground">Employer:</span> [Employer]</p>
                      <p><span className="text-muted-foreground">Start Date:</span> [Start Date]</p>
                      <p><span className="text-muted-foreground">OTJ Target:</span> 6 hours per week</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate("/profile")}>
                  View Full Profile
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 bg-white border-t py-2 px-4">
        <div className="flex justify-around">
          <Button
            variant={activeTab === "home" ? "default" : "ghost"}
            className="flex flex-col h-14 items-center justify-center rounded-md px-3"
            onClick={() => setActiveTab("home")}
          >
            <Home className={`h-5 w-5 ${activeTab === "home" ? "" : "text-muted-foreground"}`} />
            <span className={`text-xs mt-1 ${activeTab === "home" ? "" : "text-muted-foreground"}`}>Home</span>
          </Button>
          
          <Button
            variant={activeTab === "otj" ? "default" : "ghost"}
            className="flex flex-col h-14 items-center justify-center rounded-md px-3"
            onClick={() => setActiveTab("otj")}
          >
            <Clock className={`h-5 w-5 ${activeTab === "otj" ? "" : "text-muted-foreground"}`} />
            <span className={`text-xs mt-1 ${activeTab === "otj" ? "" : "text-muted-foreground"}`}>OTJ</span>
          </Button>
          
          <Button
            variant={activeTab === "evidence" ? "default" : "ghost"}
            className="flex flex-col h-14 items-center justify-center rounded-md px-3"
            onClick={() => setActiveTab("evidence")}
          >
            <FileUp className={`h-5 w-5 ${activeTab === "evidence" ? "" : "text-muted-foreground"}`} />
            <span className={`text-xs mt-1 ${activeTab === "evidence" ? "" : "text-muted-foreground"}`}>Evidence</span>
          </Button>
          
          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            className="flex flex-col h-14 items-center justify-center rounded-md px-3"
            onClick={() => setActiveTab("profile")}
          >
            <User className={`h-5 w-5 ${activeTab === "profile" ? "" : "text-muted-foreground"}`} />
            <span className={`text-xs mt-1 ${activeTab === "profile" ? "" : "text-muted-foreground"}`}>Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
}