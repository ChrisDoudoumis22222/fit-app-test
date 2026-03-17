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
    <div className="fixed top-4 right-4 z-[1000] max-w-[92vw] sm:max-w-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -10, x: 24 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -8, x: 24 }}
          transition={{ duration: 0.22 }}
          className={cn(
            "relative overflow-hidden rounded-2xl border px-4 py-3 text-sm shadow-2xl",
            isError
              ? "border-red-500/30 bg-[#120607] text-red-200"
              : "border-emerald-500/30 bg-[#06110b] text-emerald-200"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                isError
                  ? "border-red-500/25 bg-red-500/10"
                  : "border-emerald-500/25 bg-emerald-500/10"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold leading-relaxed">
                {toast.title}
              </p>
            </div>

            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-1 opacity-70 transition hover:bg-white/5 hover:opacity-100"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
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
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/5">
        <img
          src={icon}
          alt="icon"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  const looksLikeEmoji =
    icon && !/^https?:\/\//i.test(icon) && icon.length <= 6;

  if (looksLikeEmoji) {
    return (
      <span className={cn("text-2xl leading-none", className || "")}>
        {icon}
      </span>
    );
  }

  const FallbackIcon = defaults[category || ""] || Target;
  return <FallbackIcon className={className || "h-8 w-8"} />;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */
const clamp = (value, min = 0, max = 100) =>
  Math.min(Math.max(value, min), max);

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

function sanitizeId(value) {
  return String(value ?? "goal")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

function getGaugeTheme(progress, isCompleted) {
  if (isCompleted || progress >= 80) {
    return {
      accentStart: "#a7f3d0",
      accentEnd: "#22c55e",
      pill:
        "border-emerald-400/30 bg-emerald-500/12 text-emerald-300 shadow-[0_0_18px_rgba(34,197,94,0.18)]",
      number: "text-emerald-200",
      ringGlow: "shadow-[0_0_45px_rgba(34,197,94,0.12)]",
      title: "text-white",
      panelBorder: "border-emerald-500/20",
      panelGlow: "after:bg-emerald-500/10",
    };
  }

  if (progress >= 40) {
    return {
      accentStart: "#fde68a",
      accentEnd: "#f59e0b",
      pill:
        "border-amber-400/30 bg-amber-500/12 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.16)]",
      number: "text-amber-100",
      ringGlow: "shadow-[0_0_45px_rgba(245,158,11,0.10)]",
      title: "text-white",
      panelBorder: "border-amber-500/15",
      panelGlow: "after:bg-amber-500/10",
    };
  }

  return {
    accentStart: "#d4d4d8",
    accentEnd: "#71717a",
    pill:
      "border-zinc-500/30 bg-zinc-500/10 text-zinc-300 shadow-[0_0_16px_rgba(255,255,255,0.05)]",
    number: "text-zinc-100",
    ringGlow: "shadow-[0_0_35px_rgba(255,255,255,0.04)]",
    title: "text-white",
    panelBorder: "border-zinc-700/70",
    panelGlow: "after:bg-white/[0.03]",
  };
}

/* -------------------------------------------------------------------------- */
/*                               ANIMATED NUMBER                              */
/* -------------------------------------------------------------------------- */
function AnimatedNumber({
  value,
  duration = 1.25,
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
  title = "",
  subLabel = "",
  gaugeId = "goal-gauge",
  delay = 0,
  theme,
}) {
  const safeProgress = clamp(progress, 0, 100);
  const trackPath = describeArc(140, 140, 92, 270, 90);
  const gradientId = `gradient-${sanitizeId(gaugeId)}`;

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        className={cn(
          "relative rounded-[2rem]",
          theme?.ringGlow || ""
        )}
      >
        <svg
          viewBox="0 0 280 180"
          className="mx-auto block h-auto w-full"
          aria-label={title}
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
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="22"
            strokeLinecap="butt"
          />

          <motion.path
            d={trackPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="22"
            strokeLinecap="butt"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: safeProgress / 100 }}
            transition={{
              duration: 1.25,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ pathLength: safeProgress / 100 }}
          />
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-7">
          <AnimatedNumber
            value={current || 0}
            duration={1.25}
            delay={delay}
            className={cn(
              "text-[2.15rem] font-bold tracking-tight sm:text-[2.4rem]",
              theme.number
            )}
          />
          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">
            {target > 0 ? `ΑΠΟ ${target}` : "ΧΩΡΙΣ ΣΤΟΧΟ"}
          </div>
          {subLabel ? (
            <div className="mt-2 text-center text-[11px] text-zinc-400 sm:text-xs">
              {subLabel}
            </div>
          ) : null}
        </div>
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
        "animate-pulse rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900",
        className
      )}
    />
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#030303] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-6">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonPulse className="h-6 w-36 rounded-lg" />
            <SkeletonPulse className="h-7 w-24 rounded-full" />
          </div>

          <div className="flex gap-2">
            <SkeletonPulse className="h-10 w-10 rounded-xl" />
            <SkeletonPulse className="h-10 w-10 rounded-xl" />
          </div>
        </div>

        <div className="px-2">
          <SkeletonPulse className="mx-auto h-[120px] w-[230px] rounded-t-[999px] rounded-b-[2rem]" />
        </div>

        <div className="space-y-2">
          <SkeletonPulse className="mx-auto h-4 w-4/5 rounded-lg" />
          <SkeletonPulse className="mx-auto h-4 w-3/4 rounded-lg" />
          <SkeletonPulse className="mx-auto h-4 w-2/3 rounded-lg" />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <SkeletonPulse className="h-8 w-28 rounded-full" />
          <SkeletonPulse className="h-8 w-24 rounded-full" />
        </div>

        <SkeletonPulse className="h-12 w-full rounded-[999px]" />
      </div>
    </div>
  );
}

export function GoalsCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
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
        "inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] sm:text-[11px]",
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

  const remaining = Math.max(
    Number(goal.target_value ?? 0) - Number(goal.progress_value ?? 0),
    0
  );

  const description =
    goal.description?.trim() ||
    "Παρακολούθησε την πορεία σου και κράτα τον στόχο σου σε συνεχή εξέλιξη.";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ delay: index * 0.04, duration: 0.34 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative h-full overflow-hidden rounded-[2rem] border bg-[#020202] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-6",
        theme.panelBorder
      )}
    >
      <div className="pointer-events-none absolute inset-[1px] rounded-[calc(2rem-1px)] border border-white/[0.04]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-20 bg-gradient-to-t from-white/[0.02] to-transparent" />

      <div className="relative flex h-full flex-col">
        {/* top */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <GoalIconRenderer
                  category={goal.category}
                  icon={goal.icon}
                  className="h-5 w-5 text-zinc-200"
                />
              </div>

              <h3
                className={cn(
                  "truncate text-lg font-bold leading-tight sm:text-[1.45rem]",
                  theme.title
                )}
                title={goal.title}
              >
                {goal.title}
              </h3>
            </div>

            <GoalStatusPill
              label={getStatusLabel(derivedStatus)}
              theme={theme}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => {
                setEditingGoal(goal);
                setShowCreateForm(true);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              aria-label="Edit goal"
            >
              <Edit3 className="h-4 w-4" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => onDelete(goal.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.08] text-red-300 transition hover:border-red-500/35 hover:bg-red-500/[0.14] hover:text-red-200"
              aria-label="Delete goal"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* gauge */}
        <div className="mb-5">
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
            title={goal.title}
          />
        </div>

        {/* description */}
        <div className="mb-5 px-1 text-center">
          <p className="mx-auto max-w-[34ch] text-sm leading-7 text-zinc-400 sm:text-[15px]">
            {description}
          </p>
        </div>

        {/* meta */}
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2.5">
          {goal.category === "custom" && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300">
              <Tag className="h-3.5 w-3.5" />
              {goal.custom_category || "Προσαρμοσμένη"}
            </div>
          )}

          {goal.unit && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300">
              <ChevronRight className="h-3.5 w-3.5 opacity-70" />
              Μονάδα: {goal.unit}
            </div>
          )}

          {goal.target_value > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300">
              Υπόλοιπο: {remaining}
            </div>
          )}
        </div>

        {/* due date */}
        {goal.due_date && (
          <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3 text-center text-sm text-zinc-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03]">
              <CalendarIcon className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Προθεσμία
              </p>
              <p className="font-medium">{dueDateText}</p>
            </div>
          </div>
        )}

        {/* footer action */}
        <div className="mt-auto">
          {!isCompleted ? (
            <motion.button
              whileTap={{ scale: 0.985 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => onComplete(goal.id)}
              className={cn(
                "relative w-full overflow-hidden rounded-[999px] border px-5 py-4 text-base font-semibold text-white transition",
                "border-white/18 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.35)]",
                "hover:border-white/26 hover:bg-[#060606]"
              )}
            >
              <span className="pointer-events-none absolute inset-[1px] rounded-[999px] border border-white/[0.05]" />
              <span className="relative flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Μαρκάρισε ως ολοκληρωμένο
              </span>
            </motion.button>
          ) : (
            <div className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[999px] border border-emerald-400/25 bg-[#07140d] px-5 py-4 text-base font-semibold text-emerald-300 shadow-[0_0_24px_rgba(34,197,94,0.08)]">
              <span className="pointer-events-none absolute inset-[1px] rounded-[999px] border border-white/[0.04]" />
              <CheckCircle className="h-4 w-4" />
              Ο στόχος ολοκληρώθηκε
            </div>
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
    <div ref={ref} className="min-h-[520px] sm:min-h-[560px]">
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