// src/components/ui/Calendar.js
import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

/**
 * Tiny wrapper so you can keep the same API everywhere.
 * Supports: mode = "single" | "range" | "multiple"
 *
 * Common props:
 *  - mode        : selection mode ("single" by default)
 *  - selected    : the selected date(s)
 *  - onSelect    : callback when user selects
 *  - fromDate    : minimum selectable date
 *  - toDate      : maximum selectable date
 *  - disabled    : function or matcher to disable dates
 *  - className   : extra classes for the container
 */
export function Calendar({
  mode = "single",
  selected,
  onSelect,
  className = "",
  ...props
}) {
  return (
    <div className={`rdp-wrapper ${className}`}>
      <DayPicker
        mode={mode}
        selected={selected}
        onSelect={onSelect}
        weekStartsOn={1}
        {...props}
      />
    </div>
  );
}

export default Calendar;
