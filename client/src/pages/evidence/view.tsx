import { useState, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import AppHeader from "@/components/layout/app-header";
import Sidebar from "@/components/layout/sidebar";
import AppFooter from "@/components/layout/app-footer";
import EvidenceItem from "@/components/evidence/evidence-item";
import { useToast } from "@/hooks/use-toast";

interface ViewEvidenceProps {
  id: string;
}

export default function ViewEvidence({ id }: ViewEvidenceProps) {
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const { data: evidence, isLoading, error } = useQuery({
    queryKey: [`/api/evidence/${id}`],
  });

  // Show an error toast if needed
  if (error) {
    toast({
      title: "Error loading evidence",
      description: "There was a problem loading the evidence. Please try again.",
      variant: "destructive",
    });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader toggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 flex-1">
          <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : evidence ? (
              <EvidenceItem 
                {...evidence}
                canEdit={user?.id === evidence.learnerId && evidence.status !== 'approved'}
              />
            ) : (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-neutral-800 mb-2">Evidence Not Found</h2>
                <p className="text-neutral-600">The evidence you're looking for doesn't exist or you don't have permission to view it.</p>
              </div>
            )}
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
