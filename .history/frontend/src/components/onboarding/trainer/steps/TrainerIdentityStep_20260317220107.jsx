"use client";

import React, { useMemo, useState } from "react";
import { Mail, User2, MapPin, Briefcase, Plus } from "lucide-react";
import FieldCard from "../FieldCard";
import {
  TRAINER_CATEGORIES,
  LOCATION_OPTIONS,
  ICON_BY_KEY,
} from "../trainerOnboarding.shared";
import {
  cn,
  normalizeCategoryLabel,
} from "../trainerOnboarding.utils";

const MAX_SPECIALTIES = 4;

export default function TrainerIdentityStep({ form, setField, setForm }) {
  const [showAll, setShowAll] = useState(false);

  const selectedCategories = useMemo(() => {
    if (Array.isArray(form?.specialties)) return form.specialties;
    if (Array.isArray(form?.specialty)) return form.specialty;
    if (form?.specialty) return [form.specialty];
    return [];
  }, [form?.specialties, form?.specialty]);

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
      } else {
        // block silently above 4 selected
        nextSpecialties = current;
      }

      return {
        ...prev,
        specialties: nextSpecialties,
        specialty: nextSpecialties[0] || null, // legacy fallback
      };
    });
  };

  const visibleCategories = showAll
    ? TRAINER_CATEGORIES
    : TRAINER_CATEGORIES.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* ---------------- NAME + EMAIL ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-white/30 transition"
          />
        </FieldCard>

        <FieldCard icon={Mail} label="Email" hint="Το email του λογαριασμού σου">
          <input
            type="email"
            value={form.email || ""}
            readOnly
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white/70 cursor-not-allowed"
          />
        </FieldCard>
      </div>

      {/* ---------------- LOCATION ---------------- */}
      <FieldCard
        icon={MapPin}
        label="Περιοχή"
        hint="Η βασική περιοχή δραστηριοποίησής σου"
      >
        <select
          value={form.location || ""}
          onChange={setField("location")}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-white/30 transition"
        >
          {LOCATION_OPTIONS.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </FieldCard>

      {/* ---------------- CATEGORIES ---------------- */}
      <FieldCard
        icon={Briefcase}
        label="Ρόλοι / Κατηγορίες"
        hint="Μπορείς να επιλέξεις περισσότερες από μία"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleCategories.map((category) => {
              const active = selectedCategories.includes(category.value);
              const IconComp = ICON_BY_KEY[category.iconKey] || Briefcase;

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => toggleCategory(category.value)}
                  className={cn(
                    "relative text-left rounded-2xl p-4 transition-all duration-300 border backdrop-blur-xl",
                    active
                      ? "border-white bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.15)]"
                      : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                >
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        active
                          ? "bg-black/10"
                          : "bg-white/[0.05] border border-white/10"
                      )}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold">
                        {normalizeCategoryLabel(category)}
                      </div>

                      <div
                        className={cn(
                          "text-xs mt-1",
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
              className="w-full text-sm font-medium text-white/70 hover:text-white transition flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-white/[0.05]"
            >
              <Plus className="w-4 h-4" />
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
                    className="px-3 py-1 rounded-full text-xs bg-white text-black font-medium"
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FieldCard>
    </div>
  );
}