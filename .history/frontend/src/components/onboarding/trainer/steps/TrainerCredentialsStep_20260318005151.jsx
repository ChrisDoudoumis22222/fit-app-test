"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { prepareCompressedUploadFile } from "../../../common/CompressedImageUploader";

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
  return ALLOWED_IMAGE_TYPES.includes(type) || ["jpeg", "jpg", "png", "webp"].includes(ext);
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
    return !!localFile || !!form?.diploma_url;
  }, [localFile, form?.diploma_url]);

  useEffect(() => {
    if (form?.diploma_url && !localFile) {
      setPreviewUrl(form.diploma_url);
    }
  }, [form?.diploma_url, localFile]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const syncFormValues = ({ file, url, name }) => {
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
  };

  const clearOldPreviewIfBlob = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handlePickFile = async (event) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (!isAllowedFile(rawFile)) {
        throw new Error("Επιτρέπονται μόνο αρχεία PDF, JPG, JPEG, PNG ή WEBP.");
      }

      if (rawFile.size > MAX_FILE_BYTES) {
        throw new Error("Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB.");
      }

      let finalFile = rawFile;

      if (isImageFile(rawFile)) {
        const prepared = await prepareCompressedUploadFile(rawFile, {
          maxBytes: TARGET_IMAGE_BYTES,
        });
        finalFile = normalizePreparedFile(prepared, rawFile);
      }

      if (!isBlobLike(finalFile)) {
        throw new Error("Το αρχείο δεν είναι έγκυρο για preview/upload.");
      }

      clearOldPreviewIfBlob();

      const nextPreviewUrl = isImageFile(finalFile)
        ? URL.createObjectURL(finalFile)
        : "";

      setLocalFile(finalFile);
      setPreviewUrl(nextPreviewUrl);

      syncFormValues({
        file: finalFile,
        url: nextPreviewUrl,
        name: finalFile.name || rawFile.name || "",
      });

      if (typeof onDiplomaFileChange === "function") {
        onDiplomaFileChange(finalFile);
      }

      setSuccess("Το δίπλωμα ανέβηκε επιτυχώς.");
    } catch (err) {
      setError(err?.message || "Κάτι πήγε στραβά με το ανέβασμα του αρχείου.");
    } finally {
      setBusy(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleRemove = () => {
    clearOldPreviewIfBlob();

    setLocalFile(null);
    setPreviewUrl("");
    setError("");
    setSuccess("");

    syncFormValues({
      file: null,
      url: "",
      name: "",
    });

    if (typeof onDiplomaFileChange === "function") {
      onDiplomaFileChange(null);
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const shouldShowImagePreview =
    (!!previewUrl || !!form?.diploma_url) &&
    (isImageFile(localFile) ||
      (!localFile &&
        !String(form?.diploma_url || "").toLowerCase().endsWith(".pdf")));

  const shouldShowPdfBox =
    isPdfFile(localFile) ||
    String(form?.diploma_url || "").toLowerCase().endsWith(".pdf");

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
                    Αλλαγή
                  </button>

                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={busy}
                    className="rounded-xl border border-red-900/50 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1">
                      <X className="h-3.5 w-3.5" />
                      Αφαίρεση
                    </span>
                  </button>
                </div>
              </div>

              {shouldShowImagePreview ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                  <img
                    src={previewUrl || form?.diploma_url}
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

                    {form?.diploma_url ? (
                      <a
                        href={form.diploma_url}
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