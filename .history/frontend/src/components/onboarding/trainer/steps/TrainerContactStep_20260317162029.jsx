"use client";

import React from "react";
import { Phone, FileText } from "lucide-react";
import FieldCard from "../FieldCard";
import { cn } from "../trainerOnboarding.utils";

export default function TrainerContactStep({ form, setField, setForm }) {
  return (
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
                form.is_online ? "left-7 bg-black" : "left-1 bg-white"
              )}
            />
          </button>
        </label>
      </div>
    </div>
  );
}