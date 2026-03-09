// src/components/PoweredByPeakVelocityFooter.jsx
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Linkedin,
  Mail,
  ExternalLink,
} from "lucide-react";

/* ----------------------------- helpers ----------------------------- */
const cn = (...classes) => classes.filter(Boolean).join(" ");

/* ----------------------------- button ------------------------------ */
function FooterButton({
  asChild = false,
  className = "",
  children,
  ...props
}) {
  const Comp = asChild ? "span" : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors",
        "outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60",
        "disabled:pointer-events-none disabled:opacity-50",
        "h-10 w-10 border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
        className
      )}
      {...(!asChild ? props : {})}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------ footer ----------------------------- */
function SiteFooter({
  logo,
  brandName,
  socialLinks = [],
  mainLinks = [],
  legalLinks = [],
  copyright,
  homeUrl = "/",
}) {
  return (
    <footer className="w-full pb-6 pt-12 lg:pb-8 lg:pt-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <a
            href={homeUrl}
            className="flex items-center gap-x-3 text-white hover:opacity-90 transition-opacity"
            aria-label={brandName}
          >
            {logo}
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold tracking-tight">
                {brandName}
              </span>
              <span className="text-xs text-zinc-400">
                Με την υποστήριξη της Peak Velocity
              </span>
            </div>
          </a>

          {socialLinks.length > 0 && (
            <ul className="flex list-none flex-wrap gap-3">
              {socialLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.label}
                  >
                    <FooterButton>{link.icon}</FooterButton>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-6 lg:grid lg:grid-cols-10 lg:gap-6">
          <div className="text-sm leading-6 text-zinc-400 lg:col-[1/4] lg:row-[1/3]">
            <div>{copyright?.text}</div>
            {copyright?.license && <div>{copyright.license}</div>}
          </div>

          {mainLinks.length > 0 && (
            <nav className="mt-6 lg:mt-0 lg:col-[4/11]">
              <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 lg:justify-end">
                {mainLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-200 underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {legalLinks.length > 0 && (
            <div className="mt-4 lg:mt-0 lg:col-[4/11]">
              <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 lg:justify-end">
                {legalLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link.href}
                      className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

/* ---------------------- main exported component -------------------- */
export default function PoweredByPeakVelocityFooter({
  className = "",
  logoSrc = "https://peakvelocity.gr/wp-content/uploads/2024/11/Logo-chris-1-2-252x300.png",
  homeUrl = "http://localhost:3000/",
  bottomThreshold = 16,
  bookingButtonSelector = ".fixed-booking-btn",
  brandName = "Peak Velocity",
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
          "relative z-40 w-full border-t border-zinc-800 bg-black/70 backdrop-blur-md",
          className
        )}
        style={{
          paddingBottom:
            extraSpace > 0
              ? `calc(${extraSpace}px + env(safe-area-inset-bottom))`
              : undefined,
        }}
      >
        <SiteFooter
          homeUrl={homeUrl}
          brandName={brandName}
          logo={
            <img
              src={logoSrc}
              alt={brandName}
              className="h-11 w-11 object-contain rounded-md"
            />
          }
          socialLinks={[
            {
              icon: <Instagram className="h-4 w-4" />,
              href: "https://www.instagram.com/peakvelocity.gr/",
              label: "Instagram",
            },
            {
              icon: <Facebook className="h-4 w-4" />,
              href: "https://www.facebook.com/",
              label: "Facebook",
            },
            {
              icon: <Linkedin className="h-4 w-4" />,
              href: "https://www.linkedin.com/",
              label: "LinkedIn",
            },
          ]}
          mainLinks={[
            { href: homeUrl, label: "Αρχική" },
            { href: "/trainers", label: "Προπονητές" },
            { href: "/about", label: "Σχετικά" },
            { href: "/contact", label: "Επικοινωνία" },
          ]}
          legalLinks={[
            { href: "/privacy", label: "Πολιτική Απορρήτου" },
            { href: "/terms", label: "Όροι Χρήσης" },
            { href: "mailto:info@peakvelocity.gr", label: "Email" },
          ]}
          copyright={{
            text: `© ${new Date().getFullYear()} Peak Velocity`,
            license: "All rights reserved",
          }}
        />
      </motion.footer>
    </>
  );
}