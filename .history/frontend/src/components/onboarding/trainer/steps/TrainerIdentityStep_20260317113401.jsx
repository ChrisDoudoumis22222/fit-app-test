"use client";

import React from "react";
import { Mail, User2, MapPin, Briefcase } from "lucide-react";
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

export default function TrainerIdentityStep({ form, setField, setForm }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldCard
          icon={User2}
          label="Ονοματεπώνυμο"
          hint="Αυτό θα χρησιμοποιείται σαν όνομα εμφάνισης στο προφίλ σου"
        >
          <input
            type="text"
            value={form.full_name || ""}
            onChange={setField("full_name")}
            placeholder="π.χ. Χρήστος Δουδούμης"
            autoComplete="name"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-white/30"
          />
        </FieldCard>

        <FieldCard
          icon={Mail}
          label="Email"
          hint="Το email του λογαριασμού σου"
        >
          <input
            type="email"
            value={form.email || ""}
            onChange={setField("email")}
            placeholder="π.χ. chris@email.com"
            autoComplete="email"
            readOnly
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-white/30 opacity-80 cursor-not-allowed"
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
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-white/30"
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
        label="Ρόλος / Κατηγορία"
        hint="Διάλεξε τη βασική κατηγορία του προφίλ σου"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {TRAINER_CATEGORIES.map((category) => {
            const active = form.specialty === category.value;
            const IconComp = ICON_BY_KEY[category.iconKey] || Briefcase;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    specialty: category.value,
                    roles: [],
                  }))
                }
                className={cn(
                  "text-left rounded-2xl border p-4 transition-all",
                  active
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0",
                      active ? "bg-black/10" : "bg-zinc-900 border border-zinc-800"
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
                        active ? "text-black/70" : "text-zinc-400"
                      )}
                    >
                      Αυτός θα είναι ο βασικός ρόλος που θα βλέπει ο χρήστης.
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </FieldCard>
    </div>
  );
}