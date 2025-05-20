import { useState, useContext } from "react";
import { AuthContext } from "@/App";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import OtjLogEntryForm from "@/components/forms/otj-log-entry-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function SubmitOtjLog() {
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="mb-6">
              <Button variant="outline" size="sm" asChild>
                <Link href="/otj-logs">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to OTJ Logs
                </Link>
              </Button>
            </div>
            
            <OtjLogEntryForm />
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
