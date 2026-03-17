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
  AlertCircle,
  Tag,
  X,
  ChevronRight,
  MoreVertical,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/*                                   TOAST                                    */
/* -------------------------------------------------------------------------- */
export function GoalsToast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 z-[1200] flex justify-center",
        "top-[calc(env(safe-area-inset-top,0px)+4.75rem)]",
        "sm:inset-x-auto sm:right-4 sm:left-auto sm:justify-end sm:top-4"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-auto relative w-full max-w-[min(100%,26rem)] overflow-hidden",
            "rounded-[1.35rem] border backdrop-blur-xl shadow-2xl",
            "px-3.5 py-3 sm:px-4 sm:py-3.5",
            isError
              ? "border-red-500/25 bg-[linear-gradient(135deg,rgba(69,10,10,0.92),rgba(24,24,27,0.96))] text-red-100 shadow-[0_18px_50px_rgba(127,29,29,0.28)]"
              : "border-emerald-500/25 bg-[linear-gradient(135deg,rgba(6,78,59,0.22),rgba(24,24,27,0.96))] text-emerald-50 shadow-[0_18px_50px_rgba(6,95,70,0.22)]"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-80",
              isError
                ? "bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.14),transparent_38%)]"
                : "bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.14),transparent_38%)]"
            )}
          />

          <div className="relative flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                isError
                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] font-semibold tracking-tight sm:text-[1rem]">
                {toast.title}
              </p>

              {!isError ? (
                <p className="mt-0.5 text-[11px] text-emerald-200/70 sm:text-xs">
                  Ο στόχος ενημερώθηκε επιτυχώς
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-red-200/70 sm:text-xs">
                  Δοκίμασε ξανά σε λίγο
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-white/60 transition hover:bg-white/5 hover:text-white"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 4, ease: "linear" }}
            className={cn(
              "absolute bottom-0 left-0 h-[2px] w-full origin-left",
              isError ? "bg-red-400/70" : "bg-emerald-400/80"
            )}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

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
  };

  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      <img
        src={icon}
        alt="icon"
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
  const trackPath = describeTopArcLeftToRight(140, 140, 92);
  const gradientId = `gradient-${sanitizeId(gaugeId)}`;

  const progressValue = useMotionValue(0);
  const smoothProgress = useSpring(progressValue, {
    stiffness: 38,
    damping: 20,
    mass: 1.15,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      progressValue.set(safeProgress / 100);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [safeProgress, delay, progressValue]);

  return (
    <div className="relative mx-auto w-full max-w-[250px] sm:max-w-[320px]">
      <svg
        viewBox="0 0 280 180"
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
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="22"
          strokeLinecap="butt"
        />

        <motion.path
          d={trackPath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="22"
          strokeLinecap="butt"
          initial={false}
          style={{ pathLength: smoothProgress }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6 sm:pt-7">
        <AnimatedNumber
          value={Number(current || 0)}
          duration={1.25}
          delay={delay}
          className={cn(
            "text-[1.75rem] font-bold tracking-tight sm:text-[2.25rem]",
            theme.number
          )}
        />

        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">
          {target > 0 ? `ΑΠΟ ${target}` : "ΧΩΡΙΣ ΣΤΟΧΟ"}
        </div>

        {subLabel ? (
          <div className="mt-1.5 text-center text-[10px] text-zinc-400 sm:mt-2 sm:text-xs">
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
    <div className="relative overflow-hidden rounded-[1.4rem] border border-zinc-700 bg-zinc-900 p-4 sm:rounded-[1.75rem] sm:p-6">
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonPulse className="h-5 w-32 rounded-lg sm:h-6 sm:w-36" />
            <SkeletonPulse className="h-6 w-24 rounded-full sm:h-7" />
          </div>

          <SkeletonPulse className="h-8 w-8 rounded-full sm:h-9 sm:w-9" />
        </div>

        <div className="px-1 sm:px-2">
          <SkeletonPulse className="mx-auto h-[96px] w-[210px] rounded-t-[999px] rounded-b-[1.25rem] sm:h-[110px] sm:w-[230px] sm:rounded-b-[1.5rem]" />
        </div>

        <div className="space-y-2">
          <SkeletonPulse className="mx-auto h-3.5 w-4/5 rounded-lg sm:h-4" />
          <SkeletonPulse className="mx-auto h-3.5 w-3/4 rounded-lg sm:h-4" />
        </div>

        <div className="flex justify-center">
          <SkeletonPulse className="h-7 w-24 rounded-full sm:h-8" />
        </div>

        <SkeletonPulse className="h-12 w-full rounded-none sm:h-14" />
        <SkeletonPulse className="h-11 w-full rounded-[999px] sm:h-12" />
      </div>
    </div>
  );
}

export function GoalsCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
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
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] sm:px-3 sm:py-1.5 sm:text-[11px]",
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
  onDelete,
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

  const dueDateText = useMemo(() => {
    if (!goal.due_date) return null;
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
    onDelete(goal.id);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.99 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isCompleted ? 1.005 : 1,
        boxShadow: isCompleted
          ? "0 0 0 1px rgba(34,197,94,0.10), 0 12px 32px rgba(34,197,94,0.08)"
          : "0 0 0 1px rgba(0,0,0,0), 0 10px 30px rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, y: -14, scale: 0.985 }}
      transition={{
        delay: index * 0.04,
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-[1.4rem] border p-4 sm:rounded-[1.75rem] sm:p-6",
        isCompleted
          ? "border-emerald-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950"
          : "border-zinc-700 bg-zinc-900"
      )}
    >
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_40%)]"
        />
      )}

      <AnimatePresence>
        {playCompleteFx ? (
          <>
            <motion.div
              initial={{ opacity: 0.55, scale: 0.97 }}
              animate={{ opacity: 0, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] border border-emerald-400/30"
            />
            <motion.div
              initial={{ opacity: 0.24, scale: 0.92 }}
              animate={{ opacity: 0, scale: 1.14 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.95, ease: "easeOut" }}
              className="pointer-events-none absolute inset-[-10%] rounded-[inherit] bg-[radial-gradient(circle,rgba(74,222,128,0.12)_0%,rgba(74,222,128,0.05)_28%,transparent_65%)]"
            />
          </>
        ) : null}
      </AnimatePresence>

      <div className="relative flex h-full flex-col">
        {/* top */}
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
          <div className="min-w-0 flex flex-1 items-center gap-2-1 items-center gap-2">
            <GoalIconRenderer
              category={goal.category}
              icon={goal.icon}
              className="h-[18px] w-[18px] shrink-0 text-zinc-200 sm:h-5 sm:w-5"
            />

            <h3
              className="truncate text-[1rem] font-bold leading-tight text-white sm:text-[1.45rem]"
              title={goal.title}
            >
              {goal.title}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <GoalStatusPill
              label={getStatusLabel(derivedStatus)}
              theme={theme}
            />

            <div ref={menuRef} className="relative shrink-0">
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setShowMenu((prev) => !prev)}
                className="p-1 text-zinc-400 transition hover:text-white"
                aria-label="Open goal settings"
                aria-expanded={showMenu}
              >
                <MoreVertical className="h-5 w-5" />
              </motion.button>

              <AnimatePresence>
                {showMenu ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[148px] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
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

        {/* gauge */}
        <div className="mb-4 sm:mb-5">
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

        {/* description */}
        <div className="mb-4 px-0.5 text-center sm:mb-5 sm:px-1">
          <p className="mx-auto max-w-[32ch] text-[13px] leading-6 text-zinc-400 sm:max-w-[34ch] sm:text-[15px] sm:leading-7">
            {description}
          </p>
        </div>

        {/* meta */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-5 sm:gap-2.5">
          {goal.category === "custom" && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 sm:px-3 sm:text-[11px]">
              <Tag className="h-3.5 w-3.5" />
              {goal.custom_category || "Προσαρμοσμένη"}
            </div>
          )}

          {goal.unit && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 sm:px-3 sm:text-[11px]">
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
              Μονάδα: {goal.unit}
            </div>
          )}
        </div>

        {/* due date full bleed */}
        {goal.due_date && (
          <div className="-mx-4 mb-4 px-4 py-3 sm:-mx-6 sm:mb-5 sm:px-6">
            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="h-4.5 w-4.5 shrink-0 text-zinc-400 sm:h-5 sm:w-5" />

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 sm:text-[11px]">
                  Προθεσμία
                </p>
                <p className="text-sm font-medium text-white sm:text-base">
                  {dueDateText}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* footer action */}
        <div className="mt-auto">
          {!isCompleted ? (
            <motion.button
              whileTap={{ scale: 0.985 }}
              whileHover={{ scale: 1.005 }}
              onClick={() => onComplete(goal.id)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-[999px] border px-4 py-3.5 text-sm font-semibold transition sm:px-5 sm:py-4 sm:text-base",
                "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              )}
            >
              <CheckCircle className="h-4 w-4" />
              Μαρκάρισε ως ολοκληρωμένο
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0.97, opacity: 0.78 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full items-center justify-center gap-2 rounded-[999px] border border-zinc-700 bg-zinc-900/80 px-4 py-3.5 text-sm font-semibold text-zinc-100 sm:px-5 sm:py-4 sm:text-base"
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
    <div ref={ref} className="min-h-[420px] sm:min-h-[510px]">
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
  if (loading) {
    return <GoalsCardsSkeleton count={skeletonCount} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
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
            getStatusLabel={getStatusLabel}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}