import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lightbulb, Wrench } from "lucide-react";

interface KsbElement {
  id: number;
  type: "knowledge" | "skill" | "behavior";
  code: string;
  description: string;
  standardId: number;
}

interface KSBDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ksb: KsbElement | null;
  onAddToModule?: (ksbId: number) => void;
}

export function KSBDetailModal({ isOpen, onClose, ksb, onAddToModule }: KSBDetailModalProps) {
  if (!ksb) return null;

  const getTypeIcon = () => {
    switch (ksb.type) {
      case "knowledge":
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case "skill":
        return <Wrench className="h-5 w-5 text-green-500" />;
      case "behavior":
        return <Lightbulb className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    return ksb.type.charAt(0).toUpperCase() + ksb.type.slice(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getTypeIcon()}
            <span className="ml-2">
              {getTypeLabel()}: {ksb.code}
            </span>
          </DialogTitle>
          <DialogDescription>
            <Badge className="mt-2">{ksb.code}</Badge>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-700">{ksb.description}</p>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onAddToModule && (
            <Button onClick={() => onAddToModule(ksb.id)}>
              Add to Current Module
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}