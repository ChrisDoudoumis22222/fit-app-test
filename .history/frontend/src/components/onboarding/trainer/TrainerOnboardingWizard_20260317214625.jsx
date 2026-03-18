"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  ChevronLeft,
  Loader2,
  User2,
  Phone,
  CalendarDays,
  Briefcase,
  Award,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import TrainerIdentityStep from "./steps/TrainerIdentityStep";
import TrainerContactStep from "./steps/TrainerContactStep";
import TrainerAvailabilityStep from "./steps/TrainerAvailabilityStep";
import TrainerProfessionalStep from "./steps/TrainerProfessionalStep";
import TrainerCredentialsStep from "./steps/TrainerCredentialsStep";
import TrainerOnboardingSteps from "./TrainerOnboardingSteps";

import {
  cn,
  createEmptySlot,
  buildInitialForm,
  buildSubmitData,
  validateWizardStep,
} from "./trainerOnboarding.utils";

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
        icon: User2,
      },
      {
        dbStep: 2,
        key: "contact",
        navTitle: "Επικοινωνία",
        navDescription: "Τηλέφωνο, bio και online παρουσία.",
        title: "Κάνε το προφίλ σου πιο ανθρώπινο",
        subtitle: "Δώσε τρόπο επικοινωνίας και λίγη προσωπικότητα",
        icon: Phone,
      },
      {
        dbStep: 3,
        key: "availability",
        navTitle: "Ωράριο",
        navDescription: "Μέρες, ώρες και online διαθεσιμότητα.",
        title: "Οργάνωσε το πρόγραμμά σου",
        subtitle: "Δείξε καθαρά πότε είσαι διαθέσιμος",
        icon: CalendarDays,
      },
      {
        dbStep: 4,
        key: "professional",
        navTitle: "Εξειδίκευση",
        navDescription: "Εξειδικεύσεις, εμπειρία και ρόλοι.",
        title: "Ανάδειξε την επαγγελματική σου αξία",
        subtitle: "Πες ξεκάθαρα τι προσφέρεις και σε τι ξεχωρίζεις",
        icon: Briefcase,
      },
      {
        dbStep: 5,
        key: "credentials",
        navTitle: "Πιστοποιήσεις",
        navDescription: "Certifications και δίπλωμα.",
        title: "Κλείσε δυνατά με αξιοπιστία",
        subtitle: "Οι πιστοποιήσεις σου χτίζουν εμπιστοσύνη",
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
        [weekday]: [
          ...(prev.availabilityByDay?.[weekday] || []),
          createEmptySlot(),
        ],
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_26%,rgba(255,255,255,0.02))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.42),rgba(0,0,0,0.92))]" />
      </div>

      {/* ================= MOBILE FULL BLEED ================= */}
      <div className="relative z-10 flex min-h-[100svh] flex-col lg:hidden">
        <div className="bg-zinc-900/70 backdrop-blur-xl">
          <div className="pt-3 pb-2">
            <TrainerOnboardingSteps
              mobile
              steps={steps}
              currentIndex={currentIndex}
              onGoToStep={handleGoToStep}
            />
          </div>
        </div>

        <main className="flex-1 px-0 pt-3 pb-24">
          <div className="mb-3 bg-zinc-900/55 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-white/8 bg-zinc-800/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {currentStep.navTitle}
              </span>

              <span className="text-[11px] text-white/40">
                Βήμα {currentStep.dbStep}/{steps.length}
              </span>
            </div>

            <h1 className="mt-2.5 text-[1.28rem] font-extrabold leading-[1.08] text-white">
              {currentStep.title}
            </h1>

            <p className="mt-1.5 text-[12px] font-medium leading-5 text-white/60">
              {currentStep.subtitle}
            </p>
          </div>

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
              className="w-full"
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
                className="mx-4 mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {stepError}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <div className="sticky bottom-0 z-20 bg-zinc-900/85 px-3 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentIndex === 0 || saving}
              className={cn(
                "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border px-3 text-[13px] font-medium transition-all",
                currentIndex === 0 || saving
                  ? "cursor-not-allowed border-white/5 bg-zinc-800/70 text-white/25"
                  : "border-white/8 bg-zinc-800/90 text-white hover:bg-zinc-700/90"
              )}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
              Προηγούμενο
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-white/8 bg-zinc-700/95 px-3 text-[13px] font-bold text-white transition-all hover:bg-zinc-600/95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Αποθήκευση...
                </>
              ) : isLastStep ? (
                <>
                  Ολοκλήρωση
                  <Rocket className="h-4 w-4 shrink-0" />
                </>
              ) : (
                <>
                  Συνέχεια
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= DESKTOP ================= */}
      <div className="relative z-10 hidden min-h-[100svh] lg:block">
        <div className="w-full px-6 py-6 xl:px-8 xl:py-8">
          <TrainerOnboardingSteps
            steps={steps}
            currentIndex={currentIndex}
            onGoToStep={handleGoToStep}
          />

          <div className="mt-6">
            <div className="rounded-[28px] bg-zinc-900/45 px-5 pb-5 pt-5 backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/8 bg-zinc-800/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {currentStep.navTitle}
                    </span>
                    <span className="text-xs text-white/38">
                      Βήμα {currentStep.dbStep}/{steps.length}
                    </span>
                  </div>

                  <h2 className="mt-4 text-4xl font-extrabold leading-[1.04] text-white xl:text-5xl">
                    {currentStep.title}
                  </h2>

                  <p className="mt-3 text-base font-medium text-white/60 xl:text-lg">
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
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

            <div className="mt-8 rounded-[26px] bg-zinc-900/45 px-5 py-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentIndex === 0 || saving}
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-all",
                    currentIndex === 0 || saving
                      ? "cursor-not-allowed border-white/5 bg-zinc-800/70 text-white/25"
                      : "border-white/8 bg-zinc-800/90 text-white hover:bg-zinc-700/90"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Προηγούμενο
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex h-12 min-w-[210px] items-center justify-center gap-2 rounded-2xl border border-white/8 bg-zinc-700/95 px-5 text-sm font-bold text-white transition-all hover:bg-zinc-600/95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
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