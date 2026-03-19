"use client";

import { LOCATION_OPTIONS, normalizeCerts } from "./trainerOnboarding.shared";

export const WEEKDAYS = [
  { value: "monday", label: "Δευτέρα" },
  { value: "tuesday", label: "Τρίτη" },
  { value: "wednesday", label: "Τετάρτη" },
  { value: "thursday", label: "Πέμπτη" },
  { value: "friday", label: "Παρασκευή" },
  { value: "saturday", label: "Σάββατο" },
  { value: "sunday", label: "Κυριακή" },
];

export const cn = (...classes) => classes.filter(Boolean).join(" ");

export function normalizeCategoryLabel(category) {
  return (
    category?.label ||
    category?.title ||
    category?.name ||
    category?.value ||
    "Κατηγορία"
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(isNonEmptyString).map((v) => v.trim()))];
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }

  if (isNonEmptyString(value)) {
    const trimmed = value.trim();

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? uniqueStrings(parsed) : [trimmed];
      } catch {
        return [trimmed];
      }
    }

    if (trimmed.includes(",")) {
      return uniqueStrings(trimmed.split(","));
    }

    return [trimmed];
  }

  return [];
}

export function normalizeTimeString(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 5);
}

export function createEmptySlot() {
  return {
    start_time: "09:00",
    end_time: "17:00",
    is_online: false,
  };
}

export function buildAvailabilityByDay(rows = []) {
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

export function buildInitialForm(profile) {
  const specialties = uniqueStrings([
    ...normalizeStringArray(profile?.specialties),
    ...normalizeStringArray(profile?.specialty),
  ]);

  const roles = normalizeStringArray(profile?.roles);

  const safeLocation = LOCATION_OPTIONS.includes(profile?.location)
    ? profile.location
    : "Όλες οι πόλεις";

  return {
    email: profile?.email || "",
    full_name: profile?.full_name || "",
    location: safeLocation,
    phone: profile?.phone || "",
    bio: profile?.bio || "",

    // legacy + multi-select support
    specialty: specialties[0] || "",
    specialties,
    roles,

    experience_years:
      profile?.experience_years === null ||
      profile?.experience_years === undefined
        ? ""
        : String(profile.experience_years),

    certifications_text: Array.isArray(profile?.certifications)
      ? profile.certifications.join("\n")
      : String(profile?.certifications || ""),

    diploma_url: profile?.diploma_url || "",
    is_online: Boolean(profile?.is_online),

    availabilityByDay: buildAvailabilityByDay(
      profile?.trainer_availability || []
    ),
  };
}

export function buildAvailabilityRows(availabilityByDay) {
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

export function buildSubmitData(form) {
  const exp = String(form?.experience_years || "").trim();
  const safeEmail = String(form?.email || "").trim();
  const safeFullName = String(form?.full_name || "").trim();
  const safePhone = String(form?.phone || "").trim();
  const safeBio = String(form?.bio || "").trim();
  const safeDiplomaUrl = String(form?.diploma_url || "").trim();

  const specialties = uniqueStrings([
    ...normalizeStringArray(form?.specialties),
    ...normalizeStringArray(form?.specialty),
  ]);

  const roles = normalizeStringArray(form?.roles);

  return {
    profilePayload: {
      email: safeEmail || null,
      full_name: safeFullName || null,
      location: form?.location || "Όλες οι πόλεις",
      phone: safePhone || null,
      bio: safeBio || null,

      // IMPORTANT
      specialty: specialties[0] || null,
      specialties,
      roles,

      role: "trainer",
      experience_years: exp === "" ? null : Number(exp),
      certifications: normalizeCerts(form?.certifications_text),
      diploma_url: safeDiplomaUrl || null,
      is_online: Boolean(form?.is_online),
    },
    availabilityRows: buildAvailabilityRows(form?.availabilityByDay),
  };
}

export function validateWizardStep({ currentStep, form }) {
  if (!currentStep) return "Δεν βρέθηκε βήμα.";

  if (currentStep.key === "identity") {
    const email = String(form?.email || "").trim();
    const fullName = String(form?.full_name || "").trim();
    const specialties = uniqueStrings([
      ...normalizeStringArray(form?.specialties),
      ...normalizeStringArray(form?.specialty),
    ]);

    if (!email) {
      return "Συμπλήρωσε email.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Συμπλήρωσε έγκυρο email.";
    }

    if (!fullName) {
      return "Συμπλήρωσε το ονοματεπώνυμό σου.";
    }

    if (!LOCATION_OPTIONS.includes(form?.location)) {
      return "Επίλεξε μία έγκυρη πόλη.";
    }

    if (specialties.length === 0) {
      return "Επίλεξε τουλάχιστον έναν ρόλο / κατηγορία.";
    }
  }

  if (currentStep.key === "contact") {
    const bio = String(form?.bio || "").trim();

    if (!bio || bio.length < 20) {
      return "Γράψε ένα μικρό bio τουλάχιστον 20 χαρακτήρων.";
    }
  }

  if (currentStep.key === "availability") {
    const availabilityRows = buildAvailabilityRows(form?.availabilityByDay);

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
    const exp = String(form?.experience_years || "").trim();

    if (exp !== "" && (!Number.isFinite(Number(exp)) || Number(exp) < 0)) {
      return "Τα χρόνια εμπειρίας πρέπει να είναι έγκυρος αριθμός.";
    }
  }

  if (currentStep.key === "credentials") {
    const diplomaUrl = String(form?.diploma_url || "").trim();

    if (diplomaUrl && !/^https?:\/\//i.test(diplomaUrl)) {
      return "Το diploma URL πρέπει να ξεκινά με http:// ή https://";
    }
  }

  return "";
}