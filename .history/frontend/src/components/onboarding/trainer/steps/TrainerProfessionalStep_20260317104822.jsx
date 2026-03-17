"use client";

import React, { useMemo } from "react";
import { Briefcase, Award } from "lucide-react";
import FieldCard from "../FieldCard";
import { SPECIALTIES_BY_VALUE } from "../trainerOnboarding.shared";
import { cn } from "../trainerOnboarding.utils";

export default function TrainerProfessionalStep({
  form,
  setField,
  toggleRole,
}) {
  const currentSpecialties = useMemo(() => {
    return SPECIALTIES_BY_VALUE[form.specialty] || [];
  }, [form.specialty]);

  return (
    <div className="grid grid-cols-1 gap-4">
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
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4 text-sm text-zinc-400">
          Δεν υπάρχουν διαθέσιμες εξειδικεύσεις για αυτή την κατηγορία ακόμη.
        </div>
      )}

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
  );
}