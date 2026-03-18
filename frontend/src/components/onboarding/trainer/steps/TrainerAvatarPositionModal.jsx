"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

const CROP_SIZE = 58; // % of the square
const CROP_RADIUS = CROP_SIZE / 2;
const POSITION_MIN = 0;
const POSITION_MAX = 100;
const ZOOM_MIN = 1;
const ZOOM_MAX = 2.6;

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
    moved: false,
    startX: 0,
    startY: 0,
    startPosX: 50,
    startPosY: 50,
  });

  const [editorSize, setEditorSize] = useState(0);
  const [imageMeta, setImageMeta] = useState({
    naturalWidth: 1,
    naturalHeight: 1,
  });

  const posX = useMemo(
    () => clamp(asNumber(form?.avatar_position_x, 50), POSITION_MIN, POSITION_MAX),
    [form?.avatar_position_x]
  );

  const posY = useMemo(
    () => clamp(asNumber(form?.avatar_position_y, 50), POSITION_MIN, POSITION_MAX),
    [form?.avatar_position_y]
  );

  const zoom = useMemo(
    () => clamp(asNumber(form?.avatar_zoom, 1), ZOOM_MIN, ZOOM_MAX),
    [form?.avatar_zoom]
  );

  const updateField = (key, value) => {
    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

  const setPosition = (x, y) => {
    updateField(
      "avatar_position_x",
      Number(clamp(x, POSITION_MIN, POSITION_MAX).toFixed(2))
    );
    updateField(
      "avatar_position_y",
      Number(clamp(y, POSITION_MIN, POSITION_MAX).toFixed(2))
    );
  };

  const resetAdjustments = () => {
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
    updateField("avatar_zoom", 1);
  };

  const beginDrag = (clientX, clientY) => {
    dragRef.current = {
      dragging: true,
      moved: false,
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

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragRef.current.moved = true;
    }

    const moveFactorX = 100 / Math.max(rect.width, 1);
    const moveFactorY = 100 / Math.max(rect.height, 1);

    const nextX = dragRef.current.startPosX - dx * moveFactorX * 0.55;
    const nextY = dragRef.current.startPosY - dy * moveFactorY * 0.55;

    setPosition(nextX, nextY);
  };

  const endDrag = () => {
    dragRef.current.dragging = false;
  };

  const pointToPosition = (clientX, clientY) => {
    if (!editorRef.current) return;

    const rect = editorRef.current.getBoundingClientRect();
    const relX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const relY = clamp((clientY - rect.top) / rect.height, 0, 1);

    setPosition(relX * 100, relY * 100);
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
    if (!open || !editorRef.current) return;

    const updateSize = () => {
      const rect = editorRef.current?.getBoundingClientRect();
      setEditorSize(rect?.width || 0);
    };

    updateSize();

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(editorRef.current);
    window.addEventListener("resize", updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
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
      if (e.key === "Escape") {
        onClose?.();
        return;
      }

      const isArrow =
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown";

      if (!isArrow) return;

      e.preventDefault();

      const step = e.shiftKey ? 4 : 1.25;

      if (e.key === "ArrowLeft") setPosition(posX - step, posY);
      if (e.key === "ArrowRight") setPosition(posX + step, posY);
      if (e.key === "ArrowUp") setPosition(posX, posY - step);
      if (e.key === "ArrowDown") setPosition(posX, posY + step);
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
  }, [open, onClose, posX, posY]);

  if (!open) return null;

  const ratio =
    imageMeta.naturalWidth > 0 && imageMeta.naturalHeight > 0
      ? imageMeta.naturalWidth / imageMeta.naturalHeight
      : 1;

  let baseWidth = editorSize;
  let baseHeight = editorSize;

  if (ratio >= 1) {
    baseHeight = editorSize;
    baseWidth = editorSize * ratio;
  } else {
    baseWidth = editorSize;
    baseHeight = editorSize / ratio;
  }

  const renderWidth = baseWidth * zoom;
  const renderHeight = baseHeight * zoom;

  const overflowX = Math.max(0, renderWidth - editorSize);
  const overflowY = Math.max(0, renderHeight - editorSize);

  const offsetX = ((posX - 50) / 50) * (overflowX / 2);
  const offsetY = ((posY - 50) / 50) * (overflowY / 2);

  const imageStyle = {
    width: `${renderWidth}px`,
    height: `${renderHeight}px`,
    left: "50%",
    top: "50%",
    transform: `translate(calc(-50% - ${offsetX}px), calc(-50% - ${offsetY}px))`,
  };

  const outsideCircleMask = {
    WebkitMaskImage: `radial-gradient(
      circle at center,
      transparent 0%,
      transparent ${CROP_RADIUS - 0.8}%,
      rgba(0,0,0,0.12) ${CROP_RADIUS + 0.6}%,
      rgba(0,0,0,0.55) ${CROP_RADIUS + 3.2}%,
      black ${CROP_RADIUS + 8}%,
      black 100%
    )`,
    maskImage: `radial-gradient(
      circle at center,
      transparent 0%,
      transparent ${CROP_RADIUS - 0.8}%,
      rgba(0,0,0,0.12) ${CROP_RADIUS + 0.6}%,
      rgba(0,0,0,0.55) ${CROP_RADIUS + 3.2}%,
      black ${CROP_RADIUS + 8}%,
      black 100%
    )`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  };

  return (
    <div className="fixed inset-0 z-[200]">
      <button
        type="button"
        aria-label="Close modal overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <div className="absolute left-1/2 top-1/2 w-[calc(100%-20px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-white/10 bg-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
          <div className="pr-4">
            <h3 className="text-[28px] leading-none font-semibold text-white md:text-[24px]">
              Ρύθμιση φωτογραφίας προφίλ
            </h3>
            <p className="mt-3 text-sm text-zinc-400">
              Drag πάνω στην εικόνα και χρησιμοποίησε zoom
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-4 py-5 md:px-5">
          <div
            ref={editorRef}
            onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
            onMouseUp={(e) => {
              if (!dragRef.current.moved) {
                pointToPosition(e.clientX, e.clientY);
              }
            }}
            onTouchStart={(e) => {
              const t = e.touches?.[0];
              if (!t) return;
              beginDrag(t.clientX, t.clientY);
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches?.[0];
              if (!t) return;
              if (!dragRef.current.moved) {
                pointToPosition(t.clientX, t.clientY);
              }
              endDrag();
            }}
            onWheel={(e) => {
              e.preventDefault();
              const nextZoom = clamp(zoom - e.deltaY * 0.0015, ZOOM_MIN, ZOOM_MAX);
              updateField("avatar_zoom", Number(nextZoom.toFixed(2)));
            }}
            className="relative aspect-square w-full overflow-hidden rounded-[28px] border border-white/10 bg-black select-none touch-none cursor-grab active:cursor-grabbing"
          >
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt="Avatar editor preview"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageMeta({
                      naturalWidth: img.naturalWidth || 1,
                      naturalHeight: img.naturalHeight || 1,
                    });
                  }}
                  className="pointer-events-none absolute max-w-none select-none object-fill"
                  style={imageStyle}
                />

                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    ...outsideCircleMask,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    background:
                      "linear-gradient(to bottom, rgba(10,10,10,0.12), rgba(10,10,10,0.24))",
                  }}
                />

                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    ...outsideCircleMask,
                    background:
                      "radial-gradient(circle at center, transparent 0%, transparent 31%, rgba(0,0,0,0.12) 39%, rgba(0,0,0,0.22) 100%)",
                  }}
                />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-full"
                    style={{
                      width: `${CROP_SIZE}%`,
                      height: `${CROP_SIZE}%`,
                      boxShadow:
                        "0 0 0 1.5px rgba(255,255,255,0.82), 0 0 0 8px rgba(255,255,255,0.04), 0 10px 26px rgba(0,0,0,0.22)",
                    }}
                  />
                </div>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-full border-2 border-white/85"
                    style={{
                      width: `${CROP_SIZE}%`,
                      height: `${CROP_SIZE}%`,
                    }}
                  />
                </div>

                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  Πάτησε για μετακίνηση
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
              <span className="text-xs text-zinc-400">{zoom.toFixed(2)}x</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  updateField(
                    "avatar_zoom",
                    Number(clamp(zoom - 0.1, ZOOM_MIN, ZOOM_MAX).toFixed(2))
                  )
                }
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step="0.01"
                value={zoom}
                onChange={(e) => updateField("avatar_zoom", Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-white"
              />

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "avatar_zoom",
                    Number(clamp(zoom + 0.1, ZOOM_MIN, ZOOM_MAX).toFixed(2))
                  )
                }
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4 md:px-5">
          <button
            type="button"
            onClick={resetAdjustments}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-2xl border border-white bg-white px-5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Έτοιμο
          </button>
        </div>
      </div>
    </div>
  );
}