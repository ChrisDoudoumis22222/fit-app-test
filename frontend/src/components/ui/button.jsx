/* eslint-disable react/prop-types */
import React, { forwardRef } from "react";
import { cn } from "../lib/cn";

/* Tailwind utility maps
   (tweak colours / sizes to taste) */
const variants = {
  default:     "bg-indigo-600 hover:bg-indigo-500 text-white",
  secondary:   "bg-gray-800 hover:bg-gray-700 text-gray-200",
  ghost:       "hover:bg-gray-800/70 text-gray-200",
  outline:     "border border-gray-700 hover:bg-gray-800 text-gray-200",
  destructive: "bg-red-600 hover:bg-red-500 text-white",
};

const sizes = {
  default: "h-10 px-4 py-2 text-sm",
  sm:      "h-8  px-3 text-xs",
  lg:      "h-12 px-6 text-base",
  icon:    "h-10 w-10 p-0",
};

export const Button = forwardRef(function Button(
  {
    variant   = "default",
    size      = "default",
    className = "",
    asChild   = false,    // shadcn parity
    ...props
  },
  ref
) {
  const Comp = asChild ? "span" : "button";

  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "rounded-md transition-colors focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-indigo-500",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
