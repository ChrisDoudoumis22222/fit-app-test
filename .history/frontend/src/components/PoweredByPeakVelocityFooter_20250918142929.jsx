// src/components/PoweredByPeakVelocityFooter.jsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function PoweredByPeakVelocityFooter({
  className = "",
  logoSrc = "https://peakvelocity.gr/wp-content/uploads/2024/11/Logo-chris-1-2-252x300.png",
  homeUrl = "http://localhost:3000/",
  bottomThreshold = 16,
  bookingButtonSelector = ".fixed-booking-btn", // 👈 className του κουμπιού κράτησης
}) {
  const [show, setShow] = useState(false);
  const [extraSpace, setExtraSpace] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");

    const calc = () => {
      const doc = document.documentElement;
      const scrollH = doc?.scrollHeight || document.body.offsetHeight;
      const atEnd = window.innerHeight + window.scrollY >= (scrollH - bottomThreshold);

      if (mq.matches) {
        setShow(atEnd);

        // ✅ Μετράει το ύψος του κουμπιού κράτησης ΜΟΝΟ σε mobile
        const btn = document.querySelector(bookingButtonSelector);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          setExtraSpace(rect.height + 48); // ύψος κουμπιού + λίγο παραπάνω
        } else {
          setExtraSpace(120); // fallback
        }
      } else {
        setShow(true);
        setExtraSpace(0); // σε desktop δεν χρειάζεται extra χώρο
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
      {/* Spacer μόνο σε mobile */}
      {extraSpace > 0 && <div className="block lg:hidden" style={{ height: extraSpace }} aria-hidden />}

      <motion.footer
        initial={{ y: 24, opacity: 0 }}
        animate={show ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={[
          "w-full border-t border-zinc-800 bg-black/60 backdrop-blur-md",
          "py-6 lg:py-4",
          "z-40 relative", // 👈 χαμηλότερο z-index από το arrow
          className,
        ].join(" ")}
        style={{
          paddingBottom: extraSpace > 0 ? `calc(${extraSpace}px + env(safe-area-inset-bottom))` : undefined,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-3 text-sm text-zinc-400">
          <a
            href={homeUrl}
            className="flex items-center gap-2 hover:text-zinc-200 transition-colors"
          >
            <img
              src={logoSrc}
              alt="Peak Velocity"
              className="h-6 w-6 object-contain"
            />
            <span>
              Με την υποστήριξη της{" "}
              <span className="font-medium text-zinc-200">Peak Velocity</span>
            </span>
          </a>
        </div>
      </motion.footer>
    </>
  );
}
