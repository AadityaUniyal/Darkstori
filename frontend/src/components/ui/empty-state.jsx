import React from 'react';
import { Ghost } from 'lucide-react';
import { cn } from "../../lib/utils";

export function EmptyState({ title = "No data found", description = "We couldn't find any data for this view.", className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-muted/20 rounded-lg border border-dashed", className)}>
      <Ghost className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
    </div>
  );
}
