"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: (string | Option)[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({ options, value, onChange, label, placeholder, className }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const normalizedOptions = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 250);
      setHighlightedIndex(normalizedOptions.findIndex(opt => opt.value === value));
    }
    setIsOpen(prev => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, normalizedOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      onChange(normalizedOptions[highlightedIndex].value);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("space-y-1 relative", className)} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        className={cn(
          "w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-left flex items-center justify-between transition-all outline-none",
          isOpen ? "border-primary ring-2 ring-primary/5 bg-white shadow-sm" : "hover:bg-gray-100",
          "font-semibold text-gray-900"
        )}
      >
        <span>{selectedOption ? selectedOption.label : (placeholder || "Select...")}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label || "Options"}
          className={cn(
            "absolute z-dropdown w-full bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-200",
            openUp ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
          )}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {normalizedOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "w-full px-4 py-3 text-sm text-left flex items-center justify-between transition-colors",
                  value === option.value ? "bg-primary/5 text-primary font-semibold" : "text-gray-600",
                  index === highlightedIndex && value !== option.value && "bg-gray-50"
                )}
              >
                {option.label}
                {value === option.value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
