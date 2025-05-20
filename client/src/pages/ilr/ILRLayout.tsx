import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ILRLayoutProps {
  children: React.ReactNode;
}

export default function ILRLayout({ children }: ILRLayoutProps) {
  const [location] = useLocation();
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ILR Management</h1>
          <p className="text-muted-foreground">
            Create, upload, and manage Individualised Learner Records.
          </p>
        </div>
      </div>
      
      <Card>
        <Tabs value={location.includes("/ilr/upload") ? "upload" : location.includes("/ilr/manual-entry") ? "manual" : "overview"}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="overview" asChild>
              <Link href="/ilr">Overview</Link>
            </TabsTrigger>
            <TabsTrigger value="upload" asChild>
              <Link href="/ilr/upload">Upload ILR</Link>
            </TabsTrigger>
            <TabsTrigger value="manual" asChild>
              <Link href="/ilr/manual-entry">Manual Entry</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}