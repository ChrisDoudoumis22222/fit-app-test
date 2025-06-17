/* eslint-disable react/prop-types */
import React from "react";
import { cn } from "../lib/cn";

const variants = {
  default:     "bg-indigo-600 text-white",
  secondary:   "bg-gray-700 text-gray-200",
  outline:     "border border-gray-600 text-gray-300",
  destructive: "bg-red-600 text-white",
};

export function Badge({
  variant = "default",
  className = "",
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
