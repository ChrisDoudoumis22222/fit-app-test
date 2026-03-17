"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export default function MobileCreateGoalButton({ onClick }) {
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 left-4 z-[200] sm:hidden">
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-zinc-700 to-zinc-800 text-white font-semibold border border-zinc-600/40 shadow-xl"
      >
        <Plus className="w-5 h-5" />
        Νέος Στόχος
      </motion.button>
    </div>
  );
}