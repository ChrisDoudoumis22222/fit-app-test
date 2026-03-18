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
  ChevronRight,
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
  speed = 18,
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
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 ring-1 ring-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
        <img
          src="https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png"
          alt="Peak Velocity"
          className="h-7 w-7 object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="leading-tight">
        <p className="text-sm font-medium tracking-[0.18em] text-white/65 uppercase">
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
    <div className="space-y-3">
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
              "group relative w-full overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-300",
              active
                ? "border-white/20 bg-white/[0.08] shadow-[0_12px_40px_rgba(255,255,255,0.06)]"
                : done
                ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                : "border-white/8 bg-white/[0.02] opacity-70 cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all",
                  active
                    ? "border-white/20 bg-white text-black"
                    : done
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/70"
                )}
              >
                {done && !active ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Βήμα {index + 1}
                  </span>
                  {active ? (
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                      Τώρα
                    </span>
                  ) : null}
                </div>

                <h3
                  className={cn(
                    "mt-1 text-sm font-semibold",
                    active ? "text-white" : "text-white/90"
                  )}
                >
                  {step.navTitle}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  {step.navDescription}
                </p>
              </div>
            </div>

            {active ? (
              <motion.div
                layoutId="pv-active-step-highlight"
                className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-white/10"
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
                  ? "border-white/25 bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.18)]"
                  : done
                  ? "border-white/15 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/50"
              )}
            >
              {done && !active ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}

              {active ? (
                <span className="absolute -inset-1 rounded-full border border-white/20" />
              ) : null}
            </button>

            {index < steps.length - 1 ? (
              <div className="relative mx-2 h-[2px] flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-white"
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
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-[22rem] w-[22rem] rounded-full bg-white/[0.05] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_30%,rgba(255,255,255,0.02))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.58),rgba(0,0,0,0.85))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="lg:grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.04fr_1fr] lg:gap-6">
          {/* ================= Mobile Top Hero ================= */}
          <div className="mb-4 lg:hidden">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-3">
                <PeakVelocityLogo />

                <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/85">
                  {progressPct}%
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                  <TypewriterText
                    text={`Βήμα ${currentStep.dbStep} από ${steps.length}`}
                    delay={120}
                    speed={24}
                  />
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                    <currentStep.icon className="h-5 w-5 text-white" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-xl font-extrabold leading-tight text-white">
                      <TypewriterText
                        text={currentStep.title}
                        delay={150}
                        speed={18}
                      />
                    </h1>
                    <p className="mt-1 text-sm text-white/70">
                      {currentStep.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-white/70">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-xs">{currentStep.helperText}</span>
                </div>

                <div className="mt-4">
                  <MobileStepRail
                    steps={steps}
                    currentIndex={currentIndex}
                    onGoToStep={handleGoToStep}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ================= Desktop Left Side ================= */}
          <div className="hidden lg:flex">
            <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <div className="absolute right-[-60px] top-[-60px] h-40 w-40 rounded-full bg-white/[0.06] blur-3xl" />
              <div className="absolute bottom-[-80px] left-[-40px] h-52 w-52 rounded-full bg-white/[0.04] blur-3xl" />

              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <PeakVelocityLogo />

                  <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
                    Progress {progressPct}%
                  </div>
                </div>

                <div className="mt-12 max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
                    <TypewriterText
                      text={`Βήμα ${currentStep.dbStep} από ${steps.length}`}
                      delay={120}
                      speed={22}
                    />
                  </p>

                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/15 bg-white text-black shadow-[0_14px_34px_rgba(255,255,255,0.15)]">
                      <currentStep.icon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <h1 className="text-4xl font-extrabold leading-tight text-white">
                        <TypewriterText
                          text={currentStep.title}
                          delay={150}
                          speed={16}
                        />
                      </h1>
                    </div>
                  </div>

                  <p className="mt-4 text-lg font-medium text-white/78">
                    {currentStep.subtitle}
                  </p>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                    {currentStep.description}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/80">
                      <Clock3 className="h-4 w-4" />
                      {currentStep.helperText}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/80">
                      <Sparkles className="h-4 w-4" />
                      {completedCount} ολοκληρωμένα βήματα
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mt-8">
                <DesktopStepRail
                  steps={steps}
                  currentIndex={currentIndex}
                  onGoToStep={handleGoToStep}
                />
              </div>
            </div>
          </div>

          {/* ================= Right Form Panel ================= */}
          <div className="flex">
            <div className="flex w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/82 shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              {/* Form header */}
              <div className="border-b border-white/8 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                        {currentStep.navTitle}
                      </span>
                      <span className="hidden sm:inline text-xs text-white/40">
                        Βήμα {currentStep.dbStep}/{steps.length}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">
                      Συμπλήρωσε το βήμα με καθαρά στοιχεία
                    </h2>

                    <p className="mt-1 text-sm leading-relaxed text-white/52">
                      Ό,τι βάζεις εδώ βοηθά το προφίλ σου να φαίνεται πιο σωστό,
                      πιο επαγγελματικό και πιο έτοιμο για κρατήσεις.
                    </p>
                  </div>

                  <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <currentStep.icon className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={false}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>

              {/* Form body */}
              <div className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentStep.key}
                    initial={{
                      opacity: 0,
                      x: direction > 0 ? 24 : -24,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: direction > 0 ? -18 : 18,
                      y: -6,
                    }}
                    transition={{
                      duration: 0.26,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.025] p-3 sm:p-4">
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
                    </div>
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {stepError ? (
                    <motion.div
                      key="wizard-error"
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
              </div>

              {/* Footer actions */}
              <div className="border-t border-white/8 px-4 py-4 sm:px-6 sm:py-5">
                {/* mobile current step rail again near actions */}
                <div className="mb-4 lg:hidden">
                  <MobileStepRail
                    steps={steps}
                    currentIndex={currentIndex}
                    onGoToStep={handleGoToStep}
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={currentIndex === 0 || saving}
                    className={cn(
                      "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-all",
                      currentIndex === 0 || saving
                        ? "cursor-not-allowed border-white/8 bg-white/[0.03] text-white/30"
                        : "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08] hover:border-white/15"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Προηγούμενο
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={saving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-black shadow-[0_12px_40px_rgba(255,255,255,0.16)] transition-all hover:scale-[1.01] hover:bg-zinc-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[190px]"
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

      <style>{`
        @keyframes pvFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}