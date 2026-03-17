"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Trophy,
  Flame,
  Star,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  Activity,
  CheckCircle,
  Users,
  Heart,
  BookOpen,
  Briefcase,
  AlertCircle,
  Tag,
  X,
} from "lucide-react";

/* ---------- Toast ---------- */
export function GoalsToast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div className="fixed top-4 right-4 z-[1000] max-w-[90vw] sm:max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg text-sm ${
            isError
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold break-words">{toast.title}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 opacity-70 hover:opacity-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Icon helper ---------- */
export function GoalIconRenderer({ category, icon, className }) {
  const defaults = {
    fitness: Activity,
    consistency: Flame,
    skills: Star,
    strength: Trophy,
    health: Heart,
    learning: BookOpen,
    career: Briefcase,
    social: Users,
  };

  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-md overflow-hidden bg-white/5">
        <img src={icon} alt="icon" className="w-full h-full object-cover" />
      </div>
    );
  }

  const looksLikeEmoji = icon && !/^https?:\/\//i.test(icon) && icon.length <= 6;
  if (looksLikeEmoji) {
    return <span className={`text-2xl leading-none ${className || ""}`}>{icon}</span>;
  }

  const FallbackIcon = defaults[category || ""] || Target;
  return <FallbackIcon className={className || "w-8 h-8"} />;
}

/* ---------- Grid ---------- */
export default function GoalsCardsSection({
  goals = [],
  setEditingGoal,
  setShowCreateForm,
  onDelete,
  onComplete,
  getProgressStatus,
  getStatusColor,
  getStatusLabel,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
      <AnimatePresence>
        {goals.map((goal, index) => {
          const progress =
            goal.target_value && goal.target_value > 0
              ? (goal.progress_value / goal.target_value) * 100
              : 0;

          const derivedStatus =
            goal.status === "completed"
              ? "completed"
              : getProgressStatus(goal.progress_value, goal.target_value);

          const isCompleted = goal.status === "completed";

          return (
            <motion.div
              key={goal.id ?? index}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ delay: index * 0.05, duration: 0.45 }}
              whileHover={{ y: -2, scale: 1.005 }}
              className={`relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border p-6 sm:p-8 ${
                isCompleted
                  ? "border-emerald-500/20"
                  : "border-zinc-700/50 hover:border-zinc-600/50"
              } shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/10 via-transparent to-transparent" />
              {isCompleted && <div className="absolute inset-0 bg-emerald-400/5" />}

              <div className="relative">
                <div className="flex items-start justify-between mb-4 sm:mb-6">
                  <div
                    className={`p-3 sm:p-4 rounded-2xl border ${
                      isCompleted
                        ? "bg-black/30 border-emerald-500/20"
                        : "bg-black/30 border-zinc-700/40"
                    } flex items-center justify-center`}
                  >
                    <GoalIconRenderer
                      category={goal.category}
                      icon={goal.icon}
                      className={`${
                        isCompleted ? "text-emerald-300" : "text-zinc-300"
                      } w-6 h-6 sm:w-8 sm:h-8`}
                    />
                  </div>

                  <div className="flex gap-1.5 sm:gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setEditingGoal(goal);
                        setShowCreateForm(true);
                      }}
                      className="p-1.5 sm:p-2 rounded-xl bg-black/30 hover:bg-black/40 border border-zinc-700/50 hover:border-zinc-600/50 transition-all"
                    >
                      <Edit3 className="w-4 h-4 text-zinc-400" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete(goal.id)}
                      className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </motion.button>
                  </div>
                </div>

                <div className="mb-4 sm:mb-6">
                  <h3
                    className={`text-lg sm:text-xl font-bold mb-2 ${
                      isCompleted ? "text-emerald-300" : "text-white"
                    } break-words`}
                  >
                    {goal.title}
                  </h3>

                  <p className="text-zinc-400 text-sm leading-relaxed break-words sm:line-clamp-none line-clamp-4">
                    {goal.description}
                  </p>

                  {goal.category === "custom" && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-700/40 rounded-full px-2 py-0.5">
                      <Tag className="w-3 h-3" />
                      {goal.custom_category || "Προσαρμοσμένη"}
                    </div>
                  )}
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <span className="text-xs sm:text-sm font-semibold text-zinc-300">
                      Πρόοδος
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isCompleted ? "text-emerald-300" : "text-white"
                      }`}
                    >
                      {goal.progress_value ?? 0} / {goal.target_value ?? 0}
                    </span>
                  </div>

                  <div className="relative w-full bg-zinc-800 rounded-full h-2.5 sm:h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      transition={{ duration: 1, delay: index * 0.05 }}
                      className={`h-full rounded-full ${
                        isCompleted ? "bg-emerald-500/80" : "bg-zinc-500/70"
                      }`}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span
                      className={`text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border font-semibold ${getStatusColor(
                        derivedStatus
                      )}`}
                    >
                      {getStatusLabel(derivedStatus)}
                    </span>

                    <span className="text-[10px] sm:text-xs text-zinc-500">
                      {Math.round(progress)}% ολοκληρωμένο
                    </span>
                  </div>
                </div>

                {goal.due_date && (
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-400">
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      Προθεσμία:{" "}
                      {new Date(goal.due_date).toLocaleDateString("el-GR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {!isCompleted && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onComplete(goal.id)}
                    className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-black/30 hover:bg-black/40 border border-zinc-700/50 text-zinc-200 text-xs sm:text-sm font-semibold"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Μαρκάρισε ως ολοκληρωμένο
                  </motion.button>
                )}

                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                    className="hidden sm:flex absolute -top-3 -right-3 w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 rounded-full items-center justify-center shadow-lg"
                  >
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}