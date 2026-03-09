import { motion } from "framer-motion";

export default function QuickActionButton({
  icon: Icon,
  label,
  primary = false,
  onClick,
  fluid = false,
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={[
        "group relative rounded-2xl transition-all duration-300",
        fluid ? "w-full h-12" : "h-12 w-12",
        "sm:w-auto sm:h-auto sm:px-5 sm:py-3",
        primary
          ? "bg-gradient-to-r from-zinc-600 to-zinc-700 text-white shadow-lg"
          : "bg-zinc-900/60 text-zinc-200 border border-zinc-700/60 hover:bg-zinc-800/60",
        "focus:outline-none focus:ring-2 focus:ring-white/15",
      ].join(" ")}
      aria-label={label}
    >
      <div className="flex items-center justify-center gap-2 sm:justify-start">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </motion.button>
  );
}