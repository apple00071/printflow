"use client";

import { useState, useRef, useEffect } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // ISO format YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CustomDatePicker({ 
  value, 
  onChange, 
  className = "",
  placeholder = "Select date"
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? parseISO(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedDate = value ? parseISO(value) : null;

  const handleDateSelect = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50/50 rounded-lg text-sm text-left hover:bg-gray-100/50 transition-all outline-none focus:ring-1 focus:ring-primary/10 shadow-sm"
      >
        <CalendarIcon className="w-4 h-4 text-gray-400" />
        <span className={selectedDate ? "text-gray-900" : "text-gray-400"}>
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[110] mt-1 p-3 bg-white border border-gray-100 rounded-xl shadow-2xl shadow-gray-200/40 min-w-[260px] animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-medium text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-gray-50 rounded-lg transition-colors text-gray-400"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-gray-50 rounded-lg transition-colors text-gray-400"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((day) => (
              <div key={day} className="text-[9px] text-center font-medium text-gray-400 uppercase tracking-widest py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDay = isToday(day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`
                    h-8 w-8 flex items-center justify-center rounded-lg text-xs transition-all relative
                    ${!isCurrentMonth ? "text-gray-200" : "text-gray-600 hover:bg-primary/5 hover:text-primary"}
                    ${isSelected ? "bg-primary text-white hover:bg-primary hover:text-white font-medium" : ""}
                    ${isTodayDay && !isSelected ? "text-primary font-semibold after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-primary after:rounded-full" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center px-1">
             <button 
               type="button"
               onClick={() => handleDateSelect(new Date())}
               className="text-[9px] text-primary hover:underline uppercase tracking-widest font-medium"
             >
               Today
             </button>
             <button 
               type="button"
               onClick={() => {
                 onChange("");
                 setIsOpen(false);
               }}
               className="text-[9px] text-gray-400 hover:text-gray-600 uppercase tracking-widest font-medium"
             >
               Clear
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
