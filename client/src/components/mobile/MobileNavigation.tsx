import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Home, Clock, FileText, BookOpen, BarChart2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navigate = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <Clock className="w-5 h-5" />, label: "OTJ Logs", path: "/otj-logs" },
    { icon: <FileText className="w-5 h-5" />, label: "Evidence", path: "/evidence" },
    { icon: <BookOpen className="w-5 h-5" />, label: "KSB Tracker", path: "/ksb-tracker" },
    { icon: <BarChart2 className="w-5 h-5" />, label: "Reports", path: "/reports" },
    { icon: <User className="w-5 h-5" />, label: "Profile", path: "/profile" },
  ];

  // Add admin routes if user is admin or training provider
  if (user?.role === "admin" || user?.role === "training_provider") {
    menuItems.push(
      { icon: <BarChart2 className="w-5 h-5" />, label: "Admin", path: "/admin" }
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-white shadow-md"
          onClick={toggleMenu}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggleMenu}
      />

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-3/4 max-w-xs bg-white shadow-xl md:hidden transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-2xl font-bold">Menu</h2>
            <p className="text-sm text-muted-foreground">Apprenticeship Portal</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                className="flex items-center w-full p-4 hover:bg-gray-100 transition-colors"
                onClick={() => navigate(item.path)}
              >
                <span className="mr-3 text-primary">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="p-4 border-t">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => navigate('/api/logout')}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}