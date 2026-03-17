"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  User2,
  MapPin,
  Phone,
  FileText,
  Briefcase,
  Award,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Plus,
  Trash2,
  Globe,
  Clock3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TRAINER_CATEGORIES as BASE_TRAINER_CATEGORIES,
  LOCATION_OPTIONS,
  SPECIALTIES_BY_VALUE,
} from "../trainer-detail/shared";

const TRAINER_CATEGORIES = BASE_TRAINER_CATEGORIES.map((category) => ({
  ...category,
  specialties: SPECIALTIES_BY_VALUE[category.value] || [],
}));

const WEEKDAYS = [
  { value: "monday", label: "Δευτέρα" },
  { value: "tuesday", label: "Τρίτη" },
  { value: "wednesday", label: "Τετάρτη" },
  { value: "thursday", label: "Πέμπτη" },
  { value: "friday", label: "Παρασκευή" },
  { value: "saturday", label: "Σάββατο" },
  { value: "sunday", label: "Κυριακή" },
];

const cn = (...classes) => classes.filter(Boolean).join(" ");

function normalizeCategoryLabel(category) {
  return (
    category?.label ||
    category?.title ||
    category?.name ||
    category?.value ||
    "Κατηγορία"
  );
}

function parseCertifications(value) {
  return String(value || "")
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTimeString(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 5);
}

function createEmptySlot() {
  return {
    start_time: "09:00",
    end_time: "17:00",
    is_online: false,
  };
}

function buildAvailabilityByDay(rows = []) {
  const initial = WEEKDAYS.reduce((acc, day) => {
    acc[day.value] = [];
    return acc;
  }, {});

  rows.forEach((row) => {
    const weekday = String(row?.weekday || "").toLowerCase();
    if (!initial[weekday]) return;

    initial[weekday].push({
      start_time: normalizeTimeString(row?.start_time) || "09:00",
      end_time: normalizeTimeString(row?.end_time) || "17:00",
      is_online: Boolean(row?.is_online),
    });
  });

  return initial;
}

function buildInitialForm(profile) {
  return {
    full_name: profile?.full_name || "",
    location: profile?.location || "Όλες οι πόλεις",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    specialty: profile?.specialty || "",
    roles: Array.isArray(profile?.roles) ? profile.roles : [],
    experience_years:
      profile?.experience_years === null ||
      profile?.experience_years === undefined
        ? ""
        : String(profile.experience_years),
    certifications_text: Array.isArray(profile?.certifications)
      ? profile.certifications.join("\n")
      : "",
    diploma_url: profile?.diploma_url || "",
    is_online: Boolean(profile?.is_online),
    availabilityByDay: buildAvailabilityByDay(profile?.trainer_availability || []),
  };
}

function buildAvailabilityRows(availabilityByDay) {
  const rows = [];

  WEEKDAYS.forEach((day) => {
    const slots = Array.isArray(availabilityByDay?.[day.value])
      ? availabilityByDay[day.value]
      : [];

    slots.forEach((slot) => {
      const start = normalizeTimeString(slot?.start_time);
      const end = normalizeTimeString(slot?.end_time);

      if (!start || !end) return;

      rows.push({
        weekday: day.value,
        start_time: start,
        end_time: end,
        is_online: Boolean(slot?.is_online),
      });
    });
  });

  return rows;
}

export default function TrainerOnboardingWizard({
  initialProfile,
  saving = false,
  onSaveProgress,
  onComplete,
}) {
  const isGoogleTrainer =
    initialProfile?.role === "trainer" &&
    initialProfile?.signup_provider === "google";

  const steps = useMemo(() => {
    const allSteps = [
      {
        dbStep: 1,
        key: "basic",
        title: "Βασικά στοιχεία",
        description: "Το όνομα και η τοποθεσία σου.",
        icon: User2,
        visible: isGoogleTrainer,
      },
      {
        dbStep: 2,
        key: "contact",
        title: "Επικοινωνία & παρουσία",
        description: "Τηλέφωνο, bio και online διαθεσιμότητα.",
        icon: Phone,
        visible: true,
      },
      {
        dbStep: 3,
        key: "availability",
        title: "Ωράριο προπονήσεων",
        description: "Δήλωσε ποιες μέρες και ώρες δουλεύεις.",
        icon: CalendarDays,
        visible: true,
      },
      {
        dbStep: 4,
        key: "professional",
        title: "Ειδικότητα",
        description: "Κατηγορία, εξειδικεύσεις και εμπειρία.",
        icon: Briefcase,
        visible: true,
      },
      {
        dbStep: 5,
        key: "credentials",
        title: "Πιστοποιήσεις",
        description: "Certifications και σύνδεσμος διπλώματος.",
        icon: Award,
        visible: true,
      },
    ];

    return allSteps.filter((step) => step.visible);
  }, [isGoogleTrainer]);

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

  const currentSpecialties = useMemo(() => {
    return SPECIALTIES_BY_VALUE[form.specialty] || [];
  }, [form.specialty]);

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

  const buildSubmitData = () => {
    const exp = String(form.experience_years || "").trim();

    return {
      profilePayload: {
        full_name: form.full_name.trim() || null,
        location: form.location || "Όλες οι πόλεις",
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        specialty: form.specialty || null,
        roles: Array.isArray(form.roles) ? form.roles : [],
        experience_years: exp === "" ? null : Number(exp),
        certifications: parseCertifications(form.certifications_text),
        diploma_url: form.diploma_url.trim() || null,
        is_online: Boolean(form.is_online),
      },
      availabilityRows: buildAvailabilityRows(form.availabilityByDay),
    };
  };

  const validateCurrentStep = () => {
    if (!currentStep) return "Δεν βρέθηκε βήμα.";

    if (currentStep.key === "basic") {
      if (!form.full_name.trim()) {
        return "Συμπλήρωσε το ονοματεπώνυμό σου.";
      }

      if (!LOCATION_OPTIONS.includes(form.location)) {
        return "Επίλεξε μία έγκυρη πόλη.";
      }
    }

    if (currentStep.key === "contact") {
      if (!form.bio.trim() || form.bio.trim().length < 20) {
        return "Γράψε ένα μικρό bio τουλάχιστον 20 χαρακτήρων.";
      }
    }

    if (currentStep.key === "availability") {
      const availabilityRows = buildAvailabilityRows(form.availabilityByDay);

      if (availabilityRows.length === 0) {
        return "Πρόσθεσε τουλάχιστον ένα διαθέσιμο ωράριο.";
      }

      for (const row of availabilityRows) {
        if (!row.start_time || !row.end_time) {
          return "Συμπλήρωσε ώρα έναρξης και λήξης για κάθε slot.";
        }

        if (row.start_time >= row.end_time) {
          return "Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.";
        }
      }
    }

    if (currentStep.key === "professional") {
      if (!form.specialty) {
        return "Διάλεξε κατηγορία επαγγελματία.";
      }
    }

    if (currentStep.key === "credentials") {
      const exp = String(form.experience_years || "").trim();
      if (exp !== "" && (!Number.isFinite(Number(exp)) || Number(exp) < 0)) {
        return "Τα χρόνια εμπειρίας πρέπει να είναι έγκυρος αριθμός.";
      }
    }

    return "";
  };

  const handleBack = async () => {
    if (currentIndex <= 0 || saving) return;

    const previousStep = steps[currentIndex - 1];
    setStepError("");

    if (onSaveProgress) {
      await onSaveProgress(buildSubmitData(), previousStep.dbStep);
    }

    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = async () => {
    if (saving) return;

    const validationError = validateCurrentStep();
    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepError("");

    const data = buildSubmitData();

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
        <div className="border-b border-zinc-800 px-5 sm:px-7 pt-6 pb-5 bg-gradient-to-b from-zinc-900 to-zinc-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                Trainer onboarding
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">
                Ολοκλήρωση προφίλ προπονητή
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-400">
                Συμπλήρωσε τα στοιχεία σου για να ενεργοποιηθεί σωστά το trainer
                profile σου.
              </p>
            </div>

            <div className="hidden sm:flex items-center justify-center h-14 min-w-14 rounded-2xl bg-white/5 border border-zinc-800">
              <currentStep.icon className="w-6 h-6 text-zinc-200" />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>
                Βήμα {currentIndex + 1} / {steps.length}
              </span>
              <span>{progressPct}%</span>
            </div>

            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 160, damping: 22 }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {steps.map((step, idx) => {
              const active = idx === currentIndex;
              const done = idx < currentIndex;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-2xl border px-3 py-3 transition-all",
                    active
                      ? "border-white/30 bg-white/10"
                      : done
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : "border-zinc-800 bg-zinc-900/70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <step.icon
                        className={cn(
                          "w-4 h-4",
                          active ? "text-white" : "text-zinc-500"
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        active
                          ? "text-white"
                          : done
                          ? "text-emerald-300"
                          : "text-zinc-400"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

              {currentStep.key === "basic" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCard
                    icon={User2}
                    label="Ονοματεπώνυμο"
                    hint="Πώς θα εμφανίζεσαι στην πλατφόρμα"
                  >
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={setField("full_name")}
                      placeholder="π.χ. Χρήστος Δουδούμης"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-white/30"
                    />
                  </FieldCard>

                  <FieldCard
                    icon={MapPin}
                    label="Περιοχή"
                    hint="Η βασική περιοχή δραστηριοποίησής σου"
                  >
                    <select
                      value={form.location}
                      onChange={setField("location")}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      {LOCATION_OPTIONS.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </FieldCard>
                </div>
              ) : null}

              {currentStep.key === "contact" ? (
                <div className="grid grid-cols-1 gap-4">
                  <FieldCard
                    icon={Phone}
                    label="Τηλέφωνο"
                    hint="Προαιρετικό, αλλά βοηθάει στην επικοινωνία"
                  >
                    <input
                      type="text"
                      value={form.phone}
                      onChange={setField("phone")}
                      placeholder="π.χ. 69XXXXXXXX"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-white/30"
                    />
                  </FieldCard>

                  <FieldCard
                    icon={FileText}
                    label="Bio"
                    hint="Γράψε λίγα λόγια για το στυλ προπόνησης και το background σου"
                  >
                    <textarea
                      value={form.bio}
                      onChange={setField("bio")}
                      rows={6}
                      placeholder="Πες λίγα λόγια για την εμπειρία σου, τον τρόπο που δουλεύεις και τι μπορεί να περιμένει ένας πελάτης από εσένα..."
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none resize-none focus:border-white/30"
                    />
                  </FieldCard>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4">
                    <label className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-white">
                          Παρέχω και online προπονήσεις
                        </div>
                        <div className="text-sm text-zinc-400 mt-1">
                          Ενεργοποίησέ το αν αναλαμβάνεις online συνεδρίες.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            is_online: !prev.is_online,
                          }))
                        }
                        className={cn(
                          "relative h-8 w-14 rounded-full transition-colors",
                          form.is_online ? "bg-white" : "bg-zinc-800"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-6 w-6 rounded-full transition-all",
                            form.is_online
                              ? "left-7 bg-black"
                              : "left-1 bg-white"
                          )}
                        />
                      </button>
                    </label>
                  </div>
                </div>
              ) : null}

              {currentStep.key === "availability" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="w-5 h-5 text-zinc-300 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Δήλωσε το εβδομαδιαίο σου πρόγραμμα
                        </div>
                        <div className="text-sm text-zinc-400 mt-1">
                          Μπορείς να βάλεις πολλά slots μέσα στην ίδια μέρα. Για
                          παράδειγμα 09:00–12:00 και 17:00–21:00.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {WEEKDAYS.map((day) => {
                      const slots = form.availabilityByDay?.[day.value] || [];

                      return (
                        <div
                          key={day.value}
                          className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4"
                        >
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                              <div className="text-base font-semibold text-white">
                                {day.label}
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {slots.length > 0
                                  ? `${slots.length} slot${slots.length > 1 ? "s" : ""}`
                                  : "Δεν έχει οριστεί ωράριο"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => addAvailabilitySlot(day.value)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600"
                            >
                              <Plus className="w-4 h-4" />
                              Προσθήκη
                            </button>
                          </div>

                          {slots.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-5 text-sm text-zinc-500">
                              Δεν έχεις βάλει ακόμη διαθέσιμη ώρα για τη{" "}
                              {day.label.toLowerCase()}.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {slots.map((slot, index) => (
                                <div
                                  key={`${day.value}_${index}`}
                                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                                    <div>
                                      <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                                        <Clock3 className="w-3.5 h-3.5" />
                                        Ώρα έναρξης
                                      </label>
                                      <input
                                        type="time"
                                        value={slot.start_time}
                                        onChange={(e) =>
                                          updateAvailabilitySlot(
                                            day.value,
                                            index,
                                            "start_time",
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none focus:border-white/30"
                                      />
                                    </div>

                                    <div>
                                      <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                                        <Clock3 className="w-3.5 h-3.5" />
                                        Ώρα λήξης
                                      </label>
                                      <input
                                        type="time"
                                        value={slot.end_time}
                                        onChange={(e) =>
                                          updateAvailabilitySlot(
                                            day.value,
                                            index,
                                            "end_time",
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none focus:border-white/30"
                                      />
                                    </div>

                                    <div className="flex sm:flex-col items-center justify-between sm:justify-end gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateAvailabilitySlot(
                                            day.value,
                                            index,
                                            "is_online",
                                            !slot.is_online
                                          )
                                        }
                                        className={cn(
                                          "inline-flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all",
                                          slot.is_online
                                            ? "border-white bg-white text-black"
                                            : "border-zinc-800 bg-zinc-900 text-zinc-300"
                                        )}
                                      >
                                        <Globe className="w-4 h-4" />
                                        Online
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeAvailabilitySlot(day.value, index)
                                        }
                                        className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-200 hover:bg-red-500/15"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Αφαίρεση
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {currentStep.key === "professional" ? (
                <div className="grid grid-cols-1 gap-4">
                  <FieldCard
                    icon={Briefcase}
                    label="Κατηγορία επαγγελματία"
                    hint="Η βασική επαγγελματική σου κατηγορία"
                  >
                    <select
                      value={form.specialty}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          specialty: nextValue,
                          roles: [],
                        }));
                      }}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      <option value="">Επίλεξε κατηγορία</option>
                      {TRAINER_CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {normalizeCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                  </FieldCard>

                  {currentSpecialties.length > 0 ? (
                    <FieldCard
                      icon={Briefcase}
                      label="Εξειδικεύσεις"
                      hint="Διάλεξε όσα σε εκφράζουν"
                    >
                      <div className="flex flex-wrap gap-2">
                        {currentSpecialties.map((roleName) => {
                          const active = form.roles.includes(roleName);

                          return (
                            <button
                              key={roleName}
                              type="button"
                              onClick={() => toggleRole(roleName)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm transition-all",
                                active
                                  ? "border-white bg-white text-black"
                                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                              )}
                            >
                              {roleName}
                            </button>
                          );
                        })}
                      </div>
                    </FieldCard>
                  ) : null}

                  <FieldCard
                    icon={Award}
                    label="Χρόνια εμπειρίας"
                    hint="Προαιρετικό, αλλά ενισχύει το προφίλ σου"
                  >
                    <input
                      type="number"
                      min="0"
                      value={form.experience_years}
                      onChange={setField("experience_years")}
                      placeholder="π.χ. 5"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-white/30"
                    />
                  </FieldCard>
                </div>
              ) : null}

              {currentStep.key === "credentials" ? (
                <div className="grid grid-cols-1 gap-4">
                  <FieldCard
                    icon={Award}
                    label="Certifications"
                    hint="Ένα ανά γραμμή ή με κόμμα"
                  >
                    <textarea
                      value={form.certifications_text}
                      onChange={setField("certifications_text")}
                      rows={5}
                      placeholder={"π.χ.\nACE Personal Trainer\nTRX Coach\nPilates Mat"}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none resize-none focus:border-white/30"
                    />
                  </FieldCard>

                  <FieldCard
                    icon={FileText}
                    label="Diploma URL"
                    hint="Βάλε link από storage ή δημόσιο αρχείο"
                  >
                    <input
                      type="text"
                      value={form.diploma_url}
                      onChange={setField("diploma_url")}
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-white/30"
                    />
                  </FieldCard>
                </div>
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

function FieldCard({ icon: Icon, label, hint, children }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 h-10 w-10 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-300" />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          {hint ? <div className="text-xs text-zinc-400 mt-1">{hint}</div> : null}
        </div>
      </div>

      {children}
    </div>
  );
}