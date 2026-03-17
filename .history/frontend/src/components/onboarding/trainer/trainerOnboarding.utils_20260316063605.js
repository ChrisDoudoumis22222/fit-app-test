"use client";

import { LOCATION_OPTIONS, normalizeCerts } from "../../trainer-detail/shared";

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
  return {
    username: profile?.username || "",
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
      : String(profile?.certifications || ""),
    diploma_url: profile?.diploma_url || "",
    is_online: Boolean(profile?.is_online),
    availabilityByDay: buildAvailabilityByDay(profile?.trainer_availability || []),
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
  const exp = String(form.experience_years || "").trim();

  return {
    profilePayload: {
      username: form.username.trim() || null,
      full_name: form.full_name.trim() || null,
      location: form.location || "Όλες οι πόλεις",
      phone: form.phone.trim() || null,
      bio: form.bio.trim() || null,
      specialty: form.specialty || null,
      roles: Array.isArray(form.roles) ? form.roles : [],
      experience_years: exp === "" ? null : Number(exp),
      certifications: normalizeCerts(form.certifications_text),
      diploma_url: form.diploma_url.trim() || null,
      is_online: Boolean(form.is_online),
    },
    availabilityRows: buildAvailabilityRows(form.availabilityByDay),
  };
}

export function validateWizardStep({ currentStep, form }) {
  if (!currentStep) return "Δεν βρέθηκε βήμα.";

  if (currentStep.key === "identity") {
    if (!form.username.trim()) {
      return "Συμπλήρωσε username.";
    }

    if (form.username.trim().length < 3) {
      return "Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες.";
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(form.username.trim())) {
      return "Το username μπορεί να περιέχει μόνο γράμματα, αριθμούς, τελεία, παύλα ή underscore.";
    }

    if (!form.full_name.trim()) {
      return "Συμπλήρωσε το ονοματεπώνυμό σου.";
    }

    if (!LOCATION_OPTIONS.includes(form.location)) {
      return "Επίλεξε μία έγκυρη πόλη.";
    }

    if (!form.specialty) {
      return "Επίλεξε ρόλο / κατηγορία.";
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
    const exp = String(form.experience_years || "").trim();

    if (exp !== "" && (!Number.isFinite(Number(exp)) || Number(exp) < 0)) {
      return "Τα χρόνια εμπειρίας πρέπει να είναι έγκυρος αριθμός.";
    }
  }

  if (currentStep.key === "credentials") {
    if (
      form.diploma_url.trim() &&
      !/^https?:\/\//i.test(form.diploma_url.trim())
    ) {
      return "Το diploma URL πρέπει να ξεκινά με http:// ή https://";
    }
  }

  return "";
}