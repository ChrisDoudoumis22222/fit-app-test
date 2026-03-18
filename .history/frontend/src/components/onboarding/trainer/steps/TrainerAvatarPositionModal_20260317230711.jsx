"use client";

import React, { useEffect, useMemo } from "react";
import { X, Move, RotateCcw } from "lucide-react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function asNumber(value, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, 0, 100) : fallback;
}

function fakeEvent(value) {
  return { target: { value } };
}

export default function TrainerAvatarPositionModal({
  open,
  onClose,
  imageUrl,
  form,
  setField,
}) {
  const posX = useMemo(
    () => asNumber(form?.avatar_position_x, 50),
    [form?.avatar_position_x]
  );

  const posY = useMemo(
    () => asNumber(form?.avatar_position_y, 50),
    [form?.avatar_position_y]
  );

  const updateField = (key, value) => {
    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

  const resetPosition = () => {
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
  };

  useEffect(() => {
    if (!open) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="absolute left-1/2 top-1/2 w-[calc(100%-24px)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4 md:px-6">
          <div>
            <h3 className="text-base font-semibold text-white">
              Ρύθμιση avatar
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Διάλεξε ακριβώς πού θα φαίνεται η εικόνα μέσα στο κάδρο.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-[360px_minmax(0,1fr)] md:gap-6 md:p-6">
          <div className="space-y-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-900">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${posX}% ${posY}%`,
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Δεν υπάρχει εικόνα
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
            </div>

            <button
              type="button"
              onClick={resetPosition}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reset θέσης
            </button>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Move className="h-4 w-4 text-white/80" />
                <h4 className="text-sm font-semibold text-white">
                  Position controls
                </h4>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-white">
                      Οριζόντια θέση
                    </label>
                    <span className="text-xs text-zinc-400">{posX}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={posX}
                    onChange={(e) =>
                      updateField("avatar_position_x", Number(e.target.value))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-white"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Αριστερά</span>
                    <span>Κέντρο</span>
                    <span>Δεξιά</span>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-white">
                      Κάθετη θέση
                    </label>
                    <span className="text-xs text-zinc-400">{posY}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={posY}
                    onChange={(e) =>
                      updateField("avatar_position_y", Number(e.target.value))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-white"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Πάνω</span>
                    <span>Κέντρο</span>
                    <span>Κάτω</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <h4 className="mb-3 text-sm font-semibold text-white">
                Quick presets
              </h4>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { label: "Center", x: 50, y: 50 },
                  { label: "Top", x: 50, y: 20 },
                  { label: "Bottom", x: 50, y: 80 },
                  { label: "Left", x: 25, y: 50 },
                  { label: "Right", x: 75, y: 50 },
                  { label: "Face up", x: 50, y: 30 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      updateField("avatar_position_x", preset.x);
                      updateField("avatar_position_y", preset.y);
                    }}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Έτοιμο
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}