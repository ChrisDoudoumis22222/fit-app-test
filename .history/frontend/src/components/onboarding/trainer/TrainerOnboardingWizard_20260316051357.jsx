"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import TrainerWizardHeader from "./TrainerWizardHeader";
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
        title: "Ταυτότητα",
        description: "Username, όνομα, περιοχή και ρόλος.",
        icon: User2,
      },
      {
        dbStep: 2,
        key: "contact",
        title: "Επικοινωνία",
        description: "Τηλέφωνο, bio και online παρουσία.",
        icon: Phone,
      },
      {
        dbStep: 3,
        key: "availability",
        title: "Ωράριο",
        description: "Δήλωσε ποιες μέρες και ώρες δουλεύεις.",
        icon: CalendarDays,
      },
      {
        dbStep: 4,
        key: "professional",
        title: "Εξειδίκευση",
        description: "Εξειδικεύσεις και εμπειρία.",
        icon: Briefcase,
      },
      {
        dbStep: 5,
        key: "credentials",
        title: "Πιστοποιήσεις",
        description: "Certifications και σύνδεσμος διπλώματος.",
        icon: Award,
      },
    ];
  }, []);

  const [form, setForm] = useState(() => buildInitialForm(initialProfile));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepError, setStepError] = useState("");

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

  const progressPct =
    steps.length <= 1
      ? 100
      : Math.round(((currentIndex + 1) / steps.length) * 100);

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

  const handleBack = async () => {
    if (currentIndex <= 0 || saving) return;

    const previousStep = steps[currentIndex - 1];
    setStepError("");

    if (onSaveProgress) {
      await onSaveProgress(buildSubmitData(form), previousStep.dbStep);
    }

    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = async () => {
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

    if (onSaveProgress) {
      await onSaveProgress(data, nextStep.dbStep);
    }

    setCurrentIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  if (!currentStep) return null;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
        <TrainerWizardHeader
          currentStep={currentStep}
          currentIndex={currentIndex}
          steps={steps}
          progressPct={progressPct}
        />

        <div className="px-5 sm:px-7 py-6 sm:py-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {currentStep.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {currentStep.description}
                </p>
              </div>

              {currentStep.key === "identity" ? (
                <TrainerIdentityStep
                  form={form}
                  setField={setField}
                  setForm={setForm}
                />
              ) : null}

              {currentStep.key === "contact" ? (
                <TrainerContactStep
                  form={form}
                  setField={setField}
                  setForm={setForm}
                />
              ) : null}

              {currentStep.key === "availability" ? (
                <TrainerAvailabilityStep
                  form={form}
                  addAvailabilitySlot={addAvailabilitySlot}
                  removeAvailabilitySlot={removeAvailabilitySlot}
                  updateAvailabilitySlot={updateAvailabilitySlot}
                />
              ) : null}

              {currentStep.key === "professional" ? (
                <TrainerProfessionalStep
                  form={form}
                  setField={setField}
                  toggleRole={toggleRole}
                />
              ) : null}

              {currentStep.key === "credentials" ? (
                <TrainerCredentialsStep form={form} setField={setField} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {stepError ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {stepError}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentIndex === 0 || saving}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium border transition-all",
                currentIndex === 0 || saving
                  ? "border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Πίσω
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Αποθήκευση...
                </>
              ) : isLastStep ? (
                <>
                  Ολοκλήρωση
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Συνέχεια
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}