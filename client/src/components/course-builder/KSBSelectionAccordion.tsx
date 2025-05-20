import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Lightbulb, Wrench } from "lucide-react";

interface KSBElement {
  id: number;
  type: "knowledge" | "skill" | "behavior";
  code: string;
  description: string;
  standardId: number;
}

interface KSBSelectionAccordionProps {
  ksbs: KSBElement[];
  selectedKsbIds: number[];
  onKsbToggle: (ksbId: number) => void;
  onSelectAllType?: (type: "knowledge" | "skill" | "behavior") => void;
}

export function KSBSelectionAccordion({
  ksbs,
  selectedKsbIds,
  onKsbToggle,
  onSelectAllType
}: KSBSelectionAccordionProps) {
  // Group KSBs by type
  const knowledgeItems = ksbs.filter(ksb => ksb.type === "knowledge");
  const skillItems = ksbs.filter(ksb => ksb.type === "skill");
  const behaviorItems = ksbs.filter(ksb => ksb.type === "behavior");

  return (
    <Accordion type="multiple" className="w-full">
      {/* Knowledge section */}
      {knowledgeItems.length > 0 && (
        <AccordionItem value="knowledge">
          <AccordionTrigger className="flex items-center">
            <div className="flex items-center">
              <BookOpen className="mr-2 h-4 w-4 text-blue-500" />
              <span>Knowledge</span>
              <Badge variant="outline" className="ml-2">
                {knowledgeItems.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {onSelectAllType && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSelectAllType("knowledge")}
                  className="mb-2"
                >
                  Select All Knowledge
                </Button>
              )}
              {knowledgeItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-2 p-2 rounded hover:bg-muted">
                  <Checkbox
                    id={`ksb-${item.id}`}
                    checked={selectedKsbIds.includes(item.id)}
                    onCheckedChange={() => onKsbToggle(item.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`ksb-${item.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                    >
                      <Badge variant="outline" className="mr-2">
                        {item.code}
                      </Badge>
                      {item.description}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Skills section */}
      {skillItems.length > 0 && (
        <AccordionItem value="skills">
          <AccordionTrigger className="flex items-center">
            <div className="flex items-center">
              <Wrench className="mr-2 h-4 w-4 text-green-500" />
              <span>Skills</span>
              <Badge variant="outline" className="ml-2">
                {skillItems.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {onSelectAllType && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSelectAllType("skill")}
                  className="mb-2"
                >
                  Select All Skills
                </Button>
              )}
              {skillItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-2 p-2 rounded hover:bg-muted">
                  <Checkbox
                    id={`ksb-${item.id}`}
                    checked={selectedKsbIds.includes(item.id)}
                    onCheckedChange={() => onKsbToggle(item.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`ksb-${item.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                    >
                      <Badge variant="outline" className="mr-2">
                        {item.code}
                      </Badge>
                      {item.description}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Behaviors section */}
      {behaviorItems.length > 0 && (
        <AccordionItem value="behaviors">
          <AccordionTrigger className="flex items-center">
            <div className="flex items-center">
              <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
              <span>Behaviors</span>
              <Badge variant="outline" className="ml-2">
                {behaviorItems.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {onSelectAllType && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSelectAllType("behavior")}
                  className="mb-2"
                >
                  Select All Behaviors
                </Button>
              )}
              {behaviorItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-2 p-2 rounded hover:bg-muted">
                  <Checkbox
                    id={`ksb-${item.id}`}
                    checked={selectedKsbIds.includes(item.id)}
                    onCheckedChange={() => onKsbToggle(item.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`ksb-${item.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                    >
                      <Badge variant="outline" className="mr-2">
                        {item.code}
                      </Badge>
                      {item.description}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}