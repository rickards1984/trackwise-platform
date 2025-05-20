import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/status-badge";
import { getUserInitials } from "@/lib/auth";
import { MessageSquare } from "lucide-react";

export interface FeedbackItem {
  id: number;
  message: string;
  date: string;
  relatedItemType: string;
  relatedItemId: number;
  relatedItemTitle?: string;
  status?: string;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl: string | null;
  };
}

interface FeedbackSectionProps {
  feedbackItems: FeedbackItem[];
}

export default function FeedbackSection({ feedbackItems }: FeedbackSectionProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Invalid date";
    }
  };

  const getRelatedItemUrl = (item: FeedbackItem) => {
    switch (item.relatedItemType) {
      case 'evidence':
        return `/evidence/${item.relatedItemId}`;
      case 'otj_log':
        return `/otj-logs`;
      default:
        return '#';
    }
  };

  const getRelatedItemType = (type: string) => {
    switch (type) {
      case 'evidence':
        return 'Evidence';
      case 'otj_log':
        return 'OTJ Log';
      default:
        return 'Item';
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'assessor':
        return 'Tutor';
      case 'iqa':
        return 'IQA';
      case 'training_provider':
        return 'Training Provider';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-neutral-900">Recent Feedback</h3>
          <Link href="/feedback">
            <a className="text-sm font-medium text-primary hover:text-primary-dark">View All</a>
          </Link>
        </div>

        <div className="space-y-4">
          {feedbackItems.length > 0 ? (
            feedbackItems.map((item) => (
              <div key={item.id} className="border border-neutral-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 bg-secondary">
                      {item.sender.avatarUrl ? (
                        <AvatarImage src={item.sender.avatarUrl} alt={`${item.sender.firstName} ${item.sender.lastName}`} />
                      ) : (
                        <AvatarFallback>
                          {getUserInitials({
                            firstName: item.sender.firstName,
                            lastName: item.sender.lastName
                          } as any)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-neutral-900">{item.sender.firstName} {item.sender.lastName}</p>
                      <p className="text-xs text-neutral-500">{getRoleDisplay(item.sender.role)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">{formatDate(item.date)}</p>
                </div>
                
                <div className="bg-neutral-50 rounded-md p-3 mb-2 text-sm text-neutral-700">
                  <p>{item.message}</p>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    {item.status && <StatusBadge status={item.status} className="mr-2" />}
                    <span className="text-xs text-neutral-500">
                      {item.relatedItemTitle || `${getRelatedItemType(item.relatedItemType)} #${item.relatedItemId}`}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary-dark" asChild>
                    <Link href={getRelatedItemUrl(item)}>View</Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-neutral-500">
              <MessageSquare className="mx-auto h-10 w-10 text-neutral-300 mb-2" />
              <p>No feedback yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
