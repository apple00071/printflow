import React from 'react';
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  variant = 'dark',
  showText = true,
  size = 'md'
}) => {
  // Size configurations
  const sizes = {
    sm: {
      collapsedHeight: "h-10", // 40px - Bolder presence for the slim sidebar
      expandedHeight: "h-12", // 48px
      expandedWidth: "w-40",
      collapsedWidth: "w-10",
    },
    md: {
      collapsedHeight: "h-12",
      expandedHeight: "h-14",
      expandedWidth: "w-48",
      collapsedWidth: "w-12",
    },
    lg: {
      collapsedHeight: "h-14",
      expandedHeight: "h-20",
      expandedWidth: "w-64",
      collapsedWidth: "w-14",
    }
  };

  const currentSize = sizes[size];
  
  return (
    <div className={cn(
      "relative select-none transition-all duration-300 ease-in-out shrink-0 flex items-center justify-center", 
      showText ? currentSize.expandedHeight : currentSize.collapsedHeight,
      showText ? currentSize.expandedWidth : currentSize.collapsedWidth,
      className
    )}>
      {/* Icon (Shown when collapsed) */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300 flex items-center justify-center",
        showText ? "opacity-0 invisible" : "opacity-100 visible"
      )}>
        <img 
          src="/icon.png" 
          alt="PrintFlow Icon" 
          className="h-10 w-10 object-contain" 
        />
      </div>

      {/* Full Logo (Shown when expanded) */}
      <div className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 flex items-center justify-start",
        showText ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
      )}>
        <img 
          src="/logo.png" 
          alt="PrintFlow Logo" 
          className="h-12 w-auto object-contain" 
        />
      </div>
    </div>
  );
};
