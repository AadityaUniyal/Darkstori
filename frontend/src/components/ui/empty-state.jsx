import React from 'react';
import { Ghost } from 'lucide-react';
import { cn } from "../../lib/utils";
import { motion } from 'framer-motion';

export function EmptyState({ title = "No data found", description = "We couldn't find any data for this view.", icon: Icon = Ghost, action, className }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-card/50 rounded-xl border border-dashed border-border/60 backdrop-blur-sm", className)}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative bg-background p-4 rounded-full border border-border shadow-sm">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
