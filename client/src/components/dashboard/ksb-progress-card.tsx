import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wrench, Lightbulb, Users } from "lucide-react";

interface KsbProgressItem {
  type: string;
  achieved: number;
  total: number;
}

interface FocusArea {
  type: string;
  name: string;
  remaining: number;
  icon?: string;
}

interface KsbProgressCardProps {
  ksbProgress: KsbProgressItem[];
  focusAreas: FocusArea[];
}

export default function KsbProgressCard({ ksbProgress, focusAreas }: KsbProgressCardProps) {
  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'skill':
        return <Wrench className="text-sm" />;
      case 'knowledge':
        return <Lightbulb className="text-sm" />;
      case 'behavior':
        return <Users className="text-sm" />;
      default:
        return <Lightbulb className="text-sm" />;
    }
  };

  const getDisplayType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'knowledge':
        return 'Knowledge';
      case 'skill':
        return 'Skills';
      case 'behavior':
        return 'Behaviors';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">KSB Progress</h3>

        <div className="space-y-4">
          {ksbProgress.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-neutral-700">{getDisplayType(item.type)}</span>
                <span className="text-neutral-500">{item.achieved} / {item.total} completed</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${(item.achieved / item.total) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h4 className="text-sm font-medium text-neutral-700 mb-3">Focus Areas</h4>
          
          <div className="space-y-2">
            {focusAreas.map((area, index) => (
              <div key={index} className="flex items-center p-2 rounded-md hover:bg-neutral-50">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  {getIconForType(area.type)}
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-neutral-900">{area.name}</div>
                  <div className="text-xs text-neutral-500">
                    {getDisplayType(area.type)}: {area.remaining} {area.remaining === 1 ? 'item' : 'items'} remaining
                  </div>
                </div>
              </div>
            ))}
            
            {focusAreas.length === 0 && (
              <div className="text-center py-4 text-sm text-neutral-500">
                Great job! All KSBs are on track.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/ksb-tracker">
              View KSB Framework
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
