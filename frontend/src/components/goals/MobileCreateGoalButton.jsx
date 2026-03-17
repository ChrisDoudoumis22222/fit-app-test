"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function MobileCreateGoalButton({ onClick }) {
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-4 z-[200] sm:hidden">
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.04 }}
        aria-label="Νέος Στόχος"
        className="
          flex h-14 w-14 items-center justify-center
          rounded-full
          bg-gradient-to-br from-zinc-700 to-zinc-900
          text-white
          border border-zinc-600/40
          shadow-[0_10px_30px_rgba(0,0,0,0.35)]
          backdrop-blur-md
        "
      >
        <Plus className="h-6 w-6" />
      </motion.button>
    </div>
  );
}