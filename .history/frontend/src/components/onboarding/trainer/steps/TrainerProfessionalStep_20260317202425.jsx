"use client";

import React, { useMemo } from "react";
import { Briefcase, Award } from "lucide-react";
import { SPECIALTIES_BY_VALUE } from "../trainerOnboarding.shared";
import { cn } from "../trainerOnboarding.utils";

export default function TrainerProfessionalStep({
  form,
  setField,
  toggleRole,
}) {
  const currentSpecialties = useMemo(() => {
    const selectedCategories = Array.isArray(form.specialties)
      ? form.specialties
      : Array.isArray(form.specialty)
      ? form.specialty
      : form.specialty
      ? [form.specialty]
      : [];

    const allRoles = selectedCategories.flatMap(
      (category) => SPECIALTIES_BY_VALUE[category] || []
    );

    return [...new Set(allRoles)];
  }, [form.specialty, form.specialties]);

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Specialties */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-900/70 md:p-5">
          <div className="mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white">Εξειδικεύσεις</h3>
          </div>

          <p className="mb-3 text-sm text-zinc-400">
            Διάλεξε όσα σε εκφράζουν
          </p>

          {currentSpecialties.length > 0 ? (
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
          ) : (
            <div className="text-sm text-zinc-400 md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-950 md:px-4 md:py-4">
              Δεν υπάρχουν διαθέσιμες εξειδικεύσεις για τις κατηγορίες που έχουν
              επιλεγεί ακόμη.
            </div>
          )}
        </div>
      </div>

      {/* Experience */}
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
            value={form.experience_years}
            onChange={setField("experience_years")}
            placeholder="π.χ. 5"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
          />
        </div>
      </div>
    </div>
  );
}