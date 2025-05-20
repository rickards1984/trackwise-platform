import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, useContext, lazy, Suspense } from "react";
import { User, getCurrentUser } from "./lib/auth";

// Regular imports for frequently used pages
import Login from "@/pages/auth/login";
import MockLogin from "@/pages/auth/mock-login";
import Register from "@/pages/auth/register";
import VerificationSuccess from "@/pages/auth/verification-success";
import VerificationSent from "@/pages/auth/verification-sent";
import VerificationError from "@/pages/auth/verification-error";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Lazy-loaded components for performance optimization
const EvidenceIndex = lazy(() => import("@/pages/evidence/index"));
const AddEvidence = lazy(() => import("@/pages/evidence/add"));
const ViewEvidence = lazy(() => import("@/pages/evidence/view"));
const OtjLogsIndex = lazy(() => import("@/pages/otj-logs/index"));
const SubmitOtjLog = lazy(() => import("@/pages/otj-logs/submit"));
const TwelveWeekReview = lazy(() => import("@/pages/otj-logs/review"));
const WeeklyOtjTracking = lazy(() => import("@/pages/otj-logs/weekly"));
const KsbTracker = lazy(() => import("@/pages/ksb-tracker"));
const Resources = lazy(() => import("@/pages/resources"));
const Reports = lazy(() => import("@/pages/reports"));
const Profile = lazy(() => import("@/pages/profile"));
const CourseBuilder = lazy(() => import("@/pages/course-builder"));
const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const AdminIlr = lazy(() => import("@/pages/admin/ilr"));
const MobileApp = lazy(() => import("@/pages/mobile/index"));
const ReviewsIndex = lazy(() => import("@/pages/reviews/index"));
const ScheduleReview = lazy(() => import("@/pages/reviews/schedule"));
const ViewReview = lazy(() => import("@/pages/reviews/[id]"));
const BuilderDashboard = lazy(() => import("@/pages/admin/builder/index"));
const FormBuilder = lazy(() => import("@/pages/admin/builder/form/index"));
const ReviewTemplateBuilder = lazy(() => import("@/pages/admin/builder/review-template/index"));

// Learning Goals
const GoalsIndex = lazy(() => import("@/pages/goals/index"));
const AddGoal = lazy(() => import("@/pages/goals/add"));
const GoalDetail = lazy(() => import("@/pages/goals/[id]"));

// ILR components with lazy loading for performance
const ILRIndex = lazy(() => import("@/pages/ilr/index"));
const ILRUpload = lazy(() => import("@/pages/ilr/upload"));
const ILRManualEntry = lazy(() => import("@/pages/ilr/manual-entry"));

// Auth context for user state management
import { createContext } from "react";
export const AuthContext = createContext<{
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}>({
  user: null,
  setUser: () => {},
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Route guard for protected routes
function ProtectedRoute({ 
  component: Component, 
  roles = [] 
}: { 
  component: React.ComponentType<any>; 
  roles?: string[]; 
}) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Route path="/login" />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <NotFound />;
  }

  return <Component />;
}

function Router() {
  const { user } = useContext(AuthContext);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/test-login" component={MockLogin} />
      <Route path="/register" component={Register} />
      <Route path="/auth/verification-sent" component={VerificationSent} />
      <Route path="/auth/verify-email" component={VerificationSuccess} />
      <Route path="/verification-success" component={VerificationSuccess} />
      <Route path="/verification-error" component={VerificationError} />

      {/* Protected routes */}
      <Route path="/">
        {user ? <Dashboard /> : <Login />}
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/evidence">
        <ProtectedRoute component={EvidenceIndex} />
      </Route>
      
      <Route path="/evidence/add">
        <ProtectedRoute component={AddEvidence} roles={["learner"]} />
      </Route>
      
      <Route path="/evidence/:id">
        {(params) => <ProtectedRoute component={() => <ViewEvidence id={params.id} />} />}
      </Route>
      
      <Route path="/otj-logs">
        <ProtectedRoute component={OtjLogsIndex} />
      </Route>
      
      <Route path="/otj-logs/submit">
        <ProtectedRoute component={SubmitOtjLog} roles={["learner"]} />
      </Route>
      
      <Route path="/otj-logs/review">
        <ProtectedRoute component={TwelveWeekReview} />
      </Route>
      
      <Route path="/otj-logs/weekly">
        <ProtectedRoute component={WeeklyOtjTracking} />
      </Route>
      
      <Route path="/ksb-tracker">
        <ProtectedRoute component={KsbTracker} />
      </Route>
      
      <Route path="/resources">
        <ProtectedRoute component={Resources} />
      </Route>
      
      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      
      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} roles={["admin", "training_provider"]} />
      </Route>
      
      <Route path="/admin/ilr">
        <ProtectedRoute component={AdminIlr} roles={["admin", "training_provider"]} />
      </Route>

      {/* Admin Builder */}
      <Route path="/admin/builder">
        <ProtectedRoute component={BuilderDashboard} roles={["admin", "training_provider"]} />
      </Route>
      
      <Route path="/admin/builder/form">
        <ProtectedRoute component={FormBuilder} roles={["admin", "training_provider"]} />
      </Route>
      
      <Route path="/admin/builder/review-template">
        <ProtectedRoute component={ReviewTemplateBuilder} roles={["admin", "training_provider"]} />
      </Route>
      
      {/* Course Builder */}
      <Route path="/course-builder">
        <ProtectedRoute component={CourseBuilder} roles={["admin", "training_provider", "assessor"]} />
      </Route>
      
      {/* Mobile App */}
      <Route path="/mobile">
        <ProtectedRoute component={MobileApp} />
      </Route>
      
      {/* 12-Weekly Reviews */}
      <Route path="/reviews">
        <ProtectedRoute component={ReviewsIndex} />
      </Route>
      
      <Route path="/reviews/schedule">
        <ProtectedRoute 
          component={ScheduleReview} 
          roles={["admin", "training_provider", "assessor"]} 
        />
      </Route>
      
      <Route path="/reviews/:id">
        {(params) => <ProtectedRoute component={() => <ViewReview id={params.id} />} />}
      </Route>

      {/* Learning Goals */}
      <Route path="/goals">
        <ProtectedRoute component={GoalsIndex} />
      </Route>
      
      <Route path="/goals/add">
        <ProtectedRoute component={AddGoal} />
      </Route>
      
      <Route path="/goals/:id">
        {(params) => <ProtectedRoute component={() => <GoalDetail />} />}
      </Route>

      {/* ILR Management - Improved routing structure with layout wrapper */}
      <Route path="/ilr">
        {() => (
          <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}>
            <ILRLayout>
              <ILRIndex />
            </ILRLayout>
          </Suspense>
        )}
      </Route>
      
      <Route path="/ilr/upload">
        {() => (
          <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}>
            <ProtectedRoute 
              component={() => (
                <ILRLayout>
                  <ILRUpload />
                </ILRLayout>
              )} 
            />
          </Suspense>
        )}
      </Route>
      
      <Route path="/ilr/manual-entry">
        {() => (
          <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}>
            <ProtectedRoute 
              component={() => (
                <ILRLayout>
                  <ILRManualEntry />
                </ILRLayout>
              )} 
            />
          </Suspense>
        )}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
