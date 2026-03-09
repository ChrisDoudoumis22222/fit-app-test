// src/components/PoweredByPeakVelocityFooter.jsx
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Github } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

function SocialIconButton({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-full",
        "bg-white/10 text-white/85",
        "transition-all duration-200 hover:bg-white/15 hover:text-white"
      )}
    >
      {children}
    </a>
  );
}

export default function PoweredByPeakVelocityFooter({
  className = "",
  logoSrc = "https://peakvelocity.gr/wp-content/uploads/2024/11/Logo-chris-1-2-252x300.png",
  homeUrl = "http://localhost:3000/",
  bottomThreshold = 16,
  bookingButtonSelector = ".fixed-booking-btn",
}) {
  const [show, setShow] = useState(false);
  const [extraSpace, setExtraSpace] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");

    const calc = () => {
      const doc = document.documentElement;
      const scrollH = doc?.scrollHeight || document.body.offsetHeight;
      const atEnd =
        window.innerHeight + window.scrollY >= scrollH - bottomThreshold;

      if (mq.matches) {
        setShow(atEnd);

        const btn = document.querySelector(bookingButtonSelector);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          setExtraSpace(rect.height + 48);
        } else {
          setExtraSpace(120);
        }
      } else {
        setShow(true);
        setExtraSpace(0);
      }
    };

    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc);

    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [bottomThreshold, bookingButtonSelector]);

  return (
    <>
      {extraSpace > 0 && (
        <div
          className="block lg:hidden"
          style={{ height: extraSpace }}
          aria-hidden
        />
      )}

      <motion.footer
        initial={{ y: 24, opacity: 0 }}
        animate={show ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          "relative z-40 w-full border-t border-white/10 bg-[#05070b]",
          className
        )}
        style={{
          paddingBottom:
            extraSpace > 0
              ? `calc(${extraSpace}px + env(safe-area-inset-bottom))`
              : undefined,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          {/* top row */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <a
              href={homeUrl}
              aria-label="Peak Velocity"
              className="flex items-center gap-3 text-white"
            >
              <img
                src={logoSrc}
                alt="Peak Velocity"
                className="h-11 w-11 object-contain"
              />
            </a>

            <div className="flex items-center gap-3">
              <SocialIconButton
                href="https://x.com"
                label="Twitter / X"
              >
                <Instagram className="h-5 w-5" />
              </SocialIconButton>

              <SocialIconButton
                href="https://github.com"
                label="GitHub"
              >
                <Github className="h-5 w-5" />
              </SocialIconButton>
            </div>
          </div>

          {/* divider */}
          <div className="mt-8 border-t border-white/10" />

          {/* bottom area */}
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1 text-sm text-zinc-500">
              <div>© {new Date().getFullYear()} Peak Velocity</div>
              <div>All rights reserved</div>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <nav>
                <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white">
                  <li>
                    <a href="/products" className="hover:text-zinc-300 transition-colors">
                      Products
                    </a>
                  </li>
                  <li>
                    <a href="/about" className="hover:text-zinc-300 transition-colors">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="/blog" className="hover:text-zinc-300 transition-colors">
                      Blog
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="hover:text-zinc-300 transition-colors">
                      Contact
                    </a>
                  </li>
                </ul>
              </nav>

              <nav>
                <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
                  <li>
                    <a href="/privacy" className="hover:text-zinc-300 transition-colors">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="hover:text-zinc-300 transition-colors">
                      Terms
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </motion.footer>
    </>
  );
}