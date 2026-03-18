"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function asNumber(value, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
  const editorRef = useRef(null);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 50,
    startPosY: 50,
  });

  const posX = useMemo(
    () => clamp(asNumber(form?.avatar_position_x, 50), 0, 100),
    [form?.avatar_position_x]
  );

  const posY = useMemo(
    () => clamp(asNumber(form?.avatar_position_y, 50), 0, 100),
    [form?.avatar_position_y]
  );

  const zoom = useMemo(
    () => clamp(asNumber(form?.avatar_zoom, 1), 1, 2.6),
    [form?.avatar_zoom]
  );

  const updateField = (key, value) => {
    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

  const resetAdjustments = () => {
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
    updateField("avatar_zoom", 1);
  };

  const beginDrag = (clientX, clientY) => {
    dragRef.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      startPosX: posX,
      startPosY: posY,
    };
  };

  const updateDrag = (clientX, clientY) => {
    if (!dragRef.current.dragging || !editorRef.current) return;

    const rect = editorRef.current.getBoundingClientRect();
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;

    const moveFactorX = 100 / Math.max(rect.width, 1);
    const moveFactorY = 100 / Math.max(rect.height, 1);

    const nextX = clamp(
      dragRef.current.startPosX - dx * moveFactorX * 0.7,
      0,
      100
    );
    const nextY = clamp(
      dragRef.current.startPosY - dy * moveFactorY * 0.7,
      0,
      100
    );

    updateField("avatar_position_x", Number(nextX.toFixed(2)));
    updateField("avatar_position_y", Number(nextY.toFixed(2)));
  };

  const endDrag = () => {
    dragRef.current.dragging = false;
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

    const onMouseMove = (e) => updateDrag(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      updateDrag(t.clientX, t.clientY);
    };
    const onTouchEnd = () => endDrag();
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, posX, posY, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <div className="absolute left-1/2 top-1/2 w-[calc(100%-20px)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] border border-white/10 bg-zinc-950 shadow-[0_35px_120px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-6">
          <div>
            <h3 className="text-base font-semibold text-white">
              Ρύθμιση avatar
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Κάνε drag πάνω στην εικόνα και χρησιμοποίησε μόνο το zoom.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-[minmax(0,1fr)_220px] md:gap-6 md:p-6">
          <div className="space-y-4">
            <div
              ref={editorRef}
              onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
              onTouchStart={(e) => {
                const t = e.touches?.[0];
                if (!t) return;
                beginDrag(t.clientX, t.clientY);
              }}
              className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-white/10 bg-black select-none touch-none cursor-grab active:cursor-grabbing"
            >
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Avatar editor preview"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                    style={{
                      objectPosition: `${posX}% ${posY}%`,
                      transform: `scale(${zoom})`,
                      transformOrigin: "center center",
                    }}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-black/18" />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-[64%] w-[64%] rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm" />
                  </div>

                  <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                    Drag για μετακίνηση
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Δεν υπάρχει εικόνα
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Zoom</span>
                <span className="text-xs text-zinc-400">
                  {zoom.toFixed(2)}x
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "avatar_zoom",
                      Number(clamp(zoom - 0.1, 1, 2.6).toFixed(2))
                    )
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <input
                  type="range"
                  min="1"
                  max="2.6"
                  step="0.01"
                  value={zoom}
                  onChange={(e) =>
                    updateField("avatar_zoom", Number(e.target.value))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "avatar_zoom",
                      Number(clamp(zoom + 0.1, 1, 2.6).toFixed(2))
                    )
                  }
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 justify-end">
            <button
              type="button"
              onClick={resetAdjustments}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

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
  );
}