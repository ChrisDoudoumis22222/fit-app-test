"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";
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
  Tag,
  MoreVertical,
} from "lucide-react";

import GoalDeleteConfirmModal from "./GoalDeleteConfirmModal.jsx";
export { default as GoalsToast } from "./GoalsToast.jsx";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/*                                ICON HELPER                                 */
/* -------------------------------------------------------------------------- */
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
    custom: Tag,
  };

  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      <img
        src={icon}
        alt="εικονίδιο"
        loading="lazy"
        decoding="async"
        className={cn("h-6 w-6 object-cover", className)}
      />
    );
  }

  const looksLikeEmoji =
    icon && !/^https?:\/\//i.test(icon) && icon.length <= 6;

  if (looksLikeEmoji) {
    return (
      <span className={cn("text-xl leading-none", className || "")}>
        {icon}
      </span>
    );
  }

  const FallbackIcon = defaults[category || ""] || Target;
  return <FallbackIcon className={className || "h-5 w-5"} />;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */
const clamp = (value, min = 0, max = 100) =>
  Math.min(Math.max(value, min), max);

function describeTopArcLeftToRight(cx, cy, r) {
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  return `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
}

function sanitizeId(value) {
  return String(value ?? "goal")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

function toGreekStatusLabel(value) {
  const raw = String(value ?? "").trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, "_");

  const map = {
    completed: "Ολοκληρώθηκε",
    complete: "Ολοκληρώθηκε",
    done: "Ολοκληρώθηκε",
    in_progress: "Σε εξέλιξη",
    progress: "Σε εξέλιξη",
    active: "Σε εξέλιξη",
    ongoing: "Σε εξέλιξη",
    not_started: "Δεν ξεκίνησε",
    notstarted: "Δεν ξεκίνησε",
    pending: "Δεν ξεκίνησε",
    overdue: "Εκπρόθεσμο",
    late: "Εκπρόθεσμο",
    paused: "Σε παύση",
    on_hold: "Σε παύση",
  };

  return map[normalized] || raw || "Στόχος";
}

function toGreekCategoryLabel(category, customCategory) {
  const normalized = String(category ?? "").trim().toLowerCase();

  const map = {
    fitness: "Fitness",
    consistency: "Συνέπεια",
    skills: "Δεξιότητες",
    strength: "Δύναμη",
    health: "Υγεία",
    learning: "Μάθηση",
    career: "Καριέρα",
    social: "Κοινωνικά",
    custom: customCategory?.trim() || "Προσαρμοσμένη",
  };

  return map[normalized] || customCategory?.trim() || category || "Στόχος";
}

function getGaugeTheme(progress, isCompleted) {
  if (isCompleted || progress >= 100) {
    return {
      accentStart: "#bbf7d0",
      accentEnd: "#22c55e",
      pill: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
      number: "text-emerald-200",
      actionButton:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (progress >= 40) {
    return {
      accentStart: "#fde68a",
      accentEnd: "#f59e0b",
      pill: "border-amber-500/25 bg-amber-500/10 text-amber-300",
      number: "text-amber-100",
      actionButton:
        "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
    };
  }

  return {
    accentStart: "#d4d4d8",
    accentEnd: "#71717a",
    pill: "border-zinc-600 bg-zinc-800/80 text-zinc-300",
    number: "text-zinc-100",
    actionButton:
      "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  };
}

/* -------------------------------------------------------------------------- */
/*                               ANIMATED NUMBER                              */
/* -------------------------------------------------------------------------- */
function AnimatedNumber({
  value,
  duration = 1.15,
  delay = 0,
  className = "",
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(Math.round(value || 0));

  useEffect(() => {
    const unsubscribe = rounded.on("change", (latest) => {
      setDisplay(Number(latest));
    });

    const controls = animate(motionValue, Number(value || 0), {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [motionValue, rounded, value, duration, delay]);

  return <span className={className}>{display}</span>;
}

/* -------------------------------------------------------------------------- */
/*                                SEMI GAUGE                                  */
/* -------------------------------------------------------------------------- */
function SemiGauge({
  progress = 0,
  current = 0,
  target = 0,
  gaugeId = "goal-gauge",
  delay = 0,
  theme,
  subLabel = "",
}) {
  const safeProgress = clamp(progress, 0, 100);
  const trackPath = describeTopArcLeftToRight(140, 142, 96);
  const gradientId = `gradient-${sanitizeId(gaugeId)}`;

  const progressValue = useMotionValue(0);
  const smoothProgress = useSpring(progressValue, {
    stiffness: 42,
    damping: 22,
    mass: 1.05,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      progressValue.set(safeProgress / 100);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [safeProgress, delay, progressValue]);

  return (
    <div className="relative mx-auto w-full max-w-[236px] sm:max-w-[252px]">
      <svg
        viewBox="0 0 280 190"
        className="mx-auto block h-auto w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.accentStart} />
            <stop offset="100%" stopColor={theme.accentEnd} />
          </linearGradient>
        </defs>

        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="24"
          strokeLinecap="round"
        />

        <motion.path
          d={trackPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="24"
          strokeLinecap="round"
          initial={false}
          style={{ pathLength: smoothProgress }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-8 sm:pt-9">
        <AnimatedNumber
          value={Number(current || 0)}
          duration={1.2}
          delay={delay}
          className={cn(
            "text-[1.75rem] font-bold tracking-tight sm:text-[2rem]",
            theme.number
          )}
        />

        <div className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          {target > 0 ? `ΑΠΟ ${target}` : "ΧΩΡΙΣ ΣΤΟΧΟ"}
        </div>

        {subLabel ? (
          <div className="mt-2 text-center text-[10px] text-zinc-400 sm:text-[11px]">
            {subLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SKELETONS                                 */
/* -------------------------------------------------------------------------- */
function SkeletonPulse({ className = "" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800",
        className
      )}
    />
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-900/95 p-3.5 sm:p-4">
      <div className="space-y-3.5">
        <div className="p-1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonPulse className="h-5 w-32 rounded-lg" />
              <SkeletonPulse className="h-3.5 w-24 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonPulse className="h-6 w-20 rounded-full" />
              <SkeletonPulse className="h-7 w-7 rounded-full" />
            </div>
          </div>

          <SkeletonPulse className="mx-auto h-[104px] w-[200px] rounded-[999px]" />
        </div>

        <div className="space-y-2">
          <SkeletonPulse className="h-4 w-full rounded-lg" />
          <SkeletonPulse className="h-4 w-4/5 rounded-lg" />
        </div>

        <div className="flex flex-wrap gap-2">
          <SkeletonPulse className="h-7 w-24 rounded-full" />
          <SkeletonPulse className="h-7 w-20 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
          <SkeletonPulse className="h-10 w-full rounded-xl" />
          <SkeletonPulse className="h-10 w-full rounded-xl" />
        </div>

        <SkeletonPulse className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export function GoalsCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <GoalCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               STATUS PILL UI                               */
/* -------------------------------------------------------------------------- */
function GoalStatusPill({ label, theme }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]",
        theme.pill
      )}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   CARD                                     */
/* -------------------------------------------------------------------------- */
const GoalCard = memo(function GoalCard({
  goal,
  index,
  setEditingGoal,
  setShowCreateForm,
  onDeleteRequest,
  onComplete,
  getProgressStatus,
  getStatusLabel,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [playCompleteFx, setPlayCompleteFx] = useState(false);
  const menuRef = useRef(null);
  const prevCompletedRef = useRef(false);

  const progressRaw =
    goal.target_value && goal.target_value > 0
      ? (goal.progress_value / goal.target_value) * 100
      : 0;

  const progress = clamp(progressRaw, 0, 100);

  const derivedStatus =
    goal.status === "completed"
      ? "completed"
      : getProgressStatus(goal.progress_value, goal.target_value);

  const isCompleted = derivedStatus === "completed";
  const theme = getGaugeTheme(progress, isCompleted);

  const statusLabel = useMemo(() => {
    const rawStatus = getStatusLabel?.(derivedStatus) ?? derivedStatus;
    return toGreekStatusLabel(rawStatus);
  }, [derivedStatus, getStatusLabel]);

  const categoryLabel = useMemo(() => {
    return toGreekCategoryLabel(goal.category, goal.custom_category);
  }, [goal.category, goal.custom_category]);

  const dueDateText = useMemo(() => {
    if (!goal.due_date) return "Χωρίς προθεσμία";
    return new Date(goal.due_date).toLocaleDateString("el-GR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [goal.due_date]);

  const description =
    goal.description?.trim() ||
    "Παρακολούθησε την πορεία σου και κράτα τον στόχο σου σε συνεχή εξέλιξη.";

  useEffect(() => {
    if (!showMenu) return;

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      setPlayCompleteFx(true);
      const timer = setTimeout(() => setPlayCompleteFx(false), 1200);
      prevCompletedRef.current = true;
      return () => clearTimeout(timer);
    }

    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  const handleEdit = () => {
    setShowMenu(false);
    setEditingGoal(goal);
    setShowCreateForm(true);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDeleteRequest?.(goal);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isCompleted ? 1.003 : 1,
        boxShadow: isCompleted
          ? "0 0 0 1px rgba(34,197,94,0.08), 0 12px 30px rgba(34,197,94,0.06)"
          : "0 0 0 1px rgba(0,0,0,0), 0 10px 28px rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, y: -12, scale: 0.985 }}
      transition={{
        delay: index * 0.04,
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-[1.5rem] border p-3.5 sm:p-4",
        isCompleted
          ? "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(10,10,12,0.98))]"
          : "border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(10,10,12,0.98))]"
      )}
    >
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.07),transparent_42%)]"
        />
      )}

      <AnimatePresence>
        {playCompleteFx ? (
          <>
            <motion.div
              initial={{ opacity: 0.5, scale: 0.97 }}
              animate={{ opacity: 0, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] border border-emerald-400/25"
            />
            <motion.div
              initial={{ opacity: 0.2, scale: 0.92 }}
              animate={{ opacity: 0, scale: 1.12 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.95, ease: "easeOut" }}
              className="pointer-events-none absolute inset-[-10%] rounded-[inherit] bg-[radial-gradient(circle,rgba(74,222,128,0.10)_0%,rgba(74,222,128,0.04)_28%,transparent_65%)]"
            />
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative flex h-full flex-col">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-1 items-start gap-2">
            <GoalIconRenderer
              category={goal.category}
              icon={goal.icon}
              className="mt-0.5 h-[16px] w-[16px] shrink-0 text-zinc-100"
            />

            <div className="min-w-0">
              <h3
                className="truncate text-[1.02rem] font-bold leading-[1.15] tracking-tight text-white sm:text-[1.12rem]"
                title={goal.title}
              >
                {goal.title}
              </h3>

              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                {categoryLabel}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <GoalStatusPill label={statusLabel} theme={theme} />

            <div ref={menuRef} className="relative shrink-0">
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setShowMenu((prev) => !prev)}
                className="rounded-xl p-1 text-zinc-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Άνοιγμα ρυθμίσεων στόχου"
                aria-expanded={showMenu}
              >
                <MoreVertical className="h-4.5 w-4.5" />
              </motion.button>

              <AnimatePresence>
                {showMenu ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-[calc(100%+0.45rem)] z-30 min-w-[148px] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
                  >
                    <button
                      onClick={handleEdit}
                      className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                    >
                      <Edit3 className="h-4 w-4" />
                      Επεξεργασία
                    </button>

                    <div className="h-px bg-zinc-800" />

                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Διαγραφή
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="pb-1">
          <SemiGauge
            progress={progress}
            current={Number(goal.progress_value ?? 0)}
            target={Number(goal.target_value ?? 0)}
            gaugeId={goal.id ?? `goal-${index}`}
            delay={index * 0.05}
            theme={theme}
            subLabel={
              goal.unit
                ? `${Math.round(progress)}% • ${goal.unit}`
                : `${Math.round(progress)}% ολοκληρωμένο`
            }
          />
        </div>

        <div className="pt-3">
          <p
            className="text-[13px] leading-5 text-zinc-400 sm:text-[13.5px]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {description}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {goal.category === "custom" && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[10px] font-medium text-zinc-200">
              <Tag className="h-3.5 w-3.5" />
              {goal.custom_category || "Προσαρμοσμένη"}
            </div>
          )}

          {goal.unit && (
            <div className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[10px] font-medium text-zinc-200">
              Μονάδα: {goal.unit}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800/90 pt-3">
          <div className="min-w-0 rounded-[1rem] bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-white">
              <Activity className="h-3.5 w-3.5 shrink-0 text-white" />
              <p className="text-[10px] uppercase tracking-[0.14em] text-white">
                Πρόοδος
              </p>
            </div>

            <p className="mt-1 truncate text-sm font-semibold text-white">
              {goal.progress_value ?? 0}
              {goal.unit ? ` ${goal.unit}` : ""}{" "}
              <span className="text-zinc-500">/ {goal.target_value ?? 0}</span>
            </p>
          </div>

          <div className="min-w-0 rounded-[1rem] bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-white">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-white" />
              <p className="text-[10px] uppercase tracking-[0.14em] text-white">
                Προθεσμία
              </p>
            </div>

            <p className="mt-1 truncate text-sm font-semibold text-white">
              {dueDateText}
            </p>
          </div>
        </div>

        <div className="mt-3">
          {!isCompleted ? (
            <motion.button
              whileTap={{ scale: 0.985 }}
              whileHover={{ scale: 1.005 }}
              onClick={() => onComplete(goal.id)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-[13px] font-semibold text-zinc-100 transition hover:bg-zinc-700"
            >
              <CheckCircle className="h-4 w-4" />
              Μαρκάρισέ το ως ολοκληρωμένο
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0.97, opacity: 0.78 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-[13px] font-semibold text-emerald-200"
            >
              <CheckCircle className="h-4 w-4" />
              Ο στόχος ολοκληρώθηκε
            </motion.div>
          )}
        </div>
      </div>
    </motion.article>
  );
});

/* -------------------------------------------------------------------------- */
/*                              LAZY CARD WRAPPER                             */
/* -------------------------------------------------------------------------- */
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
    <div ref={ref} className="min-h-[365px] sm:min-h-[402px]">
      {isVisible ? <GoalCard {...props} /> : <GoalCardSkeleton />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    GRID                                    */
/* -------------------------------------------------------------------------- */
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
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteRequest = (goal) => {
    setGoalToDelete(goal);
  };

  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setGoalToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete?.id) return;

    try {
      setDeleteLoading(true);
      await Promise.resolve(onDelete?.(goalToDelete.id));
      setGoalToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <GoalsCardsSkeleton count={skeletonCount} />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {goals.map((goal, index) => (
            <LazyGoalCard
              key={goal.id ?? index}
              goal={goal}
              index={index}
              setEditingGoal={setEditingGoal}
              setShowCreateForm={setShowCreateForm}
              onDeleteRequest={handleDeleteRequest}
              onComplete={onComplete}
              getProgressStatus={getProgressStatus}
              getStatusLabel={getStatusLabel}
            />
          ))}
        </AnimatePresence>
      </div>

      <GoalDeleteConfirmModal
        open={!!goalToDelete}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
        goalTitle={goalToDelete?.title || ""}
      />
    </>
  );
}