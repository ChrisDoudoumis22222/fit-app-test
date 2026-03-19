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

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function resolveAvailabilityMode(source, rows = []) {
  if (
    source?.availability_mode === "online" ||
    source?.availability_mode === "in_person"
  ) {
    return source.availability_mode;
  }

  if (Array.isArray(rows) && rows.some((row) => Boolean(row?.is_online))) {
    return "online";
  }

  if (typeof source?.is_online === "boolean") {
    return source.is_online ? "online" : "in_person";
  }

  return "in_person";
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

  const trainerAvailability = Array.isArray(profile?.trainer_availability)
    ? profile.trainer_availability
    : [];

  const availabilityMode = resolveAvailabilityMode(
    profile,
    trainerAvailability
  );

  return {
    email: profile?.email || "",
    full_name: profile?.full_name || "",
    location: safeLocation,
    phone: profile?.phone || "",
    bio: profile?.bio || "",

    role: profile?.role || "trainer",

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
    diploma_name: profile?.diploma_name || "",
    diploma_preview_url: profile?.diploma_preview_url || "",
    diploma_file: null,
    diploma_ready: false,

    is_online: availabilityMode === "online",
    availability_mode: availabilityMode,
    offline_location: profile?.offline_location || "",
    online_link: profile?.online_link || "",

    availabilityByDay: buildAvailabilityByDay(trainerAvailability),

    avatar_url: profile?.avatar_url || "",
    avatar_path: profile?.avatar_path || "",
    avatar_preview_url: profile?.avatar_preview_url || profile?.avatar_url || "",
    avatar_position_x: asNumber(profile?.avatar_position_x, 50),
    avatar_position_y: asNumber(profile?.avatar_position_y, 50),
    avatar_zoom: asNumber(profile?.avatar_zoom, 1),
    avatar_file: null,
    avatar_ready: Boolean(profile?.avatar_url),

    onboarding_step: Number(profile?.onboarding_step || 1),
    onboarding_completed: Boolean(profile?.onboarding_completed),
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
  const safeAvatarUrl = String(form?.avatar_url || "").trim();
  const safeOfflineLocation = String(form?.offline_location || "").trim();
  const safeOnlineLink = String(form?.online_link || "").trim();

  const specialties = uniqueStrings([
    ...normalizeStringArray(form?.specialties),
    ...normalizeStringArray(form?.specialty),
  ]);

  const roles = normalizeStringArray(form?.roles);

  const availabilityRows = buildAvailabilityRows(form?.availabilityByDay);
  const availabilityMode = resolveAvailabilityMode(form, availabilityRows);
  const isOnline = availabilityMode === "online";

  return {
    profilePayload: {
      email: safeEmail || null,
      full_name: safeFullName || null,
      location: form?.location || "Όλες οι πόλεις",
      phone: safePhone || null,
      bio: safeBio || null,

      role: "trainer",

      specialty: specialties[0] || null,
      specialties,
      roles,

      experience_years: exp === "" ? null : Number(exp),
      certifications: normalizeCerts(form?.certifications_text),
      diploma_url: safeDiplomaUrl || null,

      is_online: isOnline,
      offline_location: isOnline ? null : safeOfflineLocation || null,
      online_link: isOnline ? safeOnlineLink || null : null,

      avatar_url: safeAvatarUrl || null,
    },

    availabilityRows,

    avatarMeta: {
      avatar_url: safeAvatarUrl || null,
      avatar_path: form?.avatar_path || "",
      avatar_preview_url: form?.avatar_preview_url || "",
      avatar_position_x: asNumber(form?.avatar_position_x, 50),
      avatar_position_y: asNumber(form?.avatar_position_y, 50),
      avatar_zoom: asNumber(form?.avatar_zoom, 1),
    },
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
    const availabilityMode = resolveAvailabilityMode(form, availabilityRows);
    const offlineLocation = String(form?.offline_location || "").trim();
    const onlineLink = String(form?.online_link || "").trim();

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

    if (availabilityMode === "in_person" && !offlineLocation) {
      return "Συμπλήρωσε την τοποθεσία για τα δια ζώσης μαθήματα.";
    }

    if (availabilityMode === "online" && !onlineLink) {
      return "Συμπλήρωσε το online link για τα online μαθήματα.";
    }

    if (onlineLink && !/^https?:\/\//i.test(onlineLink)) {
      return "Το online link πρέπει να ξεκινά με http:// ή https://";
    }
  }

  if (currentStep.key === "photoProfile") {
    const hasAvatar = Boolean(
      form?.avatar_file ||
        form?.avatar_ready ||
        isNonEmptyString(form?.avatar_url) ||
        isNonEmptyString(form?.avatar_preview_url) ||
        isNonEmptyString(form?.avatar_path)
    );

    if (!hasAvatar) {
      return "Ανέβασε φωτογραφία προφίλ για να συνεχίσεις.";
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