"use client"

import React from "react"
import { motion } from "framer-motion"

const buttonVariants = {
  default: "bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90",
  destructive: "bg-red-500 text-zinc-50 hover:bg-red-500/90",
  outline: "border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900",
  secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80",
  ghost: "hover:bg-zinc-100 hover:text-zinc-900",
  link: "text-zinc-900 underline-offset-4 hover:underline",
}

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
}

export const Button = React.forwardRef(
  (
    { className = "", variant = "default", size = "default", asChild = false, children, disabled = false, ...props },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

    const variantClasses = buttonVariants[variant] || buttonVariants.default
    const sizeClasses = buttonSizes[size] || buttonSizes.default

    const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`

    if (asChild) {
      return React.cloneElement(children, {
        className: combinedClasses,
        ref,
        disabled,
        ...props,
      })
    }

    return (
      <motion.button
        className={combinedClasses}
        ref={ref}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        {...props}
      >
        {children}
      </motion.button>
    )
  },
)

Button.displayName = "Button"
