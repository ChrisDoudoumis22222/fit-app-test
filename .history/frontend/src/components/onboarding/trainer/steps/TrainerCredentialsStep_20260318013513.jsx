"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
} from "lucide-react";
import FieldCard from "../FieldCard";
import { supabase } from "../../../../supabaseClient";
import { prepareCompressedUploadFile } from "../../../common/CompressedImageUploader";

/**
 * Use your existing public bucket so it works immediately.
 * If you already have a dedicated diploma/documents bucket,
 * replace "avatars" with that bucket name.
 */
const STORAGE_BUCKET = "avatars";
const STORAGE_FOLDER = "credentials";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const TARGET_IMAGE_BYTES = Math.round(2.5 * 1024 * 1024);

const cn = (...classes) => classes.filter(Boolean).join(" ");

const ACCEPT_VALUE =
  ".pdf,.jpeg,.jpg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const ALLOWED_EXTENSIONS = ["pdf", "jpeg", "jpg", "png", "webp"];

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
};

function getFileExt(name = "") {
  const clean = String(name).toLowerCase().trim();
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isBlobLike(value) {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isImageFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const ext = getFileExt(file?.name || "");
  return (
    ALLOWED_IMAGE_TYPES.includes(type) ||
    ["jpeg", "jpg", "png", "webp"].includes(ext)
  );
}

function isPdfFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const ext = getFileExt(file?.name || "");
  return type === "application/pdf" || ext === "pdf";
}

function isAllowedFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const ext = getFileExt(file?.name || "");
  return (
    ALLOWED_IMAGE_TYPES.includes(type) ||
    type === "application/pdf" ||
    ALLOWED_EXTENSIONS.includes(ext)
  );
}

function normalizePreparedFile(result, fallbackFile) {
  if (isBlobLike(result)) return result;
  if (isBlobLike(result?.file)) return result.file;
  if (isBlobLike(result?.outputFile)) return result.outputFile;
  if (isBlobLike(result?.compressedFile)) return result.compressedFile;
  return fallbackFile;
}

function ensureFileObject(fileLike, fallbackName, fallbackType) {
  if (typeof File !== "undefined" && fileLike instanceof File) return fileLike;

  if (isBlobLike(fileLike) && typeof File !== "undefined") {
    return new File([fileLike], fallbackName, {
      type: fileLike.type || fallbackType,
    });
  }

  return fileLike;
}

function withCacheBust(url) {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

function extractStoragePathFromPublicUrl(bucket, url) {
  if (!url) return "";

  try {
    const cleanUrl = String(url).split("?")[0];
    const parsed = new URL(cleanUrl);
    const marker = `/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);

    if (idx === -1) return "";
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return "";
  }
}

function urlLooksLikePdf(url = "") {
  const clean = String(url).split("?")[0].toLowerCase();
  return clean.endsWith(".pdf");
}

function urlLooksLikeImage(url = "") {
  const clean = String(url).split("?")[0].toLowerCase();
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".webp")
  );
}

function getUploadExt(file) {
  const type = String(file?.type || "").toLowerCase();
  const ext = getFileExt(file?.name || "");

  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";

  if (["pdf", "png", "webp", "jpg", "jpeg"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }

  return "pdf";
}

export default function TrainerCredentialsStep({
  form,
  setField,
  setForm,
  onDiplomaFileChange,
}) {
  const inputRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [localFile, setLocalFile] = useState(form?.diploma_file || null);
  const [previewUrl, setPreviewUrl] = useState(form?.diploma_url || "");

  const hasFile = useMemo(() => {
    return !!localFile || !!previewUrl || !!form?.diploma_url;
  }, [localFile, previewUrl, form?.diploma_url]);

  useEffect(() => {
    if (form?.diploma_url && !previewUrl) {
      setPreviewUrl(form.diploma_url);
    }
  }, [form?.diploma_url, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const syncFormValues = useCallback(
    ({ file, url, name }) => {
      if (typeof setForm === "function") {
        setForm((prev) => ({
          ...prev,
          diploma_file: file || null,
          diploma_url: url || "",
          diploma_name: name || "",
        }));
        return;
      }

      if (typeof setField === "function") {
        try {
          setField("diploma_url")({ target: { value: url || "" } });
        } catch {}

        try {
          setField("diploma_name")({ target: { value: name || "" } });
        } catch {}
      }
    },
    [setField, setForm]
  );

  const clearOldPreviewIfBlob = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const persistDiplomaUrl = useCallback(async (userId, nextUrl) => {
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        diploma_url: nextUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError) throw dbError;
  }, []);

  const removeStoragePath = useCallback(async (path) => {
    if (!path) return;
    const { error: removeError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (removeError) throw removeError;
  }, []);

  const handlePickFile = async (event) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile) return;

    setBusy(true);
    setError("");
    setSuccess("");

    let uploadedPath = "";

    try {
      if (!isAllowedFile(rawFile)) {
        throw new Error("Επιτρέπονται μόνο αρχεία PDF, JPG, JPEG, PNG ή WEBP.");
      }

      if (rawFile.size > MAX_FILE_BYTES) {
        throw new Error("Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error("Δεν βρέθηκε συνδεδεμένος χρήστης.");

      const previousStoredUrl = form?.diploma_url || previewUrl || "";
      const previousStoredPath = extractStoragePathFromPublicUrl(
        STORAGE_BUCKET,
        previousStoredUrl
      );

      let finalFile = rawFile;

      if (isImageFile(rawFile)) {
        const prepared = await prepareCompressedUploadFile(rawFile, {
          maxWidth: 1800,
          maxHeight: 1800,
          targetBytes: TARGET_IMAGE_BYTES,
          hardMaxBytes: TARGET_IMAGE_BYTES,
          outputType: "image/jpeg",
          fileNameBase: "diploma",
        });

        const normalized = normalizePreparedFile(prepared, rawFile);
        finalFile = ensureFileObject(normalized, "diploma.jpg", "image/jpeg");
      } else {
        finalFile = ensureFileObject(rawFile, rawFile.name || "diploma.pdf", rawFile.type || "application/pdf");
      }

      if (!isBlobLike(finalFile)) {
        throw new Error("Το αρχείο δεν είναι έγκυρο για preview/upload.");
      }

      const ext = getUploadExt(finalFile);
      const storedName =
        rawFile.name?.trim() ||
        finalFile.name?.trim() ||
        `diploma.${ext}`;

      const contentType =
        finalFile.type ||
        (ext === "pdf" ? "application/pdf" : "image/jpeg");

      const filePath = `${user.id}/${STORAGE_FOLDER}/diploma-${Date.now()}.${ext}`;
      uploadedPath = filePath;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, finalFile, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      const rawPublicUrl = publicData?.publicUrl || "";
      if (!rawPublicUrl) {
        throw new Error("Δεν δημιουργήθηκε public URL για το δίπλωμα.");
      }

      const finalPublicUrl = withCacheBust(rawPublicUrl);

      await persistDiplomaUrl(user.id, finalPublicUrl);

      if (previousStoredPath && previousStoredPath !== uploadedPath) {
        try {
          await removeStoragePath(previousStoredPath);
        } catch (cleanupErr) {
          console.warn("Old diploma cleanup skipped:", cleanupErr);
        }
      }

      clearOldPreviewIfBlob();

      setLocalFile(finalFile);
      setPreviewUrl(finalPublicUrl);

      syncFormValues({
        file: finalFile,
        url: finalPublicUrl,
        name: storedName,
      });

      if (typeof onDiplomaFileChange === "function") {
        onDiplomaFileChange(finalFile);
      }

      setSuccess("Το δίπλωμα ανέβηκε και αποθηκεύτηκε επιτυχώς.");
    } catch (err) {
      if (uploadedPath) {
        try {
          await removeStoragePath(uploadedPath);
        } catch {
          // ignore rollback cleanup
        }
      }

      console.error("Diploma upload error:", err);
      setError(err?.message || "Κάτι πήγε στραβά με το ανέβασμα του αρχείου.");
    } finally {
      setBusy(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const currentUrl = form?.diploma_url || previewUrl || "";

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error("Δεν βρέθηκε συνδεδεμένος χρήστης.");

      const currentPath = extractStoragePathFromPublicUrl(STORAGE_BUCKET, currentUrl);
      if (currentPath) {
        await removeStoragePath(currentPath);
      }

      await persistDiplomaUrl(user.id, null);

      clearOldPreviewIfBlob();

      setLocalFile(null);
      setPreviewUrl("");

      syncFormValues({
        file: null,
        url: "",
        name: "",
      });

      if (typeof onDiplomaFileChange === "function") {
        onDiplomaFileChange(null);
      }

      if (inputRef.current) inputRef.current.value = "";

      setSuccess("Το δίπλωμα αφαιρέθηκε επιτυχώς.");
    } catch (err) {
      console.error("Diploma remove error:", err);
      setError(err?.message || "Κάτι πήγε στραβά στην αφαίρεση του αρχείου.");
    } finally {
      setBusy(false);
    }
  };

  const effectivePreviewUrl = previewUrl || form?.diploma_url || "";

  const shouldShowImagePreview =
    (!!effectivePreviewUrl || !!localFile) &&
    (isImageFile(localFile) || (!localFile && urlLooksLikeImage(effectivePreviewUrl)));

  const shouldShowPdfBox =
    isPdfFile(localFile) || (!localFile && urlLooksLikePdf(effectivePreviewUrl));

  return (
    <div className="grid grid-cols-1 gap-4">
      <FieldCard
        icon={FileText}
        label="Δίπλωμα"
        hint="Ανέβασε PDF, JPG, JPEG, PNG ή WEBP"
      >
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_VALUE}
            onChange={handlePickFile}
            className="hidden"
          />

          {!hasFile ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={cn(
                "flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/80 px-4 py-6 text-white transition",
                "hover:border-white/30 hover:bg-zinc-900",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">
                {busy ? "Γίνεται επεξεργασία..." : "Επίλεξε αρχείο για ανέβασμα"}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <p className="truncate text-sm font-semibold">
                      {localFile?.name || form?.diploma_name || "Ανεβασμένο αρχείο"}
                    </p>
                  </div>

                  <div className="mt-1 text-xs text-zinc-400">
                    {localFile ? fmtBytes(localFile.size) : "Έτοιμο αρχείο"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-white transition hover:border-white/30 hover:bg-zinc-900 disabled:opacity-60"
                  >
                    {busy ? "..." : "Αλλαγή"}
                  </button>

                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={busy}
                    className="rounded-xl border border-red-900/50 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1">
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      Αφαίρεση
                    </span>
                  </button>
                </div>
              </div>

              {shouldShowImagePreview ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                  <img
                    src={effectivePreviewUrl}
                    alt="Diploma preview"
                    loading="lazy"
                    className="max-h-[320px] w-full object-contain"
                  />
                </div>
              ) : null}

              {shouldShowPdfBox ? (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <FileText className="h-4 w-4" />
                      <span>PDF έτοιμο</span>
                    </div>

                    {effectivePreviewUrl ? (
                      <a
                        href={effectivePreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white"
                      >
                        Προβολή
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {success ? (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <p className="text-xs text-zinc-500">
            Υποστηρίζονται PDF, JPG, JPEG, PNG και WEBP. Οι εικόνες συμπιέζονται
            αυτόματα πριν αποθηκευτούν.
          </p>
        </div>
      </FieldCard>
    </div>
  );
}