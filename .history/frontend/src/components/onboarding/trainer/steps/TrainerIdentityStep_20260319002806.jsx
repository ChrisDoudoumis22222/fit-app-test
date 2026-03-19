"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  User2,
  MapPin,
  Briefcase,
  Plus,
  Award,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import FieldCard from "../FieldCard";
import {
  TRAINER_CATEGORIES,
  LOCATION_OPTIONS,
  ICON_BY_KEY,
  SPECIALTIES_BY_VALUE,
} from "../trainerOnboarding.shared";
import { cn, normalizeCategoryLabel } from "../trainerOnboarding.utils";
import { supabase } from "../../../supabaseClient"; // adjust path if needed

const MAX_SPECIALTIES = 4;

export default function TrainerIdentityStep({ form, setField, setForm }) {
  const [showAll, setShowAll] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [saveError, setSaveError] = useState("");

  const saveTimeoutRef = useRef(null);
  const lastSavedSnapshotRef = useRef("");

  const selectedCategories = useMemo(() => {
    if (Array.isArray(form?.specialties)) return form.specialties;
    if (Array.isArray(form?.specialty)) return form.specialty;
    if (form?.specialty) return [form.specialty];
    return [];
  }, [form?.specialties, form?.specialty]);

  const currentRoles = useMemo(() => {
    return Array.isArray(form?.roles) ? form.roles : [];
  }, [form?.roles]);

  const specialtyIconByValue = useMemo(() => {
    return Object.fromEntries(
      TRAINER_CATEGORIES.flatMap((category) => {
        const IconComp = ICON_BY_KEY?.[category.iconKey] || Briefcase;
        const roles = SPECIALTIES_BY_VALUE?.[category.value] || [];
        return roles.map((role) => [role, IconComp]);
      })
    );
  }, []);

  const selectedCategoryObjects = useMemo(() => {
    return selectedCategories
      .map((value) => TRAINER_CATEGORIES.find((c) => c.value === value))
      .filter(Boolean);
  }, [selectedCategories]);

  const rolesByCategory = useMemo(() => {
    return selectedCategoryObjects.map((category) => ({
      categoryValue: category.value,
      categoryLabel: normalizeCategoryLabel(category),
      categoryIconKey: category.iconKey,
      roles: [...new Set(SPECIALTIES_BY_VALUE?.[category.value] || [])],
    }));
  }, [selectedCategoryObjects]);

  const allowedRoles = useMemo(() => {
    return [...new Set(rolesByCategory.flatMap((group) => group.roles))];
  }, [rolesByCategory]);

  const toggleCategory = (value) => {
    setForm((prev) => {
      const current = Array.isArray(prev?.specialties)
        ? prev.specialties
        : Array.isArray(prev?.specialty)
        ? prev.specialty
        : prev?.specialty
        ? [prev.specialty]
        : [];

      const exists = current.includes(value);

      let nextSpecialties = current;

      if (exists) {
        nextSpecialties = current.filter((v) => v !== value);
      } else if (current.length < MAX_SPECIALTIES) {
        nextSpecialties = [...current, value];
      }

      return {
        ...prev,
        specialties: nextSpecialties,
        specialty: nextSpecialties[0] || null,
      };
    });
  };

  const toggleRole = (roleName) => {
    setForm((prev) => {
      const current = Array.isArray(prev?.roles) ? prev.roles : [];
      const exists = current.includes(roleName);

      return {
        ...prev,
        roles: exists
          ? current.filter((r) => r !== roleName)
          : [...current, roleName],
      };
    });
  };

  useEffect(() => {
    setForm((prev) => {
      const prevRoles = Array.isArray(prev?.roles) ? prev.roles : [];
      const cleanedRoles = prevRoles.filter((role) => allowedRoles.includes(role));

      if (cleanedRoles.length === prevRoles.length) return prev;

      return {
        ...prev,
        roles: cleanedRoles,
      };
    });
  }, [allowedRoles, setForm]);

  useEffect(() => {
    const normalizedExperience =
      form?.experience_years === "" ||
      form?.experience_years === null ||
      typeof form?.experience_years === "undefined"
        ? null
        : Number(form.experience_years);

    const payload = {
      full_name: form?.full_name?.trim() || null,
      location: form?.location || null,
      specialties: selectedCategories,
      specialty: selectedCategories[0] || null,
      roles: currentRoles,
      experience_years:
        Number.isFinite(normalizedExperience) && normalizedExperience >= 0
          ? normalizedExperience
          : null,
      role: "trainer",
      updated_at: new Date().toISOString(),
    };

    const snapshot = JSON.stringify({
      full_name: payload.full_name,
      location: payload.location,
      specialties: payload.specialties,
      specialty: payload.specialty,
      roles: payload.roles,
      experience_years: payload.experience_years,
      role: payload.role,
    });

    if (!form?.email) return;
    if (snapshot === lastSavedSnapshotRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState("saving");
        setSaveError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        let query = supabase.from("profiles").update(payload);

        if (user?.id) {
          query = query.eq("id", user.id);
        } else {
          query = query.eq("email", form.email);
        }

        const { error } = await query;

        if (error) throw error;

        lastSavedSnapshotRef.current = snapshot;
        setSaveState("saved");

        setTimeout(() => {
          setSaveState((prev) => (prev === "saved" ? "idle" : prev));
        }, 1500);
      } catch (err) {
        console.error("Profile autosave failed:", err);
        setSaveState("error");
        setSaveError(err?.message || "Αποτυχία αποθήκευσης");
      }
    }, 700);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    form?.email,
    form?.full_name,
    form?.location,
    form?.experience_years,
    selectedCategories,
    currentRoles,
  ]);

  const visibleCategories = showAll
    ? TRAINER_CATEGORIES
    : TRAINER_CATEGORIES.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex items-center justify-end">
        {saveState === "saving" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/75">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Αποθηκεύεται...
          </div>
        )}

        {saveState === "saved" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Αποθηκεύτηκε
          </div>
        )}

        {saveState === "error" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            {saveError || "Σφάλμα αποθήκευσης"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldCard
          icon={User2}
          label="Ονοματεπώνυμο"
          hint="Αυτό θα εμφανίζεται στο προφίλ σου"
        >
          <input
            type="text"
            value={form.full_name || ""}
            onChange={setField("full_name")}
            placeholder="π.χ. Χρήστος Δουδούμης"
            autoComplete="name"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-white/30"
          />
        </FieldCard>

        <FieldCard icon={Mail} label="Email" hint="Το email του λογαριασμού σου">
          <input
            type="email"
            value={form.email || ""}
            readOnly
            className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white/70"
          />
        </FieldCard>
      </div>

      <FieldCard
        icon={MapPin}
        label="Περιοχή"
        hint="Η βασική περιοχή δραστηριοποίησής σου"
      >
        <select
          value={form.location || ""}
          onChange={setField("location")}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none transition focus:border-white/30"
        >
          {LOCATION_OPTIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </FieldCard>

      <FieldCard
        icon={Briefcase}
        label="Ρόλοι / Κατηγορίες"
        hint="Μπορείς να επιλέξεις περισσότερες από μία"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCategories.map((category) => {
              const active = selectedCategories.includes(category.value);
              const IconComp = ICON_BY_KEY?.[category.iconKey] || Briefcase;

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => toggleCategory(category.value)}
                  className={cn(
                    "relative rounded-2xl border p-4 text-left backdrop-blur-xl transition-all duration-300",
                    active
                      ? "border-white bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.15)]"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                >
                  {active && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-black/10"
                          : "border border-white/10 bg-white/[0.05]"
                      )}
                    >
                      <IconComp className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold">
                        {normalizeCategoryLabel(category)}
                      </div>

                      <div
                        className={cn(
                          "mt-1 text-xs",
                          active ? "text-black/70" : "text-white/50"
                        )}
                      >
                        Επιλέξτε για να εμφανίζεται στο προφίλ σας
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {TRAINER_CATEGORIES.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Plus className="h-4 w-4" />
              {showAll ? "Λιγότερα" : "Δες περισσότερα"}
            </button>
          )}

          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedCategories.map((cat) => {
                const found = TRAINER_CATEGORIES.find((c) => c.value === cat);
                const label = found ? normalizeCategoryLabel(found) : cat;

                return (
                  <div
                    key={cat}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black"
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FieldCard>

      <div className="space-y-5 md:space-y-6">
        {rolesByCategory.length > 0 ? (
          rolesByCategory.map((group) => {
            const GroupIcon = ICON_BY_KEY?.[group.categoryIconKey] || Briefcase;

            return (
              <div key={group.categoryValue} className="-mx-4 px-4 md:mx-0 md:px-0">
                <div className="md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-900/70 md:p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <GroupIcon className="h-4 w-4 text-white/80" />
                    <h3 className="text-sm font-semibold text-white">
                      Εξειδικεύσεις · {group.categoryLabel}
                    </h3>
                  </div>

                  <p className="mb-3 text-sm text-zinc-400">
                    Διάλεξε όσα σε εκφράζουν
                  </p>

                  {group.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {group.roles.map((roleName) => {
                        const active = currentRoles.includes(roleName);
                        const RoleIcon =
                          specialtyIconByValue?.[roleName] || GroupIcon || Briefcase;

                        return (
                          <button
                            key={`${group.categoryValue}-${roleName}`}
                            type="button"
                            onClick={() => toggleRole(roleName)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all",
                              active
                                ? "border-white bg-white text-black"
                                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                            )}
                          >
                            <RoleIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{roleName}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400 md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-4">
                      Δεν υπάρχουν διαθέσιμες εξειδικεύσεις για αυτή την κατηγορία.
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="-mx-4 px-4 md:mx-0 md:px-0">
            <div className="text-sm text-zinc-400 md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-4">
              Δεν υπάρχουν διαθέσιμες εξειδικεύσεις για τις κατηγορίες που έχουν
              επιλεγεί ακόμη.
            </div>
          </div>
        )}

        <div className="-mx-4 px-4 md:mx-0 md:px-0">
          <div className="md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-900/70 md:p-5">
            <div className="mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-white/80" />
              <h3 className="text-sm font-semibold text-white">
                Χρόνια εμπειρίας
              </h3>
            </div>

            <p className="mb-3 text-sm text-zinc-400">
              Προαιρετικό, αλλά ενισχύει το προφίλ σου
            </p>

            <input
              type="number"
              min="0"
              value={form.experience_years ?? ""}
              onChange={setField("experience_years")}
              placeholder="π.χ. 5"
              className="no-spinner w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}