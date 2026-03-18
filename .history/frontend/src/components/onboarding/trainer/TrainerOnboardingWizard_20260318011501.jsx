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
  Camera,
  CalendarDays,
  Briefcase,
  Award,
  ArrowRight,
  Rocket,
  CheckCircle2,
  AlertTriangle,
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

/* -------------------- helpers -------------------- */

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasDiploma(form) {
  const hasFileObject = !!form?.diploma_file;
  const hasReadyFlag = !!form?.diploma_ready;
  const hasUrl = hasNonEmptyString(form?.diploma_url);
  const hasPreviewUrl = hasNonEmptyString(form?.diploma_preview_url);
  const hasName = hasNonEmptyString(form?.diploma_name);

  return (
    hasFileObject ||
    hasReadyFlag ||
    hasUrl ||
    hasPreviewUrl ||
    hasName
  );
}

function getStepValidationError(currentStep, form) {
  if (!currentStep) return "";

  if (currentStep.key === "credentials") {
    if (!hasDiploma(form)) {
      return "Ανέβασε το δίπλωμά σου για να ολοκληρώσεις το προφίλ σου.";
    }

    return "";
  }

  return (
    validateWizardStep({
      currentStep,
      form,
    }) || ""
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
        setForm={setForm}
        toggleRole={toggleRole}
      />
    );
  }

  if (stepKey === "credentials") {
    return (
      <TrainerCredentialsStep
        form={form}
        setField={setField}
        setForm={setForm}
      />
    );
  }

  return null;
}

function StaticBlobs() {
  return (
    <>
      <div className="absolute left-1/4 -top-40 w-96 aspect-square rounded-full bg-gradient-to-r from-zinc-600/10 to-gray-700/10 blur-2xl" />
      <div className="absolute -right-40 bottom-10 w-[30rem] aspect-square rounded-full bg-gradient-to-r from-gray-700/10 to-zinc-800/10 blur-2xl" />
    </>
  );
}

function CompletionPopup({ popup, onClose }) {
  return (
    <AnimatePresence>
      {popup ? (
        <motion.div
          key="completion-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-[28px] border border-zinc-700/70 bg-zinc-950/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                  popup.type === "success"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/25 bg-red-500/10 text-red-300"
                )}
              >
                {popup.type === "success" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-white">{popup.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {popup.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition",
                  popup.type === "success"
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-red-500 text-white hover:bg-red-400"
                )}
              >
                {popup.type === "success" ? "Τέλεια" : "ΟΚ"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
        key: "photoProfile",
        navTitle: "Φωτογραφία Προφίλ",
        navDescription: "Ανέβασε και ρύθμισε τη φωτογραφία σου.",
        title: "Δείξε τον καλύτερό σου εαυτό",
        subtitle:
          "Πρόσθεσε μια καθαρή φωτογραφία προφίλ για να εμπνέεις εμπιστοσύνη",
        icon: Camera,
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
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    !!initialProfile?.onboarding_completed
  );
  const [completionPopup, setCompletionPopup] = useState(null);

  useEffect(() => {
    setForm(buildInitialForm(initialProfile));
  }, [initialProfile]);

  useEffect(() => {
    setIsCompleted(!!initialProfile?.onboarding_completed);
  }, [initialProfile?.onboarding_completed]);

  useEffect(() => {
    if (initialProfile?.onboarding_completed) {
      setCurrentIndex(steps.length - 1);
      return;
    }

    const requestedDbStep = Number(initialProfile?.onboarding_step);

    if (!Number.isFinite(requestedDbStep)) {
      setCurrentIndex(0);
      return;
    }

    const safeDbStep = Math.min(
      Math.max(requestedDbStep, 1),
      steps[steps.length - 1].dbStep
    );

    const idx = steps.findIndex((step) => step.dbStep === safeDbStep);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [
    initialProfile?.onboarding_step,
    initialProfile?.onboarding_completed,
    steps,
  ]);

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;
  const actionBusy = saving || isSubmittingFinal;

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
      const roles = Array.isArray(prev.roles) ? prev.roles : [];
      const exists = roles.includes(roleName);

      return {
        ...prev,
        roles: exists
          ? roles.filter((item) => item !== roleName)
          : [...roles, roleName],
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

  const liveValidationError = useMemo(() => {
    return getStepValidationError(currentStep, form);
  }, [currentStep, form]);

  const nextDisabled = actionBusy || !!liveValidationError || isCompleted;

  useEffect(() => {
    if (!stepError) return;

    if (!liveValidationError) {
      setStepError("");
    } else {
      setStepError(liveValidationError);
    }
  }, [liveValidationError, stepError]);

  const showCompletionPopup = useCallback((type, title, message) => {
    setCompletionPopup({
      type,
      title,
      message,
    });
  }, []);

  const handleGoToStep = useCallback(
    async (idx) => {
      if (actionBusy) return;
      if (idx === currentIndex) return;
      if (idx > currentIndex) return;

      setDirection(idx < currentIndex ? -1 : 1);
      setStepError("");

      const targetStep = steps[idx];

      try {
        if (onSaveProgress && targetStep) {
          await onSaveProgress(buildSubmitData(form), targetStep.dbStep);
        }

        setCurrentIndex(idx);
      } catch (err) {
        setStepError(
          err?.message || "Δεν ήταν δυνατή η αποθήκευση της προόδου."
        );
      }
    },
    [actionBusy, currentIndex, steps, onSaveProgress, form]
  );

  const handleBack = useCallback(async () => {
    if (currentIndex <= 0 || actionBusy) return;

    setDirection(-1);
    setStepError("");

    const previousStep = steps[currentIndex - 1];

    try {
      if (onSaveProgress && previousStep) {
        await onSaveProgress(buildSubmitData(form), previousStep.dbStep);
      }

      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      setStepError(
        err?.message || "Δεν ήταν δυνατή η αποθήκευση της προόδου."
      );
    }
  }, [currentIndex, actionBusy, steps, onSaveProgress, form]);

  const handleNext = useCallback(async () => {
    if (actionBusy) return;

    const validationError = getStepValidationError(currentStep, form);

    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepError("");
    const data = buildSubmitData(form);

    if (isLastStep) {
      setIsSubmittingFinal(true);

      try {
        let result;

        if (typeof onComplete === "function") {
          result = await onComplete(data);
        } else {
          result = { ok: true };
        }

        if (result?.ok === false) {
          throw new Error(
            result?.message || "Η ολοκλήρωση του onboarding απέτυχε."
          );
        }

        setIsCompleted(true);

        showCompletionPopup(
          "success",
          "Το προφίλ σου ολοκληρώθηκε",
          result?.message ||
            "Το onboarding του trainer ολοκληρώθηκε επιτυχώς."
        );
      } catch (err) {
        const message =
          err?.message || "Κάτι πήγε στραβά κατά την ολοκλήρωση του onboarding.";

        setStepError(message);
        showCompletionPopup("error", "Αποτυχία ολοκλήρωσης", message);
      } finally {
        setIsSubmittingFinal(false);
      }

      return;
    }

    const nextStep = steps[currentIndex + 1];

    try {
      if (onSaveProgress && nextStep) {
        await onSaveProgress(data, nextStep.dbStep);
      }

      setDirection(1);
      setCurrentIndex((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (err) {
      setStepError(
        err?.message || "Δεν ήταν δυνατή η αποθήκευση της προόδου."
      );
    }
  }, [
    actionBusy,
    currentStep,
    form,
    isLastStep,
    onComplete,
    steps,
    currentIndex,
    onSaveProgress,
    showCompletionPopup,
  ]);

  if (!currentStep) return null;

  return (
    <>
      <div className="relative min-h-[100svh] overflow-hidden bg-zinc-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
        <StaticBlobs />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_24%,rgba(255,255,255,0.015))]" />
        </div>

        {/* ================= MOBILE ================= */}
        <div className="relative z-10 flex min-h-[100svh] flex-col lg:hidden">
          <div className="bg-black/30 backdrop-blur-xl">
            <div className="pt-3 pb-2">
              <TrainerOnboardingSteps
                mobile
                steps={steps}
                currentIndex={currentIndex}
                onGoToStep={handleGoToStep}
              />
            </div>
          </div>

          <main className="flex-1 px-4 pt-5 pb-32">
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    isCompleted && isLastStep
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-700/60 bg-zinc-800/60 text-zinc-300"
                  )}
                >
                  {isCompleted && isLastStep
                    ? "ΟΛΟΚΛΗΡΩΜΕΝΟ"
                    : currentStep.navTitle}
                </span>

                <span className="text-xs text-zinc-500">
                  Βήμα {currentStep.dbStep}/{steps.length}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold leading-tight text-white text-balance">
                {currentStep.title}
              </h1>

              <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-400">
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
                  className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {stepError}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </main>

          <div className="sticky bottom-0 z-20 border-t border-zinc-800/60 bg-zinc-900/95 px-4 pb-6 pt-4 backdrop-blur-xl safe-area-inset-bottom">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={handleBack}
                  disabled={currentIndex === 0 || actionBusy}
                  whileTap={
                    currentIndex === 0 || actionBusy ? {} : { scale: 0.97 }
                  }
                  className={cn(
                    "inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-all",
                    currentIndex === 0 || actionBusy
                      ? "cursor-not-allowed bg-zinc-800/50 text-zinc-600"
                      : "bg-zinc-800 text-zinc-100 active:bg-zinc-700"
                  )}
                >
                  <ChevronLeft className="h-5 w-5 shrink-0" />
                  <span>Προηγούμενο</span>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={nextDisabled}
                  whileTap={nextDisabled ? {} : { scale: 0.97 }}
                  className={cn(
                    "inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-all",
                    nextDisabled
                      ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                      : isLastStep
                      ? "bg-emerald-500 text-black active:bg-emerald-400"
                      : "bg-zinc-100 text-zinc-900 active:bg-white"
                  )}
                >
                  {actionBusy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                      <span>
                        {isSubmittingFinal ? "Ολοκλήρωση..." : "Αποθήκευση..."}
                      </span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <span>Ολοκληρώθηκε</span>
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    </>
                  ) : isLastStep ? (
                    <>
                      <span>Ολοκλήρωση</span>
                      <Rocket className="h-5 w-5 shrink-0" />
                    </>
                  ) : (
                    <>
                      <span>Συνέχεια</span>
                      <ArrowRight className="h-5 w-5 shrink-0" />
                    </>
                  )}
                </motion.button>
              </div>

              {liveValidationError && !actionBusy && !isCompleted ? (
                <p className="px-1 text-xs font-medium text-zinc-400">
                  {liveValidationError}
                </p>
              ) : null}
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
              <div
                className="rounded-3xl border border-zinc-700/50 bg-black/35 px-6 pb-6 pt-5
                           backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                          isCompleted && isLastStep
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700/60 bg-black/30 text-zinc-300"
                        )}
                      >
                        {isCompleted && isLastStep
                          ? "ΟΛΟΚΛΗΡΩΜΕΝΟ"
                          : currentStep.navTitle}
                      </span>

                      <span className="text-xs text-zinc-500">
                        Βήμα {currentStep.dbStep}/{steps.length}
                      </span>
                    </div>

                    <h2 className="mt-4 text-4xl font-extrabold leading-[1.04] text-white xl:text-5xl">
                      {currentStep.title}
                    </h2>

                    <p className="mt-3 text-base font-medium text-zinc-400 xl:text-lg">
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

              <div className="mt-8 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    disabled={currentIndex === 0 || actionBusy}
                    whileTap={
                      currentIndex === 0 || actionBusy
                        ? {}
                        : { scale: 0.985 }
                    }
                    className={cn(
                      "inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-semibold transition-all",
                      currentIndex === 0 || actionBusy
                        ? "cursor-not-allowed border border-zinc-800 bg-zinc-900/70 text-zinc-600"
                        : "border border-zinc-700/70 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800/80"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Προηγούμενο
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleNext}
                    disabled={nextDisabled}
                    whileTap={nextDisabled ? {} : { scale: 0.985 }}
                    className={cn(
                      "inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-semibold shadow-lg transition-all",
                      nextDisabled
                        ? "cursor-not-allowed bg-zinc-800 text-zinc-500 shadow-none"
                        : isLastStep
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "bg-gradient-to-r from-zinc-700 to-zinc-800 text-white hover:from-zinc-600 hover:to-zinc-700"
                    )}
                  >
                    {actionBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isSubmittingFinal ? "Ολοκλήρωση..." : "Αποθήκευση..."}
                      </>
                    ) : isCompleted ? (
                      <>
                        Ολοκληρώθηκε
                        <CheckCircle2 className="h-4 w-4" />
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
                  </motion.button>
                </div>

                {liveValidationError && !actionBusy && !isCompleted ? (
                  <p className="text-sm font-medium text-zinc-400">
                    {liveValidationError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompletionPopup
        popup={completionPopup}
        onClose={() => setCompletionPopup(null)}
      />
    </>
  );
}