"use client";

import React from "react";

export default function FieldCard({ icon: Icon, label, hint, children }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 h-10 w-10 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-300" />
        </div>

        <div>
          <div className="text-sm font-semibold text-white">{label}</div>
          {hint ? <div className="text-xs text-zinc-400 mt-1">{hint}</div> : null}
        </div>
      </div>

      {children}
    </div>
  );
}