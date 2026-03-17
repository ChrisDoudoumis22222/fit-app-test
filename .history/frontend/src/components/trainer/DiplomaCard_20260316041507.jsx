// FILE: src/components/trainer/DiplomaCard.jsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import {
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  FileText,
  GraduationCap,
} from "lucide-react";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
};

const getFileExt = (file) => {
  const name = String(file?.name || "").toLowerCase();
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";

  if (ext) {
    if (ext === "jpeg") return "jpg";
    return ext;
  }

  const type = String(file?.type || "").toLowerCase();
  if (type.includes("pdf")) return "pdf";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";

  return "bin";
};

const isPdfUrl = (url = "") => /\.pdf(\?|#|$)/i.test(url);
const isImageUrl = (url = "") => /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(url);

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
            Η ενέργεια αυτή αφαιρεί το πτυχίο από το προφίλ σου. Μπορείς να ανεβάσεις νέο αρχείο όποτε θέλεις.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Diploma Card ---------------------- */
export default function DiplomaCard({
  profile,
  onAfterSave,
  className = "",
  bucket = "diplomas",
  title = "Πτυχίο",
  subtitle = "Ανέβασε το πτυχίο σου σε PDF ή εικόνα.",
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fileInput = useRef(null);
  const tRef = useRef(null);

  const diplomaUrl = profile?.diploma_url || "";

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

  const hasDiploma = useMemo(() => {
    if (!diplomaUrl) return false;
    return /^https?:\/\//i.test(diplomaUrl);
  }, [diplomaUrl]);

  const previewIsPdf = useMemo(() => {
    if (!hasDiploma) return false;
    return isPdfUrl(diplomaUrl);
  }, [hasDiploma, diplomaUrl]);

  const previewIsImage = useMemo(() => {
    if (!hasDiploma) return false;
    if (previewIsPdf) return false;
    return isImageUrl(diplomaUrl);
  }, [hasDiploma, previewIsPdf, diplomaUrl]);

  const statusLabel = uploading ? "Ανέβασμα…" : hasDiploma ? "Έτοιμο" : "Μη έτοιμο";

  const statusDotClass = uploading
    ? "bg-amber-400/90"
    : hasDiploma
      ? "bg-emerald-400/80"
      : "bg-red-400/80";

  const uploadDiploma = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = String(file.type || "").toLowerCase();
    const isPdf = fileType === "application/pdf";
    const isImage = fileType.startsWith("image/");

    if (!isPdf && !isImage) {
      const msg = "Επιτρέπονται μόνο PDF ή εικόνες.";
      setError(msg);
      flash("error", msg);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      const msg = "Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 8MB.";
      setError(msg);
      flash("error", msg);
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

      const ext = getFileExt(file);
      const safeExt = ext || (isPdf ? "pdf" : "jpg");
      const filePath = `${user.id}/diploma-${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined,
      });

      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          diploma_url: finalUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (dbErr) throw dbErr;

      flash("success", `Το πτυχίο ανέβηκε (${fmtBytes(file.size)}).`);
      onAfterSave?.(finalUrl);
    } catch (err) {
      console.error("Σφάλμα diploma upload →", err);
      const msg = err?.message || "Αποτυχία ανεβάσματος πτυχίου.";
      setError(msg);
      flash("error", msg);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const deleteDiplomaInternal = useCallback(async () => {
    if (!hasDiploma) return;

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
        const cleanUrl = String(diplomaUrl).split("?")[0];
        const u = new URL(cleanUrl);
        const marker = `/object/public/${bucket}/`;
        const idx = u.pathname.indexOf(marker);

        if (idx >= 0) path = u.pathname.slice(idx + marker.length);
        if (path) path = decodeURIComponent(path);
      } catch {}

      if (path) {
        const { error: remErr } = await supabase.storage.from(bucket).remove([path]);
        if (remErr) throw remErr;
      }

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          diploma_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (dbErr) throw dbErr;

      flash("success", "Το πτυχίο αφαιρέθηκε.");
      onAfterSave?.();
    } catch (err) {
      console.error("Σφάλμα διαγραφής diploma →", err);
      const msg = err?.message || "Αποτυχία διαγραφής πτυχίου.";
      setError(msg);
      flash("error", msg);
    } finally {
      setUploading(false);
    }
  }, [hasDiploma, diplomaUrl, bucket, onAfterSave]);

  const primaryLabel = uploading
    ? "Ανέβασμα…"
    : hasDiploma
      ? "Αλλαγή πτυχίου"
      : "Επιλογή αρχείου";

  return (
    <div className={["w-full", className].join(" ")}>
      <div
        className={[
          "relative overflow-hidden",
          "rounded-none sm:rounded-3xl",
          "-mx-4 px-4 sm:mx-0 sm:px-0",
          "border-0 ring-0 outline-none",
          "bg-transparent sm:bg-gradient-to-b sm:from-white/[0.035] sm:via-white/[0.02] sm:to-black/25",
          "backdrop-blur-0 sm:backdrop-blur-xl",
          "shadow-none sm:shadow-[0_28px_90px_rgba(0,0,0,.60)]",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 hidden sm:block h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 hidden sm:block h-72 w-72 rounded-full bg-white/[0.03] blur-3xl" />

        {/* Header */}
        <div className="relative px-4 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                  {title}
                </h3>

                {!hasDiploma ? (
                  <span
                    className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white"
                    title="Δεν έχει ανέβει πτυχίο"
                    aria-label="Δεν έχει ανέβει πτυχίο"
                  >
                    !
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-sm text-white/55">{subtitle}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-1">
              <span className={["h-2.5 w-2.5 rounded-full", statusDotClass].join(" ")} />
              <span className="text-xs text-white/45">{statusLabel}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-4 pb-6 pt-8 sm:px-8 sm:pb-8">
          <div className="mx-auto max-w-xl flex flex-col items-center text-center">
            {/* Preview */}
            <div className="w-full flex justify-center">
              {hasDiploma ? (
                previewIsImage ? (
                  <div className="relative w-full flex justify-center">
<img
  src={diplomaUrl}
  alt="Πτυχίο"
  loading="lazy"
  decoding="async"
  className="h-auto max-h-40 sm:max-h-64 w-auto max-w-full object-contain rounded-2xl sm:rounded-3xl bg-transparent sm:bg-white/5 shadow-none sm:shadow-[0_18px_55px_rgba(0,0,0,.45)]"
/>
                    <div className="pointer-events-none absolute -inset-4 -z-10 hidden sm:block rounded-[32px] bg-white/5 blur-xl" />
                  </div>
                ) : (
                  <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-transparent sm:bg-white/5 border-0 sm:border sm:border-white/10 p-4 sm:p-5 text-left shadow-none sm:shadow-[0_18px_55px_rgba(0,0,0,.35)]">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                        {previewIsPdf ? (
                          <FileText className="h-6 w-6 text-white/85" />
                        ) : (
                          <GraduationCap className="h-6 w-6 text-white/85" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white">
                          {previewIsPdf ? "PDF Πτυχίου" : "Αρχείο Πτυχίου"}
                        </div>
                        <div className="text-xs text-white/50 truncate">
                          Το αρχείο είναι αποθηκευμένο και έτοιμο.
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-transparent sm:bg-white/[0.04] border-0 sm:border sm:border-dashed sm:border-white/10 p-6 sm:p-8">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white/5">
                    <GraduationCap className="h-8 w-8 text-white/70" />
                  </div>

                  <div className="mt-4 text-white/80 text-sm sm:text-base font-medium">
                    Δεν έχει ανέβει πτυχίο ακόμα.
                  </div>

                  <div className="mt-2 text-white/45 text-xs sm:text-sm">
                    Ανέβασε PDF ή εικόνα για να ολοκληρώσεις το προφίλ σου.
                  </div>
                </div>
              )}
            </div>

            {/* File info */}
            <div className="mt-5 text-white/80 text-sm sm:text-base font-medium">
              {hasDiploma
                ? "Το πτυχίο σου είναι αποθηκευμένο."
                : "Διάλεξε αρχείο και ανέβασέ το τώρα."}
            </div>

            <div className="mt-2 text-white/45 text-xs sm:text-sm">
              PDF / PNG / JPG / WEBP • μέγιστο αρχείο {fmtBytes(MAX_FILE_BYTES)}
            </div>

            {/* Open link */}
            {hasDiploma ? (
              <div className="mt-4">
                <a
                  href={diplomaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  Άνοιγμα πτυχίου
                </a>
              </div>
            ) : null}

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
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  {primaryLabel}
                </button>

                {hasDiploma && (
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
                accept=".pdf,image/*"
                onChange={uploadDiploma}
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
              Tip: προτίμησε καθαρό PDF ή ευκρινή φωτογραφία του πτυχίου.
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Αφαίρεση πτυχίου;"
        description="Θα αφαιρεθεί το τρέχον πτυχίο από το προφίλ σου."
        confirmText="Ναι, αφαίρεση"
        cancelText="Άκυρο"
        loading={uploading}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await deleteDiplomaInternal();
        }}
      />
    </div>
  );
}