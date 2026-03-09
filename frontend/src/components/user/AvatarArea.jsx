// FILE: src/components/user/AvatarArea.jsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../../supabaseClient";
import {
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Camera,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

const ONLINE_DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=PV&background=0D0F14&color=FFFFFF&size=256&bold=true";

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

const HARD_MAX_BYTES = 2 * 1024 * 1024;
const TARGET_BYTES = 550 * 1024;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

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
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }

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
  { targetBytes = TARGET_BYTES, hardMaxBytes = HARD_MAX_BYTES } = {}
) {
  const img = await decodeImage(file);
  const w = img.width;
  const h = img.height;

  const outType = supportsWebP ? "image/webp" : "image/jpeg";
  const dimensions = [1280, 1024, 896, 768, 640, 512];
  const qualities = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56];

  let best = null;

  for (const maxDim of dimensions) {
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Αποτυχία δημιουργίας canvas.");

    ctx.clearRect(0, 0, tw, th);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, tw, th);

    for (const q of qualities) {
      const blob = await toBlobAsync(canvas, outType, q);
      if (!blob) continue;

      if (!best || blob.size < best.size) best = blob;

      if (blob.size <= targetBytes) {
        return { blob, type: outType, hitTarget: true };
      }
    }
  }

  if (!best) throw new Error("Αποτυχία συμπίεσης εικόνας.");
  if (best.size > hardMaxBytes) {
    throw new Error("Η εικόνα παραμένει πάνω από 2MB ακόμα και μετά από συμπίεση.");
  }

  return { blob: best, type: outType, hitTarget: false };
}

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
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        disabled={loading}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-zinc-950/95 ring-1 ring-zinc-800/80 shadow-[0_40px_120px_rgba(0,0,0,.78)]"
      >
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-zinc-400/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-zinc-600/[0.04] blur-3xl" />

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-rose-500/12 text-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="font-semibold tracking-tight text-white">{title}</p>
                {description ? (
                  <p className="mt-1 text-sm text-zinc-400">{description}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-800/70 hover:text-white"
              aria-label="Κλείσιμο"
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-2xl bg-zinc-800/80 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700/80 disabled:opacity-60"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TipsModal({ open, mode = "file", onClose, onContinue }) {
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-950/95 p-5 ring-1 ring-zinc-800/80 shadow-[0_40px_120px_rgba(0,0,0,.78)]"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-zinc-400/[0.05] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-zinc-600/[0.04] blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-800/80 text-zinc-200">
                    {mode === "camera" ? (
                      <Camera className="h-5 w-5" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-white">Πριν συνεχίσεις</p>
                    <p className="mt-1 text-sm text-zinc-400">4 μικρά tips.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-800/70 hover:text-white"
                  aria-label="Κλείσιμο"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="rounded-2xl bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 ring-1 ring-zinc-800/70">
                  • Καθαρή τετράγωνη εικόνα
                </div>
                <div className="rounded-2xl bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 ring-1 ring-zinc-800/70">
                  • Κέντρο σε πρόσωπο ή λογότυπο
                </div>
                <div className="rounded-2xl bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 ring-1 ring-zinc-800/70">
                  • PNG / JPG / WEBP
                </div>
                <div className="rounded-2xl bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200 ring-1 ring-zinc-800/70">
                  • Αυτόματη συμπίεση
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-2xl bg-zinc-800/80 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700/80"
                >
                  Άκυρο
                </button>

                <button
                  type="button"
                  onClick={onContinue}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-100"
                >
                  Συνέχεια
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function AvatarArea({
  profile,
  avatar,
  placeholder,
  onUpload,
  className = "",
  bucket = "avatars",
  title = "Φωτογραφία Προφίλ",
  subtitle = "Ανέβασε ή άλλαξε φωτογραφία προφίλ.",
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [imgSrc, setImgSrc] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tipsMode, setTipsMode] = useState("file");

  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const tRef = useRef(null);

  const avatarUrl = profile?.avatar_url || avatar || "";

  const providedPlaceholder = useMemo(() => {
    if (typeof placeholder === "string" && placeholder.trim()) {
      return placeholder.trim();
    }
    return "";
  }, [placeholder]);

  const currentUrl = avatarUrl || ONLINE_DEFAULT_AVATAR;

  useEffect(() => {
    setImgSrc(currentUrl);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, []);

  const flash = useCallback((type, text) => {
    setNotice({ type, text });
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setNotice(null), 2400);
  }, []);

  const hasCustomAvatar = useMemo(() => {
    if (!avatarUrl) return false;
    if (avatarUrl === providedPlaceholder) return false;
    if (/ui-avatars\.com\/api/i.test(avatarUrl)) return false;
    return true;
  }, [avatarUrl, providedPlaceholder]);

  const statusLabel = uploading ? "Ανέβασμα…" : hasCustomAvatar ? "Έτοιμο" : "Default";

  const statusDotClass = uploading
    ? "bg-amber-400/90"
    : hasCustomAvatar
    ? "bg-emerald-400/80"
    : "bg-zinc-500/80";

  const onImgError = useCallback(() => {
    setImgSrc((prev) => {
      if (providedPlaceholder && prev !== providedPlaceholder) return providedPlaceholder;
      if (prev !== ONLINE_DEFAULT_AVATAR) return ONLINE_DEFAULT_AVATAR;
      return FALLBACK_DATA_URI;
    });
  }, [providedPlaceholder]);

  const openTips = useCallback(
    (mode) => {
      if (uploading) return;
      setTipsMode(mode);
      setTipsOpen(true);
    },
    [uploading]
  );

  const continueFromTips = useCallback(() => {
    const mode = tipsMode;
    setTipsOpen(false);

    window.setTimeout(() => {
      if (mode === "camera") {
        cameraInput.current?.click();
      } else {
        fileInput.current?.click();
      }
    }, 180);
  }, [tipsMode]);

  const removeOldAvatarVariants = useCallback(
    async (userId) => {
      try {
        await supabase.storage.from(bucket).remove([
          `${userId}/avatar.jpg`,
          `${userId}/avatar.jpeg`,
          `${userId}/avatar.png`,
          `${userId}/avatar.webp`,
        ]);
      } catch {
        // ignore
      }
    },
    [bucket]
  );

  const uploadAvatar = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!String(file.type || "").startsWith("image/")) {
        const msg = "Επιτρέπονται μόνο εικόνες.";
        setError(msg);
        flash("error", msg);
        if (e.target) e.target.value = "";
        return;
      }

      if (file.size > MAX_INPUT_BYTES) {
        const msg = "Το αρχείο είναι πολύ μεγάλο.";
        setError(msg);
        flash("error", msg);
        if (e.target) e.target.value = "";
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
        const filePath = `${user.id}/avatar.${ext}`;

        await removeOldAvatarVariants(user.id);

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
          .update({
            avatar_url: finalUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (dbErr) throw dbErr;

        setImgSrc(finalUrl);

        if (typeof onUpload === "function") {
          onUpload(finalUrl);
        }

        flash(
          "success",
          hitTarget ? `Έγινε! ${fmtBytes(blob.size)}` : `Έγινε! ${fmtBytes(blob.size)}`
        );
      } catch (err) {
        console.error("Σφάλμα φωτογραφίας προφίλ →", err);
        const msg = err?.message || "Αποτυχία ανεβάσματος.";
        setError(msg);
        flash("error", msg);
      } finally {
        setUploading(false);

        if (fileInput.current) fileInput.current.value = "";
        if (cameraInput.current) cameraInput.current.value = "";
      }
    },
    [bucket, flash, onUpload, removeOldAvatarVariants]
  );

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
        const cleanUrl = String(avatarUrl).split("?")[0];
        const u = new URL(cleanUrl);
        const marker = `/object/public/${bucket}/`;
        const idx = u.pathname.indexOf(marker);

        if (idx >= 0) path = u.pathname.slice(idx + marker.length);
        if (path) path = decodeURIComponent(path);
      } catch {}

      if (path) {
        const { error: remErr } = await supabase.storage.from(bucket).remove([path]);
        if (remErr) throw remErr;
      } else {
        await removeOldAvatarVariants(user.id);
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (dbErr) throw dbErr;

      setImgSrc(ONLINE_DEFAULT_AVATAR);

      if (typeof onUpload === "function") {
        onUpload(ONLINE_DEFAULT_AVATAR);
      }

      flash("success", "Η φωτογραφία προφίλ αφαιρέθηκε.");
    } catch (err) {
      console.error("Σφάλμα διαγραφής φωτογραφίας προφίλ →", err);
      const msg = err?.message || "Αποτυχία διαγραφής.";
      setError(msg);
      flash("error", msg);
    } finally {
      setUploading(false);
    }
  }, [avatarUrl, bucket, flash, hasCustomAvatar, onUpload, removeOldAvatarVariants]);

  const primaryLabel = uploading ? "Ανέβασμα…" : hasCustomAvatar ? "Αλλαγή" : "Επιλογή";

  return (
    <div className={["w-full", className].join(" ")}>
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/70 via-black/65 to-black/40 shadow-[0_28px_90px_rgba(0,0,0,.62)] ring-1 ring-zinc-800/70">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-zinc-400/[0.05] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-zinc-700/[0.04] blur-3xl" />

          <div className="relative px-5 pt-5 sm:px-7 sm:pt-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {title}
                  </h3>

                  {!hasCustomAvatar ? (
                    <span
                      className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-800 px-1.5 text-[11px] font-bold leading-none text-zinc-200 ring-1 ring-zinc-700/70"
                      title="Δεν έχει ανέβει εικόνα"
                      aria-label="Δεν έχει ανέβει εικόνα"
                    >
                      !
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full bg-zinc-900/70 px-3 py-1.5 ring-1 ring-zinc-800/70">
                <span className={["h-2.5 w-2.5 rounded-full", statusDotClass].join(" ")} />
                <span className="text-xs text-zinc-400">{statusLabel}</span>
              </div>
            </div>
          </div>

          <div className="relative px-5 pb-5 pt-6 sm:px-7 sm:pb-7 sm:pt-7">
            <div className="grid gap-6 lg:grid-cols-[260px,1fr] lg:gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[36px] bg-zinc-500/[0.06] blur-2xl" />

                  <div className="rounded-[30px] bg-gradient-to-b from-zinc-800/70 to-zinc-900/80 p-[1.5px] shadow-[0_18px_55px_rgba(0,0,0,.45)]">
                    <div className="rounded-[28px] bg-black/65 p-2 sm:p-2.5">
                      <img
                        src={imgSrc || ONLINE_DEFAULT_AVATAR}
                        alt="Φωτογραφία Προφίλ"
                        onError={onImgError}
                        className="h-32 w-32 rounded-3xl bg-zinc-900 object-cover sm:h-40 sm:w-40 lg:h-48 lg:w-48"
                      />
                    </div>
                  </div>

                  <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border border-black/40 bg-emerald-400 shadow-lg shadow-emerald-500/30">
                    <div className="h-2 w-2 rounded-full bg-emerald-100" />
                  </div>
                </div>

                <div className="mt-4 text-sm font-medium text-zinc-200">
                  {hasCustomAvatar ? "Έτοιμο." : "PV default."}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-900/45 p-4 ring-1 ring-zinc-800/70">
                    <div className="mb-2 flex items-center gap-2 text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold">Καθαρό look</span>
                    </div>
                    <p className="text-xs text-zinc-400 sm:text-sm">Πιο δυνατό προφίλ.</p>
                  </div>

                  <div className="rounded-2xl bg-zinc-900/45 p-4 ring-1 ring-zinc-800/70">
                    <div className="mb-2 flex items-center gap-2 text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold">Πιο επαγγελματικό</span>
                    </div>
                    <p className="text-xs text-zinc-400 sm:text-sm">Πιο καθαρή εικόνα.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-black/30 p-4 ring-1 ring-zinc-800/70 sm:p-5">
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-white sm:text-base">Διαχείριση</h4>
                    <p className="mt-1 text-xs text-zinc-400 sm:text-sm">Upload ή διαγραφή.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openTips("file")}
                      disabled={uploading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {primaryLabel}
                    </button>

                    <button
                      type="button"
                      onClick={() => openTips("camera")}
                      disabled={uploading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800/85 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700/85 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Camera className="h-4 w-4" />
                      Κάμερα
                    </button>

                    {hasCustomAvatar ? (
                      <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        disabled={uploading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/18 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Διαγραφή
                      </button>
                    ) : null}
                  </div>

                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                  />

                  <input
                    ref={cameraInput}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={uploadAvatar}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>

                {(notice || error) && (
                  <div className="mt-4">
                    {notice ? (
                      <div
                        className={[
                          "inline-flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm",
                          notice.type === "success"
                            ? "bg-emerald-500/10 text-emerald-200"
                            : "bg-rose-500/10 text-rose-200",
                        ].join(" ")}
                      >
                        {notice.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{notice.text}</span>
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Αφαίρεση εικόνας;"
        description="Θα επιστρέψει η προεπιλεγμένη εικόνα PV."
        confirmText="Ναι"
        cancelText="Άκυρο"
        loading={uploading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await deleteAvatarInternal();
        }}
      />

      <TipsModal
        open={tipsOpen}
        mode={tipsMode}
        onClose={() => setTipsOpen(false)}
        onContinue={continueFromTips}
      />
    </div>
  );
}