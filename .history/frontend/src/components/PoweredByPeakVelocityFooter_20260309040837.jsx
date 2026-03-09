// src/components/PoweredByPeakVelocityFooter.jsx
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Music2 } from "lucide-react";

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
  "transition-all duration-200 hover:bg-white/15 hover:text-white",
  "sm:h-11 sm:w-11"
)}
    >
      {children}
    </a>
  );
}

export default function PoweredByPeakVelocityFooter({
  className = "",
  logoSrc = "/images/logochris3.png",
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
 <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
  <a
    href={homeUrl}
    aria-label="Peak Velocity"
    className="flex items-center justify-center md:justify-start"
  >
    <img
      src={logoSrc}
      alt="Peak Velocity"
      className="h-14 w-auto object-contain sm:h-16"
    />
  </a>

  <div className="flex w-full items-center justify-center gap-3 md:w-auto md:justify-end">
    <SocialIconButton
      href="https://www.instagram.com/peakvelocity.gr/"
      label="Instagram"
    >
      <Instagram className="h-5 w-5" />
    </SocialIconButton>

    <SocialIconButton
      href="https://www.facebook.com/"
      label="Facebook"
    >
      <Facebook className="h-5 w-5" />
    </SocialIconButton>

    <SocialIconButton
      href="https://www.tiktok.com/"
      label="TikTok"
    >
      <Music2 className="h-5 w-5" />
    </SocialIconButton>
  </div>
</div>

          <div className="mt-8 border-t border-white/10" />

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1 text-sm text-zinc-500">
              <div>© {new Date().getFullYear()} Peak Velocity</div>
              <div>Με επιφύλαξη παντός δικαιώματος</div>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <nav>
                <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white">
                  <li>
                    <a href="/" className="transition-colors hover:text-zinc-300">
                      Αρχική
                    </a>
                  </li>
                  <li>
                    <a href="/trainers" className="transition-colors hover:text-zinc-300">
                      Προπονητές
                    </a>
                  </li>
                  <li>
                    <a href="/about" className="transition-colors hover:text-zinc-300">
                      Σχετικά
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="transition-colors hover:text-zinc-300">
                      Επικοινωνία
                    </a>
                  </li>
                </ul>
              </nav>

              <nav>
                <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
                  <li>
                    <a href="/privacy" className="transition-colors hover:text-zinc-300">
                      Πολιτική Απορρήτου
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="transition-colors hover:text-zinc-300">
                      Όροι Χρήσης
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