/* eslint-disable react/prop-types */
import React, { forwardRef } from "react";
import { cn } from "../lib/cn";

/* ——————————————————————————
   Core container
   —————————————————————————— */
export const Card = forwardRef(function Card(
  { className = "", ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-gray-800 bg-gray-900/60",   // dark glass
        "shadow-lg backdrop-blur-lg backdrop-saturate-150",
        className
      )}
      {...props}
    />
  );
});

/* ——————————————————————————
   Sub-components
   —————————————————————————— */
function makeSub(tag, base) {
  return forwardRef(({ className = "", ...props }, ref) =>
    React.createElement(tag, {
      ref,
      className: cn(base, className),
      ...props,
    })
  );
}

export const CardHeader  = makeSub(
  "div",
  "flex flex-col gap-1.5 p-6 border-b border-gray-800"
);
export const CardTitle   = makeSub(
  "h3",
  "text-lg font-semibold leading-none tracking-tight text-white"
);
export const CardDesc    = makeSub(
  "p",
  "text-sm text-gray-400"
);
export const CardContent = makeSub(
  "div",
  "p-6"
);
export const CardFooter  = makeSub(
  "div",
  "p-6 border-t border-gray-800"
);
