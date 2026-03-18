"use client";

import React from "react";
import { Phone, FileText } from "lucide-react";

export default function TrainerContactStep({ form, setField }) {
  return (
    <div className="grid grid-cols-1 gap-5">
      {/* Phone */}
      <div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white">Τηλέφωνο</h3>
          </div>

          <p className="mb-3 text-sm text-zinc-400">
            Προαιρετικό, αλλά βοηθάει στην επικοινωνία
          </p>

          <input
            type="text"
            value={form.phone}
            onChange={setField("phone")}
            placeholder="π.χ. 69XXXXXXXX"
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white">Bio</h3>
          </div>

          <p className="mb-3 text-sm text-zinc-400">
            Γράψε λίγα λόγια για το στυλ προπόνησης και το background σου
          </p>

          <textarea
            value={form.bio}
            onChange={setField("bio")}
            rows={7}
            placeholder="Πες λίγα λόγια για την εμπειρία σου, τον τρόπο που δουλεύεις και τι μπορεί να περιμένει ένας πελάτης από εσένα..."
            className="min-h-[170px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none resize-none transition focus:border-white/30 md:min-h-[220px]"
          />
        </div>
      </div>
    </div>
  );
}