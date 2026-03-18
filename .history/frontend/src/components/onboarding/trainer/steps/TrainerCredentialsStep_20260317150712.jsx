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
import {
  prepareCompressedUploadFile,
  FILE_INPUT_ACCEPT,
} from "../common/CompressedImageUploader";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const TARGET_IMAGE_BYTES = Math.round(2.5 * 1024 * 1024);

const cn = (...classes) => classes.filter(Boolean).join(" ");

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
};

function isImageFile(file) {
  return String(file?.type || "").startsWith("image/");
}

function isPdfFile(file) {
  return (
    String(file?.type || "").toLowerCase() === "application/pdf" ||
    String(file?.name || "").toLowerCase().endsWith(".pdf")
  );
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

  const acceptValue = useMemo(() => {
    const base = FILE_INPUT_ACCEPT || "image/*";
    return `${base},application/pdf`;
  }, []);

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
      setField("diploma_url")({ target: { value: url || "" } });
      if (setField("diploma_name")) {
        try {
          setField("diploma_name")({ target: { value: name || "" } });
        } catch {
          // ignore if setField isn't built for this
        }
      }
    }
  };

  const handlePickFile = async (event) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (rawFile.size > MAX_FILE_BYTES) {
        throw new Error("Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB.");
      }

      let finalFile = rawFile;

      if (isImageFile(rawFile)) {
        finalFile = await prepareCompressedUploadFile(rawFile, {
          maxBytes: TARGET_IMAGE_BYTES,
        });
      } else if (!isPdfFile(rawFile)) {
        throw new Error("Επιτρέπονται μόνο εικόνες ή PDF για το δίπλωμα.");
      }

      const nextPreviewUrl = isPdfFile(finalFile)
        ? ""
        : URL.createObjectURL(finalFile);

      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }

      setLocalFile(finalFile);
      setPreviewUrl(nextPreviewUrl);

      syncFormValues({
        file: finalFile,
        url: nextPreviewUrl,
        name: finalFile.name,
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
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

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

  const hasFile = !!localFile || !!form?.diploma_url;

  return (
    <div className="grid grid-cols-1 gap-4">
      <FieldCard
        icon={FileText}
        label="Δίπλωμα"
        hint="Ανέβασε εικόνα ή PDF του διπλώματός σου"
      >
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={acceptValue}
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
                {busy ? "Γίνεται επεξεργασία..." : "Επίλεξε δίπλωμα για ανέβασμα"}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <p className="truncate text-sm font-semibold">
                      {localFile?.name || form?.diploma_name || "Ανεβασμένο δίπλωμα"}
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

              {(previewUrl || form?.diploma_url) && !isPdfFile(localFile) ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                  <img
                    src={previewUrl || form?.diploma_url}
                    alt="Diploma preview"
                    loading="lazy"
                    className="max-h-[320px] w-full object-contain"
                  />
                </div>
              ) : null}

              {(isPdfFile(localFile) || String(form?.diploma_url || "").toLowerCase().endsWith(".pdf")) && (
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
              )}
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
            Υποστηρίζονται εικόνες και PDF. Οι εικόνες συμπιέζονται αυτόματα πριν
            αποθηκευτούν.
          </p>
        </div>
      </FieldCard>
    </div>
  );
}"use client";

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
import {
  prepareCompressedUploadFile,
  FILE_INPUT_ACCEPT,
} from "../common/CompressedImageUploader";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const TARGET_IMAGE_BYTES = Math.round(2.5 * 1024 * 1024);

const cn = (...classes) => classes.filter(Boolean).join(" ");

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
};

function isImageFile(file) {
  return String(file?.type || "").startsWith("image/");
}

function isPdfFile(file) {
  return (
    String(file?.type || "").toLowerCase() === "application/pdf" ||
    String(file?.name || "").toLowerCase().endsWith(".pdf")
  );
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

  const acceptValue = useMemo(() => {
    const base = FILE_INPUT_ACCEPT || "image/*";
    return `${base},application/pdf`;
  }, []);

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
      setField("diploma_url")({ target: { value: url || "" } });
      if (setField("diploma_name")) {
        try {
          setField("diploma_name")({ target: { value: name || "" } });
        } catch {
          // ignore if setField isn't built for this
        }
      }
    }
  };

  const handlePickFile = async (event) => {
    const rawFile = event.target.files?.[0];
    if (!rawFile) return;

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (rawFile.size > MAX_FILE_BYTES) {
        throw new Error("Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB.");
      }

      let finalFile = rawFile;

      if (isImageFile(rawFile)) {
        finalFile = await prepareCompressedUploadFile(rawFile, {
          maxBytes: TARGET_IMAGE_BYTES,
        });
      } else if (!isPdfFile(rawFile)) {
        throw new Error("Επιτρέπονται μόνο εικόνες ή PDF για το δίπλωμα.");
      }

      const nextPreviewUrl = isPdfFile(finalFile)
        ? ""
        : URL.createObjectURL(finalFile);

      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }

      setLocalFile(finalFile);
      setPreviewUrl(nextPreviewUrl);

      syncFormValues({
        file: finalFile,
        url: nextPreviewUrl,
        name: finalFile.name,
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
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

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

  const hasFile = !!localFile || !!form?.diploma_url;

  return (
    <div className="grid grid-cols-1 gap-4">
      <FieldCard
        icon={FileText}
        label="Δίπλωμα"
        hint="Ανέβασε εικόνα ή PDF του διπλώματός σου"
      >
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept={acceptValue}
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
                {busy ? "Γίνεται επεξεργασία..." : "Επίλεξε δίπλωμα για ανέβασμα"}
              </span>
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <p className="truncate text-sm font-semibold">
                      {localFile?.name || form?.diploma_name || "Ανεβασμένο δίπλωμα"}
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

              {(previewUrl || form?.diploma_url) && !isPdfFile(localFile) ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                  <img
                    src={previewUrl || form?.diploma_url}
                    alt="Diploma preview"
                    loading="lazy"
                    className="max-h-[320px] w-full object-contain"
                  />
                </div>
              ) : null}

              {(isPdfFile(localFile) || String(form?.diploma_url || "").toLowerCase().endsWith(".pdf")) && (
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
              )}
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
            Υποστηρίζονται εικόνες και PDF. Οι εικόνες συμπιέζονται αυτόματα πριν
            αποθηκευτούν.
          </p>
        </div>
      </FieldCard>
    </div>
  );
}