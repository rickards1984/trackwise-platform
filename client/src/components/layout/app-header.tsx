import { useState, useContext } from "react";
import { Link, useLocation } from "wouter";
import { User, getUserInitials, logout } from "@/lib/auth";
import { AuthContext } from "@/App";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AppHeaderProps {
  toggleSidebar?: () => void;
}

export default function AppHeader({ toggleSidebar }: AppHeaderProps) {
  const [, navigate] = useLocation();
  const { user, setUser } = useContext(AuthContext);
  const { toast } = useToast();
  const [showMobileNav, setShowMobileNav] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      queryClient.clear();
      navigate("/login");
      toast({
        title: "Logged out successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Main Nav */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-primary text-3xl mr-2 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
              </span>
              <span className="font-semibold text-xl text-primary">SkillTrack</span>
            </div>
            
            <nav className="hidden md:flex ml-10 space-x-8">
              <Link href="/dashboard">
                <a className="text-neutral-900 hover:text-primary px-3 py-2 font-medium text-sm">Dashboard</a>
              </Link>
              <Link href="/evidence">
                <a className="text-neutral-500 hover:text-primary px-3 py-2 font-medium text-sm">Evidence</a>
              </Link>
              <Link href="/otj-logs">
                <a className="text-neutral-500 hover:text-primary px-3 py-2 font-medium text-sm">OTJ Logs</a>
              </Link>
              <Link href="/resources">
                <a className="text-neutral-500 hover:text-primary px-3 py-2 font-medium text-sm">Resources</a>
              </Link>
              <Link href="/reports">
                <a className="text-neutral-500 hover:text-primary px-3 py-2 font-medium text-sm">Reports</a>
              </Link>
            </nav>
          </div>

          {/* User Menu and Notifications */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-primary">
              <Bell className="h-5 w-5" />
              <span className="sr-only">View notifications</span>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 flex items-center pl-2">
                  <Avatar className="h-8 w-8 mr-2">
                    {user?.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.firstName} />
                    ) : (
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="ml-2 hidden md:block">{user?.firstName} {user?.lastName}</span>
                  <ChevronDown className="ml-1 h-4 w-4 text-neutral-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  Profile
                </DropdownMenuItem>
                {(user?.role === "admin" || user?.role === "training_provider") && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
