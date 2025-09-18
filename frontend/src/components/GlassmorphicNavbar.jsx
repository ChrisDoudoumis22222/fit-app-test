// FILE: src/components/GlassmorphicNavbar.jsx
"use client";

import * as React from "react";
import { useState, useEffect, isValidElement, cloneElement } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, Info, Phone, UserPlus } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cva } from "class-variance-authority";

/* cn helper */
function cn(...inputs) { return twMerge(clsx(inputs)); }

/* shadcn-like Button WITHOUT Radix Slot (CRA safe) */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        ghost: "bg-transparent",
        outline: "border border-white/25 bg-transparent",
      },
      size: {
        lg: "h-10 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "ghost", size: "lg" },
  }
);

function Button({ className, variant, size, asChild = false, children, ...props }) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild && isValidElement(children)) {
    const childClass = children.props?.className || "";
    return cloneElement(children, { ...props, className: cn(childClass, classes) });
  }
  return <button className={classes} {...props}>{children}</button>;
}

/* per-button hover style: button turns white, text/icons turn black */
const BTN_HOVER_WHITE =
  "hover:bg-white hover:text-black hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]";

/* URLs */
const SITE_BASE = "https://peakvelocity.netlify.app";
const HOME_URL = SITE_BASE;
const ABOUT_URL = `${SITE_BASE}/sxetika-me-emas`;
const CONTACT_URL = `${SITE_BASE}/contact`;
const AUTH_URL = "http://localhost:3000/";
const TRAINERS_INTERNAL = "/services";

/* component */
export default function GlassmorphicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const navVariants = {
    hidden: { opacity: 0, y: -50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25,0.46,0.45,0.94] } },
  };
  const mobileMenuVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut", staggerChildren: 0.08 } },
    exit: { opacity: 0, scale: 0.98, y: -16, transition: { duration: 0.2 } },
  };
  const mobileItemVariants = { hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* DESKTOP */}
        <motion.div className="hidden md:block" variants={navVariants} initial="hidden" animate="visible">
          <div
            className="
              relative grid grid-cols-3 items-center
              rounded-3xl border border-white/20
              bg-white/10 px-8 py-6 backdrop-blur-xl
              shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]
            "
          >
            {/* Left: Logo (container no longer changes color) */}
            <div className="flex items-center">
              <a href={HOME_URL} className="flex items-center gap-3">
                <div className="relative h-12 w-12">
                  <img
                    src="https://peakvelocity.gr/wp-content/uploads/2024/11/Logo-chris-1-2-252x300.png"
                    alt="Peak Velocity"
                    className="h-12 w-12 object-contain"
                    loading="eager"
                  />
                </div>
              </a>
            </div>

            {/* Center: nav items — each button turns white on hover */}
            <div className="flex items-center justify-center gap-3">
              <Button asChild variant="ghost" size="lg"
                className={cn("text-white", BTN_HOVER_WHITE)}>
                <Link to={TRAINERS_INTERNAL} className="flex items-center gap-3">
                  <User className="h-5 w-5" />
                  <span>Προπονητές</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" size="lg"
                className={cn("text-white", BTN_HOVER_WHITE)}>
                <a href={ABOUT_URL} className="flex items-center gap-3">
                  <Info className="h-5 w-5" />
                  <span>Σχετικά με εμάς</span>
                </a>
              </Button>

              <Button asChild variant="ghost" size="lg"
                className={cn("text-white", BTN_HOVER_WHITE)}>
                <a href={CONTACT_URL} className="flex items-center gap-3">
                  <Phone className="h-5 w-5" />
                  <span>Επικοινωνία</span>
                </a>
              </Button>
            </div>

            {/* Right: actions — same hover behavior */}
            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="outline" size="lg"
                className={cn("text-white border-white/30", BTN_HOVER_WHITE)}>
                <a href={AUTH_URL} className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Εγγραφή</span>
                </a>
              </Button>

              <Button asChild variant="outline" size="icon"
                className={cn("text-white border-white/30", BTN_HOVER_WHITE)}
                aria-label="Λογαριασμός">
                <a href={AUTH_URL}><User className="h-6 w-6" /></a>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* MOBILE */}
        <div className="md:hidden">
          {/* Header (container stays the same; only buttons hover white) */}
          <motion.div
            className="flex items-center justify-between rounded-3xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-xl shadow-2xl"
            variants={navVariants} initial="hidden" animate="visible"
          >
            <a href={HOME_URL} className="flex items-center gap-2">
              <img
                src="https://peakvelocity.gr/wp-content/uploads/2024/11/Logo-chris-1-2-252x300.png"
                alt="Peak Velocity"
                className="h-10 w-10 object-contain"
                loading="eager"
              />
            </a>

            <Button variant="ghost" size="icon"
              onClick={() => setIsOpen((v) => !v)}
              className={cn("text-white", BTN_HOVER_WHITE)}
              aria-expanded={isOpen} aria-label="Toggle menu">
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </motion.div>
            </Button>
          </motion.div>

          {/* Slide-out */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="mt-4 overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl shadow-2xl"
                variants={mobileMenuVariants} initial="hidden" animate="visible" exit="exit"
              >
                <div className="flex flex-col gap-3">
                  {[
                    { href: TRAINERS_INTERNAL, label: "Προπονητές", type: "internal", Icon: User },
                    { href: ABOUT_URL, label: "Σχετικά", type: "external", Icon: Info },
                    { href: CONTACT_URL, label: "Επικοινωνία", type: "external", Icon: Phone },
                    { href: AUTH_URL, label: "Εγγραφή", type: "external", Icon: UserPlus },
                    { href: AUTH_URL, label: "Λογαριασμός", type: "external", Icon: User },
                  ].map(({ href, label, type, Icon }, i) => (
                    <motion.div key={i} variants={mobileItemVariants}>
                      <Button asChild variant="outline" size="lg"
                        className={cn("w-full justify-start text-white border-white/25", BTN_HOVER_WHITE)}>
                        {type === "internal" ? (
                          <Link to={href} onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                          </Link>
                        ) : (
                          <a href={href} onClick={() => setIsOpen(false)} className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                          </a>
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
