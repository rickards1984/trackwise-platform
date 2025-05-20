import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lightbulb, Wrench } from "lucide-react";

interface StandardInfo {
  id: number;
  title: string;
  level: number;
  description: string;
  minimumOtjHours?: number;
}

interface KsbCounts {
  knowledge: number;
  skills: number;
  behaviors: number;
}

interface StandardInfoCardProps {
  standard: StandardInfo;
  ksbCounts: KsbCounts;
}

export function StandardInfoCard({ standard, ksbCounts }: StandardInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{standard.title}</span>
          <Badge variant="outline">Level {standard.level}</Badge>
        </CardTitle>
        <CardDescription>
          {standard.minimumOtjHours && (
            <span className="text-sm text-muted-foreground">
              Minimum Off-the-Job Hours: {standard.minimumOtjHours} per week
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm">{standard.description}</p>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <BookOpen className="mr-1 h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Knowledge: {ksbCounts.knowledge}</span>
            </div>
            <div className="flex items-center">
              <Wrench className="mr-1 h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Skills: {ksbCounts.skills}</span>
            </div>
            <div className="flex items-center">
              <Lightbulb className="mr-1 h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Behaviors: {ksbCounts.behaviors}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}