"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * A smart autocomplete component for Product/Job Type selection.
 * Shows all options on focus, and filters to suggestions after 3 characters of typing.
 * Supports keyboard navigation (arrow keys, enter, escape).
 */
export default function ProductAutocomplete({
  value,
  onChange,
  options,
  placeholder = "e.g. Business Cards, Banners...",
  required = false,
  className,
}: ProductAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep input in sync with external value changes (e.g. from parser)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter logic: show all on focus (empty/short), filter after 3 chars
  const filteredOptions = inputValue.length < 3
    ? options
    : options.filter((opt) =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
      );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
        />
        <ChevronDown
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none transition-transform duration-200",
            showSuggestions && "rotate-180"
          )}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredOptions.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Hint message when showing all options */}
          {inputValue.length < 3 && inputValue.length > 0 && (
            <p className="px-3 pt-2 pb-1 text-[10px] text-gray-400">
              Type 3+ letters to filter suggestions
            </p>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.map((option, index) => (
              <button
                key={option}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click fires
                  handleSelect(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors",
                  index === highlightedIndex
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                {/* Highlight matching portion */}
                {inputValue.length >= 3 ? (
                  <HighlightedText text={option} query={inputValue} />
                ) : (
                  <span>{option}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {showSuggestions && inputValue.length >= 3 && filteredOptions.length === 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-3 px-4 animate-in fade-in duration-150">
          <p className="text-xs text-gray-500">
            No product found — <span className="font-medium text-gray-700">&quot;{inputValue}&quot;</span> will be saved as a new product.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper sub-component: bold the matching portion of the text
function HighlightedText({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, index)}
      <span className="font-semibold text-primary">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </span>
  );
}
