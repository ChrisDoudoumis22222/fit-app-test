// FILE: src/components/trainer/AvatarCard.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import {
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

// ✅ Online default (reliable)
const ONLINE_DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=PV&background=0D0F14&color=FFFFFF&size=256&bold=true";

// ✅ Guaranteed fallback (never breaks)
const FALLBACK_DATA_URI =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#111827"/>
        <stop offset="1" stop-color="#0b0f18"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="32" fill="url(#g)"/>
    <text x="128" y="150" font-family="Inter,system-ui" font-size="64" fill="#ffffffcc" text-anchor="middle">PV</text>
  </svg>
`);

const HARD_MAX_BYTES = 2 * 1024 * 1024; // <= 2MB
const TARGET_BYTES = 450 * 1024; // aim ~450KB
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // safety

const supportsWebP = (() => {
  if (typeof document === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
};

const toBlobAsync = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") return await createImageBitmap(file);

  return await new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function compressToTarget(
  file,
  { targetBytes = TARGET_BYTES, hardMaxBytes = HARD_MAX_BYTES } = {},
) {
  const img = await decodeImage(file);
  const w = img.width;
  const h = img.height;

  const outType = supportsWebP ? "image/webp" : "image/jpeg";

  const dimensions = [512, 448, 384, 320, 256, 224, 192];
  const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.44, 0.38, 0.32];

  let best = null;

  for (const maxDim of dimensions) {
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d", { alpha: true });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, tw, th);

    for (const q of qualities) {
      const blob = await toBlobAsync(canvas, outType, q);
      if (!blob) continue;

      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) return { blob, type: outType, hitTarget: true };
    }
  }

  if (!best) throw new Error("Αποτυχία συμπίεσης εικόνας.");
  if (best.size > hardMaxBytes)
    throw new Error("Η εικόνα παραμένει > 2MB ακόμα και μετά από έντονη συμπίεση.");

  return { blob: best, type: outType, hitTarget: false };
}

/* ---------------------- Custom Confirm Modal ---------------------- */
function ConfirmModal({
  open,
  title = "Επιβεβαίωση",
  description = "",
  confirmText = "Επιβεβαίωση",
  cancelText = "Άκυρο",
  onConfirm,
  onClose,
  loading = false,
}) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document?.body?.style?.overflow;
    try {
      document.body.style.overflow = "hidden";
    } catch {}

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      try {
        document.body.style.overflow = prevOverflow || "";
      } catch {}
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Κλείσιμο"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-3xl bg-zinc-950/90 shadow-[0_40px_120px_rgba(0,0,0,.75)]"
      >
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-rose-500/12 text-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold tracking-tight">{title}</p>
                {description ? (
                  <p className="mt-1 text-sm text-white/55">{description}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 text-white/45 hover:text-white hover:bg-white/10"
              aria-label="Κλείσιμο"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-2xl bg-white/10 hover:bg-white/15 text-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="w-full rounded-2xl bg-rose-500/15 hover:bg-rose-500/20 text-rose-200 px-4 py-3 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {confirmText}
            </button>
          </div>

          <p className="mt-3 text-[12px] text-white/35">
            Η ενέργεια αυτή αφαιρεί την εικόνα από το προφίλ σου. Μπορείς να ανεβάσεις νέα όποτε θέλεις.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Avatar Card ---------------------- */
export default function AvatarCard({
  avatarUrl,
  placeholderUrl,
  onUpload,
  onDelete,
  className = "",
  bucket = "avatars",
  title = "Εικόνα προφίλ",
  subtitle = "Ανέβασε μια καθαρή φωτογραφία — θα γίνει αυτόματη συμπίεση πριν το upload.",
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [imgSrc, setImgSrc] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fileInput = useRef(null);
  const tRef = useRef(null);

  const placeholder = useMemo(() => {
    if (typeof placeholderUrl === "string" && /^https?:\/\//i.test(placeholderUrl))
      return placeholderUrl;
    return ONLINE_DEFAULT_AVATAR;
  }, [placeholderUrl]);

  const currentUrl = avatarUrl || placeholder;

  useEffect(() => setImgSrc(currentUrl), [currentUrl]);

  useEffect(() => {
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, []);

  const flash = (type, text) => {
    setNotice({ type, text });
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setNotice(null), 2400);
  };

  const hasCustomAvatar = useMemo(() => {
    if (!avatarUrl) return false;
    if (!/^https?:\/\//i.test(avatarUrl)) return false;
    if (avatarUrl === placeholder) return false;
    if (/ui-avatars\.com\/api/i.test(avatarUrl)) return false;
    return true;
  }, [avatarUrl, placeholder]);

  // ✅ status (Greek)
  const statusLabel = uploading ? "Ανέβασμα…" : hasCustomAvatar ? "Έτοιμο" : "Μη έτοιμο";
  const statusDotClass = uploading
    ? "bg-amber-400/90"
    : hasCustomAvatar
      ? "bg-emerald-400/80"
      : "bg-white/30";

  const onImgError = () => {
    if (imgSrc !== placeholder) setImgSrc(placeholder);
    else setImgSrc(FALLBACK_DATA_URI);
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_INPUT_BYTES) {
      setError("Το αρχείο είναι πολύ μεγάλο.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setNotice(null);

      const {
        data: { user },
        error: usrErr,
      } = await supabase.auth.getUser();
      if (usrErr || !user) throw new Error("Δεν υπάρχει ενεργή συνεδρία.");

      const { blob, type, hitTarget } = await compressToTarget(file, {
        targetBytes: TARGET_BYTES,
        hardMaxBytes: HARD_MAX_BYTES,
      });

      const ext = type === "image/webp" ? "webp" : "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: type,
      });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setImgSrc(finalUrl);
      flash(
        "success",
        hitTarget
          ? `Έγινε! Συμπίεση σε ${fmtBytes(blob.size)}.`
          : `Έγινε! (best) ${fmtBytes(blob.size)}.`,
      );
      onUpload?.(finalUrl);
    } catch (err) {
      console.error("Σφάλμα avatar →", err);
      const msg = err?.message || "Αποτυχία ανεβάσματος.";
      setError(msg);
      flash("error", msg);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const deleteAvatarInternal = useCallback(async () => {
    if (!hasCustomAvatar) return;

    try {
      setUploading(true);
      setError("");
      setNotice(null);

      const {
        data: { user },
        error: usrErr,
      } = await supabase.auth.getUser();
      if (usrErr || !user) throw new Error("Δεν υπάρχει ενεργή συνεδρία.");

      let path = null;
      try {
        const u = new URL(avatarUrl);
        const marker = `/object/public/${bucket}/`;
        const idx = u.pathname.indexOf(marker);
        if (idx >= 0) path = u.pathname.slice(idx + marker.length);
        if (path) path = decodeURIComponent(path);
      } catch {}

      if (!path) throw new Error("Δεν βρέθηκε path για διαγραφή.");

      const { error: remErr } = await supabase.storage.from(bucket).remove([path]);
      if (remErr) throw remErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setImgSrc(placeholder);
      flash("success", "Το avatar αφαιρέθηκε.");
      onDelete?.();
    } catch (err) {
      console.error("Σφάλμα διαγραφής avatar →", err);
      const msg = err?.message || "Αποτυχία διαγραφής.";
      setError(msg);
      flash("error", msg);
    } finally {
      setUploading(false);
    }
  }, [hasCustomAvatar, avatarUrl, bucket, placeholder, onDelete]);

  const primaryLabel = uploading
    ? "Ανέβασμα…"
    : hasCustomAvatar
      ? "Αλλαγή εικόνας"
      : "Επιλογή εικόνας";

  return (
    <div className={["w-full", className].join(" ")}>
      {/* ✅ Borderless: NO gray border / NO ring / NO outline */}
      <div
        className={[
          "relative overflow-hidden rounded-3xl",
          "border-0 ring-0 outline-none",
          "bg-gradient-to-b from-white/[0.035] via-white/[0.02] to-black/25",
          "backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,.60)]",
        ].join(" ")}
      >
        {/* subtle blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />

        {/* Header */}
        <div className="relative px-6 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                {title}
              </h3>
              <p className="mt-1 text-sm text-white/55">{subtitle}</p>
            </div>

            {/* ✅ status in Greek */}
            <div className="flex items-center gap-2 shrink-0 pt-1">
              <span className={["h-2.5 w-2.5 rounded-full", statusDotClass].join(" ")} />
              <span className="text-xs text-white/45">{statusLabel}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8 pt-8">
          <div className="mx-auto max-w-xl flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={imgSrc || placeholder}
                alt="Avatar"
                onError={onImgError}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-cover bg-white/5
                           shadow-[0_18px_55px_rgba(0,0,0,.45)]"
              />
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-white/5 blur-xl" />
            </div>

            <div className="mt-5 text-white/80 text-sm sm:text-base font-medium">
              Διάλεξε εικόνα και ανέβασε — θα γίνει optimize αυτόματα.
            </div>

            <div className="mt-2 text-white/45 text-xs sm:text-sm">
              PNG / JPG / WEBP • στόχος ~{fmtBytes(TARGET_BYTES)} • τελικό αρχείο ≤{" "}
              {fmtBytes(HARD_MAX_BYTES)}
            </div>

            {/* Actions */}
            <div className="mt-7 w-full">
              <div className="mx-auto flex w-full max-w-sm flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className={[
                    "w-full",
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold",
                    "bg-white text-black hover:bg-white/90",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {primaryLabel}
                </button>

                {hasCustomAvatar && (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={uploading}
                    className={[
                      "w-full",
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold",
                      "bg-white/10 text-rose-200 hover:bg-rose-500/10",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Αφαίρεση
                  </button>
                )}
              </div>

              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
                className="hidden"
              />
            </div>

            {(notice || error) && (
              <div className="mt-6 w-full flex justify-center">
                {notice ? (
                  <div
                    className={[
                      "max-w-sm w-full inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm",
                      notice.type === "success"
                        ? "bg-emerald-500/10 text-emerald-200"
                        : "bg-rose-500/10 text-rose-200",
                    ].join(" ")}
                  >
                    {notice.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">{notice.text}</span>
                  </div>
                ) : (
                  <div className="max-w-sm w-full rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 text-[12px] text-white/35">
              Tip: μια τετραγωνισμένη φωτογραφία (1:1) δείχνει καλύτερα στο προφίλ.
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Custom delete confirmation */}
      <ConfirmModal
        open={confirmOpen}
        title="Αφαίρεση εικόνας προφίλ;"
        description="Θα αφαιρεθεί η τρέχουσα εικόνα από το προφίλ σου."
        confirmText="Ναι, αφαίρεση"
        cancelText="Άκυρο"
        loading={uploading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await deleteAvatarInternal();
        }}
      />
    </div>
  );
}