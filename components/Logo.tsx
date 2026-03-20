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
  const isDark = variant === 'dark';
  const primaryColor = isDark ? "text-[#1e3a5f]" : "text-white";
  const accentColor = "text-[#f97316]";
  const subtextColor = isDark ? "text-gray-500" : "text-white/60";

  // Size configurations
  const sizes = {
    sm: {
      icon: "w-8 h-8",
      text: "text-lg",
      subtext: "text-[7px]",
      gap: "gap-2"
    },
    md: {
      icon: "w-10 h-10",
      text: "text-2xl",
      subtext: "text-[9px]",
      gap: "gap-3"
    },
    lg: {
      icon: "w-12 h-12",
      text: "text-3xl",
      subtext: "text-[11px]",
      gap: "gap-4"
    }
  };

  const currentSize = sizes[size];

  return (
    <div className={cn("flex items-center", currentSize.gap, className)}>
      {/* SVG Icon part */}
      <div className={cn("relative shrink-0", currentSize.icon)}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Brackets [ ] */}
          <path 
            d="M35 25 H15 V75 H35" 
            stroke="currentColor" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={primaryColor}
          />
          <path 
            d="M65 25 H85 V75 H65" 
            stroke="currentColor" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={primaryColor}
          />
          
          {/* Orange Dot Above */}
          <circle 
            cx="50" 
            cy="12" 
            r="8" 
            fill="currentColor" 
            className={accentColor} 
          />
          
          {/* Orange Arrow -> */}
          <path 
            d="M35 50 H65 M50 35 L65 50 L50 65" 
            stroke="currentColor" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={accentColor}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className={cn("flex items-center tracking-tighter uppercase font-normal", currentSize.text)}>
            <span className={primaryColor}>Print</span>
            <span className={cn("ml-1.5", accentColor)}>Flow</span>
          </div>
          <span className={cn("tracking-[0.2em] font-normal uppercase font-sans", currentSize.subtext, subtextColor)}>
            Print Shop Software
          </span>
        </div>
      )}
    </div>
  );
};
