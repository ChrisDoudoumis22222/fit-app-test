"use client";

import React from "react";
import { Award, FileText } from "lucide-react";
import FieldCard from "../FieldCard";

export default function TrainerCredentialsStep({ form, setField }) {
  return (
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
  );
}