"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

/* ------------------ URLS ------------------ */
/* keep old rules:
   - trainers stays internal: /services
   - login/signup stays: http://localhost:3000/
   - everything else goes to the netlify base + same endpoint
*/
const SITE_BASE = "https://peakvelocity.netlify.app";
const HOME_URL = SITE_BASE;
const OUR_COMPANY_URL = `${SITE_BASE}/ourcompany`;
const ABOUT_URL = `${SITE_BASE}/sxetika-me-emas`;
const CONTACT_URL = `${SITE_BASE}/contact`;

const TRAINERS_URL = "/services"; // keep same as previous code
const AUTH_URL = "http://localhost:3000/"; // keep same as previous code

const LOGO_URL = "/images/logochris3.png";

/* ------------------ COMPONENT ------------------ */
export default function GlassmorphicNavbar() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* hide on scroll down / show on scroll up */
  const [showNav, setShowNav] = useState(true);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    lastYRef.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;

      if (isOpen) {
        lastYRef.current = y;
        setShowNav(true);
        return;
      }

      if (!tickingRef.current) {
        window.requestAnimationFrame(() => {
          const lastY = lastYRef.current;
          const delta = y - lastY;

          const nearTop = y < 24;
          const goingDown = delta > 0;

          if (nearTop) setShowNav(true);
          else if (goingDown && y > 90) setShowNav(false);
          else if (!goingDown) setShowNav(true);

          lastYRef.current = y;
          tickingRef.current = false;
        });

        tickingRef.current = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted, isOpen]);

  /* lock body scroll when mobile drawer is open */
  useEffect(() => {
    if (!mounted) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "hidden" : prevOverflow || "";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, mounted]);

  const openMenu = () => {
    setShowNav(true);
    setIsOpen(true);
  };

  const closeMenu = () => setIsOpen(false);

  const go = (href, isInternal = false) => {
    closeMenu();

    if (isInternal) {
      navigate(href);
      return;
    }

    window.location.href = href;
  };

  if (!mounted) return null;

  const mainNav = [
    { label: "Αρχική", href: HOME_URL, isInternal: false },
    { label: "Η Εταιρεία μας", href: OUR_COMPANY_URL, isInternal: false },
    { label: "Προπονητές", href: TRAINERS_URL, isInternal: true }, // unchanged
    { label: "Σχετικά με εμάς", href: ABOUT_URL, isInternal: false },
    { label: "Επικοινωνία", href: CONTACT_URL, isInternal: false },
  ];

  const secondaryNav = [
    { label: "Σύνδεση", href: AUTH_URL, isInternal: false }, // unchanged
  ];

  const navVariants = {
    hidden: { opacity: 0, y: -16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.22, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.16, ease: "easeIn" },
    },
  };

  const drawerVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 26,
        mass: 0.75,
      },
    },
    exit: {
      x: "100%",
      transition: { duration: 0.18, ease: "easeInOut" },
    },
  };

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: "easeOut" },
    },
  };

  const ctaPrimary =
    "h-10 sm:h-11 px-3 sm:px-4 text-[13px] sm:text-sm font-semibold rounded-none whitespace-nowrap " +
    "border border-white bg-white text-black hover:bg-white/90 transition";

  const ctaSecondary =
    "h-10 sm:h-11 px-3 sm:px-4 text-[13px] sm:text-sm font-semibold rounded-none whitespace-nowrap " +
    "border border-white text-white bg-transparent hover:bg-white hover:text-black transition";

  const ctaPrimaryMobile =
    "h-9 min-[360px]:h-10 px-2 min-[360px]:px-3 text-[12px] min-[360px]:text-[13px] " +
    "font-semibold rounded-none whitespace-nowrap border border-white bg-white text-black hover:bg-white/90 transition";

  const desktopMenuBtn =
    "relative px-2 py-1 -mx-1 text-white/90 text-[13px] lg:text-[14px] font-medium tracking-wide " +
    "rounded-sm transition " +
    "hover:text-white hover:bg-white/10 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 " +
    "after:content-[''] after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[1px] after:bg-white/70 " +
    "after:scale-x-0 after:origin-left after:transition-transform after:duration-200 " +
    "hover:after:scale-x-100";

  const mobileMenuBtn =
    "w-full text-left rounded-md px-2 py-2 -mx-2 transition " +
    "hover:bg-white/10 hover:translate-x-[2px] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

  const mobileSecondaryBtn =
    "w-full text-left rounded-md px-2 py-2 -mx-2 transition " +
    "hover:bg-white/10 hover:text-white " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={false}
      animate={showNav ? { y: 0, opacity: 1 } : { y: -120, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* Top bar */}
      <motion.div
        variants={navVariants}
        initial="hidden"
        animate="visible"
        className="w-full bg-black border-b border-white/10"
      >
        <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-4 md:pl-4 md:pr-14 lg:pl-6 lg:pr-20">
          <div className="h-[60px] sm:h-[64px] md:h-[70px] flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo */}
            <button
              type="button"
              onClick={() => go(HOME_URL, false)}
              className="flex items-center min-w-0 flex-1 md:flex-none text-left"
              aria-label="Peak Velocity Home"
            >
              <div
                className="
                  relative
                  w-[180px] min-[360px]:w-[210px] min-[380px]:w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px]
                  h-[28px] min-[380px]:h-[30px] sm:h-[34px] md:h-[38px] lg:h-[42px]
                  md:shrink-0
                "
              >
                <img
                  src={LOGO_URL}
                  alt="Peak Velocity"
                  className="w-full h-full object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)]"
                  loading="eager"
                />
              </div>
            </button>

            {/* Desktop links */}
            <div className="hidden md:flex items-center justify-center gap-6 lg:gap-7">
              {mainNav.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => go(item.href, item.isInternal)}
                  className={desktopMenuBtn}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <button
                type="button"
                className={ctaPrimary}
                onClick={() => go(AUTH_URL, false)}
              >
                Εγγραφή
              </button>

              <button
                type="button"
                className={ctaSecondary}
                onClick={() => go(AUTH_URL, false)}
              >
                Σύνδεση
              </button>
            </div>

            {/* Mobile controls */}
            <div className="md:hidden flex items-center gap-2 flex-none shrink-0">
              {!isOpen && (
                <div className="hidden min-[360px]:block">
                  <button
                    type="button"
                    className={ctaPrimaryMobile}
                    onClick={() => go(AUTH_URL, false)}
                  >
                    Εγγραφή
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={openMenu}
                aria-label="Open menu"
                className="
                  h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 sm:h-11 sm:w-11
                  grid place-items-center
                  text-white
                  border border-white/20 hover:border-white/40
                  transition
                  flex-none shrink-0
                "
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile drawer menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close menu backdrop"
              className="fixed inset-0 z-[60] bg-black/70"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={closeMenu}
            />

            {/* Drawer */}
            <motion.aside
              role="dialog"
              aria-modal="true"
              className="
                fixed top-0 right-0 z-[70]
                h-[100dvh]
                w-[88vw] max-w-[420px]
                bg-black
                border-l border-white/10
                shadow-2xl
              "
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="
                  h-full
                  px-3 sm:px-5
                  pt-[calc(env(safe-area-inset-top)+14px)]
                  pb-[calc(env(safe-area-inset-bottom)+16px)]
                  flex flex-col
                "
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => go(HOME_URL, false)}
                    className="flex items-center min-w-0 -ml-4 min-[380px]:-ml-5 text-left"
                    aria-label="Peak Velocity Home"
                  >
                    <div className="relative w-[240px] min-[360px]:w-[270px] h-[34px] shrink-0">
                      <img
                        src={LOGO_URL}
                        alt="Peak Velocity"
                        className="w-full h-full object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.12)]"
                        loading="eager"
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={closeMenu}
                    aria-label="Close menu"
                    className="
                      h-10 w-10
                      grid place-items-center
                      text-white
                      border border-white/20 hover:border-white/40
                      transition
                      flex-none shrink-0
                    "
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Links */}
                <motion.div
                  className="mt-6 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex flex-col gap-2">
                    {mainNav.map((item) => (
                      <motion.button
                        key={item.label}
                        type="button"
                        variants={itemVariants}
                        onClick={() => go(item.href, item.isInternal)}
                        className={`${mobileMenuBtn} text-white text-[22px] min-[380px]:text-[24px] leading-snug font-semibold tracking-tight`}
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </div>

                  <motion.div
                    variants={itemVariants}
                    className="my-7 h-px w-full bg-white/10"
                  />

                  <div className="flex flex-col gap-2">
                    {secondaryNav.map((item) => (
                      <motion.button
                        key={item.label}
                        type="button"
                        variants={itemVariants}
                        onClick={() => go(item.href, item.isInternal)}
                        className={`${mobileSecondaryBtn} text-white/85 text-[15px] font-medium`}
                      >
                        {item.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Bottom CTA */}
                <div className="mt-auto pt-6">
                  <button
                    type="button"
                    onClick={() => go(AUTH_URL, false)}
                    className="
                      w-full h-12
                      border border-white text-white font-semibold
                      rounded-none
                      hover:bg-white hover:text-black transition
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
                    "
                  >
                    Γίνε μέλος σήμερα
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}