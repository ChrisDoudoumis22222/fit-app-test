"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
  Fragment,
} from "react";
import {
  ChevronLeft,
  CheckCircle2,
  Loader2,
  User2,
  Phone,
  CalendarDays,
  Briefcase,
  Award,
  Clock3,
  Sparkles,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import TrainerIdentityStep from "./steps/TrainerIdentityStep";
import TrainerContactStep from "./steps/TrainerContactStep";
import TrainerAvailabilityStep from "./steps/TrainerAvailabilityStep";
import TrainerProfessionalStep from "./steps/TrainerProfessionalStep";
import TrainerCredentialsStep from "./steps/TrainerCredentialsStep";

import {
  cn,
  createEmptySlot,
  buildInitialForm,
  buildSubmitData,
  validateWizardStep,
} from "./trainerOnboarding.utils";

/* -------------------- Typewriter -------------------- */
const TypewriterText = memo(function TypewriterText({
  text,
  delay = 0,
  speed = 16,
  className = "",
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    timerRef.current = setTimeout(
      () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          setCurrentIndex((prev) => prev + 1);
        }
      },
      currentIndex === 0 ? delay : speed
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, text, delay, speed]);

  return <span className={className}>{displayedText}</span>;
});

/* -------------------- Logo -------------------- */
const PeakVelocityLogo = memo(function PeakVelocityLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
        <img
          src="https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png"
          alt="Peak Velocity"
          className="h-7 w-7 object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="leading-tight">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase">
          Peak Velocity
        </p>
        <p className="text-base font-semibold text-white">Trainer Onboarding</p>
      </div>
    </div>
  );
});

/* -------------------- Desktop Step Rail -------------------- */
function DesktopStepRail({ steps, currentIndex, onGoToStep }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const active = index === currentIndex;
        const done = index < currentIndex;
        const clickable = index <= currentIndex;

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => clickable && onGoToStep(index)}
            disabled={!clickable}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-300",
              active
                ? "border-white/18 bg-white/[0.08] shadow-[0_14px_40px_rgba(255,255,255,0.05)]"
                : done
                ? "border-white/10 bg-white/[0.045] hover:bg-white/[0.06]"
                : "border-white/8 bg-white/[0.02] opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all",
                  active
                    ? "border-white/15 bg-white/[0.1] text-white"
                    : done
                    ? "border-white/10 bg-white/[0.07] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60"
                )}
              >
                {done && !active ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Βήμα {index + 1}
                  </span>
                  {active ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/75">
                      Τώρα
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 truncate text-sm font-semibold text-white">
                  {step.navTitle}
                </div>

                <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/48">
                  {step.navDescription}
                </div>
              </div>
            </div>

            {active ? (
              <motion.div
                layoutId="pv-active-step-highlight"
                className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/8"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------- Mobile Stepper -------------------- */
function MobileStepRail({ steps, currentIndex, onGoToStep }) {
  return (
    <div className="flex items-center w-full select-none">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const active = index === currentIndex;
        const done = index < currentIndex;
        const clickable = index <= currentIndex;

        return (
          <Fragment key={step.key}>
            <button
              type="button"
              onClick={() => clickable && onGoToStep(index)}
              disabled={!clickable}
              aria-label={`Βήμα ${index + 1}: ${step.navTitle}`}
              title={step.navTitle}
              className={cn(
                "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-300",
                active
                  ? "border-white/15 bg-white/[0.12] text-white"
                  : done
                  ? "border-white/10 bg-white/[0.08] text-white"
                  : "border-white/10 bg-white/[0.03] text-white/45"
              )}
            >
              {done && !active ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}

              {active ? (
                <span className="absolute -inset-1 rounded-full border border-white/10" />
              ) : null}
            </button>

            {index < steps.length - 1 ? (
              <div className="relative mx-2 h-[2px] flex-1 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                  initial={false}
                  animate={{ width: index < currentIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

/* -------------------- Form Step Renderer -------------------- */
function StepRenderer({
  stepKey,
  form,
  setField,
  setForm,
  toggleRole,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  updateAvailabilitySlot,
}) {
  if (stepKey === "identity") {
    return (
      <TrainerIdentityStep
        form={form}
        setField={setField}
        setForm={setForm}
      />
    );
  }

  if (stepKey === "contact") {
    return (
      <TrainerContactStep
        form={form}
        setField={setField}
        setForm={setForm}
      />
    );
  }

  if (stepKey === "availability") {
    return (
      <TrainerAvailabilityStep
        form={form}
        addAvailabilitySlot={addAvailabilitySlot}
        removeAvailabilitySlot={removeAvailabilitySlot}
        updateAvailabilitySlot={updateAvailabilitySlot}
      />
    );
  }

  if (stepKey === "professional") {
    return (
      <TrainerProfessionalStep
        form={form}
        setField={setField}
        toggleRole={toggleRole}
      />
    );
  }

  if (stepKey === "credentials") {
    return <TrainerCredentialsStep form={form} setField={setField} />;
  }

  return null;
}

/* -------------------- Desktop Header -------------------- */
function DesktopTopHeader({ currentStep, steps, progressPct, completedCount }) {
  const StepIcon = currentStep.icon;

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <PeakVelocityLogo />

        <div className="mt-8 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.06] text-white">
            <StepIcon className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/38">
              <TypewriterText
                text={`Βήμα ${currentStep.dbStep} από ${steps.length}`}
                delay={120}
                speed={20}
              />
            </p>

            <h1 className="mt-2 text-3xl xl:text-4xl font-extrabold leading-[1.05] text-white">
              <TypewriterText
                text={currentStep.title}
                delay={150}
                speed={14}
              />
            </h1>

            <p className="mt-3 text-base xl:text-lg font-medium text-white/75">
              {currentStep.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/72">
                <Clock3 className="h-4 w-4" />
                {currentStep.helperText}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/72">
                <Sparkles className="h-4 w-4" />
                {completedCount} ολοκληρωμένα βήματα
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/80">
        Progress {progressPct}%
      </div>
    </div>
  );
}

/* -------------------- Mobile Header -------------------- */
function MobileTopHeader({ currentStep, steps, progressPct, onGoToStep, currentIndex }) {
  const StepIcon = currentStep.icon;

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <PeakVelocityLogo />

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/78">
          {progressPct}%
        </div>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
          <TypewriterText
            text={`Βήμα ${currentStep.dbStep} από ${steps.length}`}
            delay={120}
            speed={22}
          />
        </p>

        <div className="mt-3 flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
            <StepIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-[1.75rem] font-extrabold leading-[1.05] text-white">
              <TypewriterText
                text={currentStep.title}
                delay={140}
                speed={16}
              />
            </h1>

            <p className="mt-2 text-sm font-medium text-white/70">
              {currentStep.subtitle}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <MobileStepRail
            steps={steps}
            currentIndex={currentIndex}
            onGoToStep={onGoToStep}
          />
        </div>
      </div>
    </div>
  );
}

/* ==================== MAIN COMPONENT ==================== */
export default function TrainerOnboardingWizard({
  initialProfile,
  saving = false,
  onSaveProgress,
  onComplete,
}) {
  const steps = useMemo(() => {
    return [
      {
        dbStep: 1,
        key: "identity",
        navTitle: "Ταυτότητα",
        navDescription: "Username, όνομα, περιοχή και ρόλος.",
        title: "Χτίσε την ταυτότητά σου",
        subtitle: "Το πρώτο impression του προφίλ σου ξεκινά εδώ",
        description:
          "Συμπλήρωσε τα βασικά στοιχεία ώστε οι χρήστες να σε αναγνωρίζουν άμεσα και το προφίλ σου να δείχνει επαγγελματικό από το πρώτο λεπτό.",
        helperText: "Σύντομο βήμα • περίπου 30 δευτερόλεπτα",
        icon: User2,
      },
      {
        dbStep: 2,
        key: "contact",
        navTitle: "Επικοινωνία",
        navDescription: "Τηλέφωνο, bio και online παρουσία.",
        title: "Κάνε το προφίλ σου πιο ανθρώπινο",
        subtitle: "Δώσε τρόπο επικοινωνίας και λίγη προσωπικότητα",
        description:
          "Πρόσθεσε στοιχεία επικοινωνίας και ένα καθαρό bio, ώστε ο επισκέπτης να καταλάβει γρήγορα ποιος είσαι και πώς μπορεί να συνεργαστεί μαζί σου.",
        helperText: "Γρήγορη συμπλήρωση • κράτα το καθαρό και επαγγελματικό",
        icon: Phone,
      },
      {
        dbStep: 3,
        key: "availability",
        navTitle: "Ωράριο",
        navDescription: "Μέρες, ώρες και online διαθεσιμότητα.",
        title: "Οργάνωσε το πρόγραμμά σου",
        subtitle: "Δείξε καθαρά πότε είσαι διαθέσιμος",
        description:
          "Βάλε μέρες και ώρες προπόνησης για να ξέρουν οι χρήστες πότε μπορούν να σε κλείσουν. Ένα σωστό ωράριο μειώνει μπέρδεμα και χαμένα leads.",
        helperText: "Το πιο σημαντικό βήμα για κρατήσεις",
        icon: CalendarDays,
      },
      {
        dbStep: 4,
        key: "professional",
        navTitle: "Εξειδίκευση",
        navDescription: "Εξειδικεύσεις, εμπειρία και ρόλοι.",
        title: "Ανάδειξε την επαγγελματική σου αξία",
        subtitle: "Πες ξεκάθαρα τι προσφέρεις και σε τι ξεχωρίζεις",
        description:
          "Δήλωσε εμπειρία, ρόλους και επαγγελματική κατεύθυνση ώστε η πλατφόρμα να σε εμφανίζει πιο σωστά και ο πελάτης να καταλαβαίνει αμέσως αν του ταιριάζεις.",
        helperText: "Όσο πιο σωστό αυτό το βήμα, τόσο πιο ποιοτικό το matching",
        icon: Briefcase,
      },
      {
        dbStep: 5,
        key: "credentials",
        navTitle: "Πιστοποιήσεις",
        navDescription: "Certifications και δίπλωμα.",
        title: "Κλείσε δυνατά με αξιοπιστία",
        subtitle: "Οι πιστοποιήσεις σου χτίζουν εμπιστοσύνη",
        description:
          "Πρόσθεσε certifications και σύνδεσμο διπλώματος για να κάνεις το προφίλ σου πιο έμπιστο, πιο δυνατό και πιο έτοιμο να μετατρέψει επισκέπτες σε πελάτες.",
        helperText: "Τελικό βήμα • και μετά είσαι έτοιμος",
        icon: Award,
      },
    ];
  }, []);

  const [form, setForm] = useState(() => buildInitialForm(initialProfile));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepError, setStepError] = useState("");
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    setForm(buildInitialForm(initialProfile));
  }, [initialProfile]);

  useEffect(() => {
    const requestedDbStep = Number(initialProfile?.onboarding_step);

    if (!Number.isFinite(requestedDbStep)) {
      setCurrentIndex(0);
      return;
    }

    const idx = steps.findIndex((step) => step.dbStep === requestedDbStep);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [initialProfile?.onboarding_step, steps]);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const completedCount = currentIndex;
  const progressPct = Math.round(((currentIndex + 1) / steps.length) * 100);

  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value ?? e;

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleRole = (roleName) => {
    setForm((prev) => {
      const exists = prev.roles.includes(roleName);

      return {
        ...prev,
        roles: exists
          ? prev.roles.filter((item) => item !== roleName)
          : [...prev.roles, roleName],
      };
    });
  };

  const addAvailabilitySlot = (weekday) => {
    setForm((prev) => ({
      ...prev,
      availabilityByDay: {
        ...prev.availabilityByDay,
        [weekday]: [...(prev.availabilityByDay?.[weekday] || []), createEmptySlot()],
      },
    }));
  };

  const removeAvailabilitySlot = (weekday, index) => {
    setForm((prev) => ({
      ...prev,
      availabilityByDay: {
        ...prev.availabilityByDay,
        [weekday]: (prev.availabilityByDay?.[weekday] || []).filter(
          (_, idx) => idx !== index
        ),
      },
    }));
  };

  const updateAvailabilitySlot = (weekday, index, key, value) => {
    setForm((prev) => ({
      ...prev,
      availabilityByDay: {
        ...prev.availabilityByDay,
        [weekday]: (prev.availabilityByDay?.[weekday] || []).map((slot, idx) =>
          idx === index ? { ...slot, [key]: value } : slot
        ),
      },
    }));
  };

  const handleGoToStep = useCallback(
    async (idx) => {
      if (saving) return;
      if (idx === currentIndex) return;
      if (idx > currentIndex) return;

      setDirection(idx < currentIndex ? -1 : 1);
      setStepError("");

      const targetStep = steps[idx];

      if (onSaveProgress && targetStep) {
        await onSaveProgress(buildSubmitData(form), targetStep.dbStep);
      }

      setCurrentIndex(idx);
    },
    [saving, currentIndex, steps, onSaveProgress, form]
  );

  const handleBack = useCallback(async () => {
    if (currentIndex <= 0 || saving) return;

    setDirection(-1);
    setStepError("");

    const previousStep = steps[currentIndex - 1];

    if (onSaveProgress && previousStep) {
      await onSaveProgress(buildSubmitData(form), previousStep.dbStep);
    }

    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, [currentIndex, saving, steps, onSaveProgress, form]);

  const handleNext = useCallback(async () => {
    if (saving) return;

    const validationError = validateWizardStep({
      currentStep,
      form,
    });

    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepError("");
    const data = buildSubmitData(form);

    if (isLastStep) {
      await onComplete?.(data);
      return;
    }

    const nextStep = steps[currentIndex + 1];

    if (onSaveProgress && nextStep) {
      await onSaveProgress(data, nextStep.dbStep);
    }

    setDirection(1);
    setCurrentIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [
    saving,
    currentStep,
    form,
    isLastStep,
    onComplete,
    steps,
    currentIndex,
    onSaveProgress,
  ]);

  if (!currentStep) return null;

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-8%] h-[22rem] w-[22rem] rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_26%,rgba(255,255,255,0.02))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.46),rgba(0,0,0,0.9))]" />
      </div>

      {/* ================= MOBILE ================= */}
      <div className="relative z-10 flex min-h-[100svh] flex-col lg:hidden">
        <MobileTopHeader
          currentStep={currentStep}
          steps={steps}
          progressPct={progressPct}
          currentIndex={currentIndex}
          onGoToStep={handleGoToStep}
        />

        <div className="h-px bg-white/8" />

        <main className="flex-1 px-4 pt-5 pb-24">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep.key}
              initial={{
                opacity: 0,
                x: direction > 0 ? 18 : -18,
                y: 8,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
              }}
              exit={{
                opacity: 0,
                x: direction > 0 ? -12 : 12,
                y: -4,
              }}
              transition={{
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <StepRenderer
                stepKey={currentStep.key}
                form={form}
                setField={setField}
                setForm={setForm}
                toggleRole={toggleRole}
                addAvailabilitySlot={addAvailabilitySlot}
                removeAvailabilitySlot={removeAvailabilitySlot}
                updateAvailabilitySlot={updateAvailabilitySlot}
              />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {stepError ? (
              <motion.div
                key="wizard-error-mobile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {stepError}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <div className="sticky bottom-0 z-20 border-t border-white/8 bg-black/80 px-4 py-4 backdrop-blur-xl">
          <div className="flex flex-col-reverse gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentIndex === 0 || saving}
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-all",
                currentIndex === 0 || saving
                  ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/25"
                  : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Προηγούμενο
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.10] px-5 text-sm font-bold text-white transition-all hover:bg-white/[0.14] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : isLastStep ? (
                <>
                  Ολοκλήρωση
                  <Rocket className="h-4 w-4" />
                </>
              ) : (
                <>
                  Συνέχεια
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= DESKTOP ================= */}
      <div className="relative z-10 hidden lg:block">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6 xl:px-8 xl:py-8">
          <DesktopTopHeader
            currentStep={currentStep}
            steps={steps}
            progressPct={progressPct}
            completedCount={completedCount}
          />

          <div className="mt-8">
            <DesktopStepRail
              steps={steps}
              currentIndex={currentIndex}
              onGoToStep={handleGoToStep}
            />
          </div>

          <div className="mt-8 overflow-hidden rounded-[34px] border border-white/10 bg-zinc-950/72 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="border-b border-white/8 px-6 py-5 xl:px-8 xl:py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {currentStep.navTitle}
                    </span>
                    <span className="text-xs text-white/38">
                      Βήμα {currentStep.dbStep}/{steps.length}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-semibold text-white">
                    Συμπλήρωσε το βήμα με καθαρά στοιχεία
                  </h2>

                  <p className="mt-1 text-sm leading-relaxed text-white/50">
                    Ό,τι βάζεις εδώ βοηθά το προφίλ σου να φαίνεται πιο σωστό,
                    πιο επαγγελματικό και πιο έτοιμο για κρατήσεις.
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <currentStep.icon className="h-5 w-5 text-white" />
                </div>
              </div>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-white/80"
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            <div className="px-6 py-6 xl:px-8 xl:py-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep.key}
                  initial={{
                    opacity: 0,
                    x: direction > 0 ? 22 : -22,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: direction > 0 ? -14 : 14,
                    y: -6,
                  }}
                  transition={{
                    duration: 0.25,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <StepRenderer
                    stepKey={currentStep.key}
                    form={form}
                    setField={setField}
                    setForm={setForm}
                    toggleRole={toggleRole}
                    addAvailabilitySlot={addAvailabilitySlot}
                    removeAvailabilitySlot={removeAvailabilitySlot}
                    updateAvailabilitySlot={updateAvailabilitySlot}
                  />
                </motion.div>
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {stepError ? (
                  <motion.div
                    key="wizard-error-desktop"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  >
                    {stepError}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="border-t border-white/8 px-6 py-5 xl:px-8 xl:py-6">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentIndex === 0 || saving}
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-all",
                    currentIndex === 0 || saving
                      ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/25"
                      : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Προηγούμενο
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex h-12 min-w-[210px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.10] px-5 text-sm font-bold text-white transition-all hover:bg-white/[0.14] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Αποθήκευση...
                    </>
                  ) : isLastStep ? (
                    <>
                      Ολοκλήρωση
                      <Rocket className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Συνέχεια
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}