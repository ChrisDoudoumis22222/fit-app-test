import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Settings, ImagePlus, Shield } from "lucide-react";

export const SECTIONS = ["dashboard", "profile", "avatar", "security"];

export const fromHash = (h = "") =>
  SECTIONS.includes(h.replace("#", "")) ? h.replace("#", "") : "dashboard";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function PremiumNavigation({ currentSection, onSectionChange }) {
  const tabs = useMemo(
    () => [
      { key: "dashboard", label: "Πίνακας", icon: LayoutDashboard },
      { key: "profile", label: "Προφίλ", icon: Settings },
      { key: "avatar", label: "Φωτογραφία Προφίλ", icon: ImagePlus },
      { key: "security", label: "Ασφάλεια", icon: Shield },
    ],
    []
  );

  return (
    <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:gap-3 mb-5 sm:mb-6">
      {tabs.map(({ key, label, icon: Icon }, index) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => onSectionChange(key)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.25 }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          aria-label={label}
          title={label}
          className={cn(
            "group relative inline-flex items-center justify-center rounded-2xl border transition-all duration-200",
            "h-12 w-full sm:h-auto sm:w-auto sm:px-4 sm:py-3",
            "sm:justify-start sm:gap-2",
            currentSection === key
              ? "bg-white text-black border-white shadow-[0_8px_24px_rgba(255,255,255,0.14)]"
              : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline text-sm font-semibold">{label}</span>
          <span className="sr-only sm:hidden">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}