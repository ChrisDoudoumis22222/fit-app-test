"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
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
  ChevronRight,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* ---------- Toast ---------- */
export function GoalsToast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div className="fixed top-4 right-4 z-[1000] max-w-[92vw] sm:max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -10, x: 24 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -8, x: 24 }}
          transition={{ duration: 0.22 }}
          className={cn(
            "relative overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl",
            "px-4 py-3 text-sm",
            isError
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                isError
                  ? "bg-red-500/10 border-red-500/25"
                  : "bg-emerald-500/10 border-emerald-500/25"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words leading-relaxed">
                {toast.title}
              </p>
            </div>

            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-1 opacity-70 transition hover:opacity-100 hover:bg-white/5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 h-[2px]",
              isError ? "bg-red-400/40" : "bg-emerald-400/40"
            )}
          />
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
      <div className="flex items-center justify-center w-8 h-8 rounded-xl overflow-hidden bg-white/5">
        <img
          src={icon}
          alt="icon"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const looksLikeEmoji = icon && !/^https?:\/\//i.test(icon) && icon.length <= 6;
  if (looksLikeEmoji) {
    return (
      <span className={`text-2xl leading-none ${className || ""}`}>{icon}</span>
    );
  }

  const FallbackIcon = defaults[category || ""] || Target;
  return <FallbackIcon className={className || "w-8 h-8"} />;
}

/* ---------- Skeletons ---------- */
function SkeletonPulse({ className = "" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-zinc-800/90 via-zinc-700/60 to-zinc-800/90",
        className
      )}
    />
  );
}

export function GoalCardSkeleton({ compact = false }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-zinc-800/70 bg-black/35 backdrop-blur-xl",
        "shadow-[0_20px_50px_rgba(0,0,0,0.35)]",
        compact ? "p-4" : "p-5 sm:p-6"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/10 via-transparent to-transparent" />

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <SkeletonPulse className="h-14 w-14 rounded-2xl" />
          <div className="flex gap-2">
            <SkeletonPulse className="h-10 w-10 rounded-xl" />
            <SkeletonPulse className="h-10 w-10 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2.5">
          <SkeletonPulse className="h-6 w-3/5" />
          <SkeletonPulse className="h-4 w-full" />
          <SkeletonPulse className="h-4 w-11/12" />
          <SkeletonPulse className="h-4 w-8/12" />
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <SkeletonPulse className="h-4 w-20" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
          <SkeletonPulse className="h-3 w-full rounded-full" />
          <div className="flex items-center justify-between">
            <SkeletonPulse className="h-6 w-24 rounded-full" />
            <SkeletonPulse className="h-4 w-20" />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <SkeletonPulse className="h-4 w-4 rounded-md" />
          <SkeletonPulse className="h-4 w-40" />
        </div>

        <SkeletonPulse className="h-11 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function GoalsCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <GoalCardSkeleton key={i} compact={i > 2} />
      ))}
    </div>
  );
}

/* ---------- Status helpers ---------- */
function GoalStatusPill({ status, getStatusColor, getStatusLabel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs font-semibold",
        getStatusColor(status)
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {getStatusLabel(status)}
    </span>
  );
}

/* ---------- Card ---------- */
const GoalCard = memo(function GoalCard({
  goal,
  index,
  setEditingGoal,
  setShowCreateForm,
  onDelete,
  onComplete,
  getProgressStatus,
  getStatusColor,
  getStatusLabel,
}) {
  const progressRaw =
    goal.target_value && goal.target_value > 0
      ? (goal.progress_value / goal.target_value) * 100
      : 0;

  const progress = Math.max(0, Math.min(progressRaw, 100));

  const derivedStatus =
    goal.status === "completed"
      ? "completed"
      : getProgressStatus(goal.progress_value, goal.target_value);

  const isCompleted = goal.status === "completed";

  const dueDateText = useMemo(() => {
    if (!goal.due_date) return null;
    return new Date(goal.due_date).toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [goal.due_date]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 26, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.32 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-[1.6rem] sm:rounded-[1.8rem]",
        "border bg-black/40 backdrop-blur-xl",
        "shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-300",
        "p-4 sm:p-5 lg:p-6",
        isCompleted
          ? "border-emerald-500/25"
          : "border-zinc-800/80 hover:border-zinc-700/80"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/[0.02] to-transparent" />
      {isCompleted && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-emerald-400/[0.04]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />
        </>
      )}

      <div className="relative flex h-full flex-col">
        {/* top */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border",
                "shadow-inner",
                isCompleted
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-zinc-700/50 bg-zinc-900/70"
              )}
            >
              <GoalIconRenderer
                category={goal.category}
                icon={goal.icon}
                className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7",
                  isCompleted ? "text-emerald-300" : "text-zinc-200"
                )}
              />
            </div>

            <div className="min-w-0">
              <GoalStatusPill
                status={derivedStatus}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => {
                setEditingGoal(goal);
                setShowCreateForm(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800/90 hover:text-white"
              aria-label="Edit goal"
            >
              <Edit3 className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => onDelete(goal.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 transition hover:border-red-500/50 hover:bg-red-500/15 hover:text-red-200"
              aria-label="Delete goal"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* title + desc */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={cn(
                "min-w-0 pr-1 text-base sm:text-lg lg:text-xl font-bold leading-tight break-words",
                isCompleted ? "text-emerald-300" : "text-white"
              )}
            >
              {goal.title}
            </h3>

            {isCompleted && (
              <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20">
                <Trophy className="h-5 w-5 text-white" />
              </div>
            )}
          </div>

          {goal.description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400 break-words line-clamp-3 sm:line-clamp-4 lg:line-clamp-3">
              {goal.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-zinc-500">
              Δεν υπάρχει περιγραφή για αυτόν τον στόχο.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {goal.category === "custom" && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                <Tag className="h-3.5 w-3.5" />
                {goal.custom_category || "Προσαρμοσμένη"}
              </div>
            )}

            {goal.unit && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                Μονάδα: {goal.unit}
              </div>
            )}
          </div>
        </div>

        {/* progress */}
        <div className="mb-4 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-3.5 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Πρόοδος
            </span>

            <div
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-bold",
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-white/5 text-white"
              )}
            >
              {goal.progress_value ?? 0} / {goal.target_value ?? 0}
            </div>
          </div>

          <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)]" />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.9, delay: index * 0.04 }}
              className={cn(
                "relative h-full rounded-full",
                isCompleted
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : "bg-gradient-to-r from-zinc-400 to-zinc-200"
              )}
            >
              <div className="absolute inset-0 opacity-40 blur-[6px]" />
            </motion.div>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="text-[11px] sm:text-xs text-zinc-500">
              {Math.round(progress)}% ολοκληρωμένο
            </span>

            {goal.target_value > 0 && (
              <span className="text-[11px] sm:text-xs text-zinc-500">
                Υπόλοιπο: {Math.max((goal.target_value ?? 0) - (goal.progress_value ?? 0), 0)}
              </span>
            )}
          </div>
        </div>

        {/* due date */}
        {goal.due_date && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-950/35 px-3 py-2.5 text-xs sm:text-sm text-zinc-300">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5">
              <CalendarIcon className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Προθεσμία
              </p>
              <p className="truncate">{dueDateText}</p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-1">
          {!isCompleted ? (
            <motion.button
              whileTap={{ scale: 0.985 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => onComplete(goal.id)}
              className={cn(
                "w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                "flex items-center justify-center gap-2",
                "border-zinc-700/70 bg-zinc-900/80 text-zinc-100",
                "hover:border-zinc-600 hover:bg-zinc-800"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Μαρκάρισε ως ολοκληρωμένο
            </motion.button>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
              <CheckCircle className="w-4 h-4" />
              Ο στόχος ολοκληρώθηκε
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
});

/* ---------- Lazy card wrapper ---------- */
function LazyGoalCard(props) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || hasEntered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasEntered(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "220px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasEntered]);

  return (
    <div ref={ref} className="min-h-[320px] sm:min-h-[360px]">
      {isVisible ? <GoalCard {...props} /> : <GoalCardSkeleton />}
    </div>
  );
}

/* ---------- Grid ---------- */
export default function GoalsCardsSection({
  goals = [],
  loading = false,
  skeletonCount = 6,
  setEditingGoal,
  setShowCreateForm,
  onDelete,
  onComplete,
  getProgressStatus,
  getStatusColor,
  getStatusLabel,
}) {
  if (loading) {
    return <GoalsCardsSkeleton count={skeletonCount} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {goals.map((goal, index) => (
          <LazyGoalCard
            key={goal.id ?? index}
            goal={goal}
            index={index}
            setEditingGoal={setEditingGoal}
            setShowCreateForm={setShowCreateForm}
            onDelete={onDelete}
            onComplete={onComplete}
            getProgressStatus={getProgressStatus}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}