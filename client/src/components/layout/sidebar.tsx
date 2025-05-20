import { useContext } from "react";
import { Link, useLocation } from "wouter";
import { AuthContext } from "@/App";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Folder,
  HelpCircle,
  Home,
  LayoutDashboard,
  Layers,
  MessageSquare,
  UserCheck,
  Wand2
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean; // For mobile view
  onClose?: () => void; // For mobile view
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useContext(AuthContext);

  // Navigation items
  const learnerNavigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard, current: location === "/dashboard" },
    { name: "My Evidence", href: "/evidence", icon: Folder, current: location.startsWith("/evidence") },
    { name: "OTJ Hours Log", href: "/otj-logs", icon: Clock, current: location.startsWith("/otj-logs") },
    { name: "12-Weekly Reviews", href: "/reviews", icon: Calendar, current: location.startsWith("/reviews") },
    { name: "KSB Tracker", href: "/ksb-tracker", icon: UserCheck, current: location === "/ksb-tracker" },
    { name: "Learning Resources", href: "/resources", icon: BookOpen, current: location === "/resources" },
  ];

  // Training provider/assessor/admin navigation
  const providerNavigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard, current: location === "/dashboard" },
    { name: "Course Builder", href: "/course-builder", icon: Layers, current: location === "/course-builder" },
    { name: "Evidence Review", href: "/evidence", icon: Folder, current: location.startsWith("/evidence") },
    { name: "OTJ Hours Verification", href: "/otj-logs", icon: Clock, current: location.startsWith("/otj-logs") },
    { name: "12-Weekly Reviews", href: "/reviews", icon: Calendar, current: location.startsWith("/reviews") },
    { name: "Learning Resources", href: "/resources", icon: BookOpen, current: location === "/resources" },
    { name: "Reports", href: "/reports", icon: FileText, current: location === "/reports" },
  ];

  // Choose the appropriate navigation based on user role
  const navigation = user?.role === "admin" || user?.role === "training_provider" || user?.role === "assessor" 
    ? providerNavigation 
    : learnerNavigation;

  const support = [
    { name: "Help & Resources", href: "/help", icon: HelpCircle, current: location === "/help" },
    { name: "Contact Tutor", href: "/contact", icon: MessageSquare, current: location === "/contact" },
  ];

  const sidebarClasses = cn(
    "md:flex w-64 flex-col fixed inset-y-0 pt-16 border-r border-neutral-200 bg-white",
    {
      "hidden": !isOpen, // Hide on mobile when closed
      "flex z-40 transition-transform": true, // Always apply these
    }
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-neutral-600 bg-opacity-75 md:hidden" 
          onClick={onClose}
        ></div>
      )}
      
      <aside className={sidebarClasses}>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex-1 px-3 space-y-1">
            <div className="px-3 pb-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {user?.role === "learner" ? "Learner Dashboard" : user?.role === "assessor" ? "Assessor Dashboard" : user?.role === "iqa" ? "IQA Dashboard" : "Dashboard"}
              </p>
            </div>
            
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    item.current
                      ? "bg-primary-light text-primary"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      item.current ? "text-primary" : "text-neutral-500"
                    )}
                  />
                  {item.name}
                </a>
              </Link>
            ))}

            <div className="px-3 pt-5 pb-2">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Support</p>
            </div>

            {support.map((item) => (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    item.current
                      ? "bg-primary-light text-primary"
                      : "text-neutral-700 hover:bg-neutral-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      item.current ? "text-primary" : "text-neutral-500"
                    )}
                  />
                  {item.name}
                </a>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center">
            <Avatar className="h-8 w-8">
              {user?.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.firstName} />
              ) : (
                <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
              )}
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-neutral-500">
                {user?.role === "learner" ? "Apprentice" : 
                 user?.role === "assessor" ? "Assessor" :
                 user?.role === "iqa" ? "IQA" :
                 user?.role === "training_provider" ? "Training Provider" :
                 user?.role === "admin" ? "Administrator" : ""}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
