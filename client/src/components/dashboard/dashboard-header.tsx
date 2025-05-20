import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { User } from "@/lib/auth";

interface DashboardHeaderProps {
  user: User | null;
  taskCount?: number;
}

export default function DashboardHeader({ user, taskCount = 0 }: DashboardHeaderProps) {
  return (
    <div className="md:flex md:items-center md:justify-between mb-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Welcome back, {user?.firstName}. You have <span className="font-medium text-primary">{taskCount} tasks</span> due this week.
        </p>
      </div>
      <div className="mt-4 flex md:mt-0 md:ml-4">
        <Button variant="outline" className="mr-3" asChild>
          <Link href="/schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Link>
        </Button>
        <Button asChild>
          <Link href="/otj-logs/submit">
            <Plus className="h-4 w-4 mr-2" />
            Add OTJ Entry
          </Link>
        </Button>
      </div>
    </div>
  );
}
