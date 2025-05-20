import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          label: 'Approved',
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      case 'in_review':
      case 'submitted':
        return {
          label: 'In Review',
          className: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
        };
      case 'needs_revision':
      case 'rejected':
        return {
          label: 'Needs Revision',
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        };
      case 'draft':
        return {
          label: 'Draft',
          className: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-100'
        };
      case 'verified':
        return {
          label: 'Verified',
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-100'
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      case 'overdue':
        return {
          label: 'Overdue',
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
          className: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-100'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
