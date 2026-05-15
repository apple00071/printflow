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
  const subtextColor = isDark ? "text-slate-400" : "text-white/60";

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
      text: "text-xl",
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
      {/* Official Recreated Icon part */}
      <div className={cn("relative shrink-0 flex items-center justify-center", currentSize.icon)}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Square Bracket [ ] */}
          <path 
            d="M25 20 H12 V80 H25 M75 20 H88 V80 H75" 
            stroke="currentColor" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={primaryColor}
          />
          
          {/* Dot Above Arrow */}
          <circle 
            cx="42" 
            cy="30" 
            r="8" 
            fill="currentColor" 
            className={accentColor} 
          />
          
          {/* Arrow with curve/tail */}
          <path 
            d="M25 60 Q40 60 55 60 M65 60 L78 60 M65 48 L78 60 L65 72" 
            stroke="currentColor" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={accentColor}
          />
          {/* Simpler Arrow Body for accuracy */}
          <path 
            d="M30 60 H75 M62 45 L77 60 L62 75" 
            stroke="currentColor" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={accentColor}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className={cn("flex items-center tracking-tight uppercase font-bold", currentSize.text)}>
            <span className={primaryColor}>Print</span>
            <span className={cn("ml-1", accentColor)}>Flow</span>
          </div>
          <span className={cn("tracking-[0.15em] font-bold uppercase text-slate-400", currentSize.subtext)}>
            Print Shop Software
          </span>
        </div>
      )}
    </div>
  );
};
