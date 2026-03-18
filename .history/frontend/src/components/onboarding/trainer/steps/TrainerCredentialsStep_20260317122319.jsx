"use client";

import React, { useRef, useState } from "react";
import {
  Award,
  FileText,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import FieldCard from "../FieldCard";
import { prepareCompressedUploadFile } from "../common/CompressedImageUploader";

const DIPLOMA_ACCEPT =
  ".pdf,.webp,.png,.jpeg,.jpg,application/pdf,image/webp,image/png,image/jpeg";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/webp",
  "image/png",
  "image/jpeg",
];

const ALLOWED_EXTENSIONS = [".pdf", ".webp", ".png", ".jpeg", ".jpg"];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const TARGET_IMAGE_BYTES = Math.round(2.5 * 1024 * 1024);

function getFileExt(file) {
  const name = String(file?.name || "").toLowerCase();
  const parts = name.split(".");
  return parts.length > 1 ? `.${parts.pop()}` : "";
}

function isPdfFile(file) {
  const ext = getFileExt(file);
  return file?.type === "application/pdf" || ext === ".pdf";
}

function isImageFile(file) {
  const type = String(file?.type || "");
  const ext = getFileExt(file);

  return (
    type === "image/webp" ||
    type === "image/png" ||
    type === "image/jpeg" ||
    [".webp", ".png", ".jpeg", ".jpg"].includes(ext)
  );
}

function isAllowedFile(file) {
  const ext = getFileExt(file);
  const allowedMime = ALLOWED_MIME_TYPES.includes(String(file?.type || ""));
  const allowedExt = ALLOWED_EXTENSIONS.includes(ext);
  return allowedMime || allowedExt;
}

function fmtBytes(n) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
}

function getDisplayFileName(form) {
  if (form?.diploma_file?.name) return form.diploma_file.name;

  if (form?.diploma_url) {
    try {
      const url = new URL(form.diploma_url);
      const pathname = url.pathname || "";
      const fileName = pathname.split("/").pop();
      return fileName || "Αποθηκευμένο αρχείο";
    } catch {
      return "Αποθηκευμένο αρχείο";
    }
  }

  return "";
}

export default function TrainerCredentialsStep({ form, setField, setForm }) {
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileSuccess, setFileSuccess] = useState("");

  const selectedFileName = getDisplayFileName(form);
  const selectedFileSize = form?.diploma_file?.size
    ? fmtBytes(form.diploma_file.size)
    : "";

  const handlePickFile = () => {
    setFileError("");
    setFileSuccess("");
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setFileError("");
    setFileSuccess("");

    setForm?.((prev) => ({
      ...prev,
      diploma_file: null,
      diploma_url: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setFileError("");
    setFileSuccess("");

    if (!isAllowedFile(rawFile)) {
      setFileError("Επιτρέπονται μόνο PDF, WEBP, PNG, JPEG ή JPG αρχεία.");
      e.target.value = "";
      return;
    }

    if (rawFile.size > MAX_FILE_BYTES) {
      setFileError("Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 10MB.");
      e.target.value = "";
      return;
    }

    if (!setForm) {
      setFileError("Λείπει το setForm από το parent component.");
      e.target.value = "";
      return;
    }

    setProcessing(true);

    try {
      let finalFile = rawFile;

      if (isImageFile(rawFile)) {
        const prepared = await prepareCompressedUploadFile(rawFile, {
          maxFileBytes: MAX_FILE_BYTES,
          targetImageBytes: TARGET_IMAGE_BYTES,
        });

        finalFile =
          prepared?.file ||
          prepared?.compressedFile ||
          prepared?.outputFile ||
          prepared;

        if (!finalFile) {
          throw new Error("Δεν έγινε σωστή επεξεργασία της εικόνας.");
        }
      }

      setForm((prev) => ({
        ...prev,
        diploma_file: finalFile,
        diploma_url: "",
      }));

      setFileSuccess(
        isPdfFile(finalFile)
          ? "Το PDF προστέθηκε με επιτυχία."
          : "Η εικόνα συμπιέστηκε και προστέθηκε με επιτυχία."
      );
    } catch (err) {
      console.error("Diploma processing error:", err);
      setFileError(
        err?.message || "Αποτυχία επεξεργασίας του αρχείου. Προσπάθησε ξανά."
      );
      e.target.value = "";
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <FieldCard
        icon={Award}
        label="Certifications"
        hint="Ένα ανά γραμμή ή με κόμμα"
      >
        <textarea
          value={form.certifications_text}
          onChange={setField("certifications_text")}
          rows={5}
          placeholder={"π.χ.\nACE Personal Trainer\nTRX Coach\nPilates Mat"}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500 outline-none resize-none focus:border-white/30"
        />
      </FieldCard>

      <FieldCard
        icon={FileText}
        label="Diploma / Certificate File"
        hint="Επιτρέπονται μόνο PDF, WEBP, PNG, JPEG ή JPG"
      >
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={DIPLOMA_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFileName ? (
            <button
              type="button"
              onClick={handlePickFile}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-4 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:opacity-60"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {processing ? "Επεξεργασία αρχείου..." : "Επιλογή αρχείου"}
            </button>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                    {isPdfFile(form?.diploma_file || { name: selectedFileName }) ? (
                      <FileText className="h-4 w-4 text-white" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-white" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {selectedFileName}
                    </div>
                    {selectedFileSize ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        {selectedFileSize}
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={processing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 disabled:opacity-60"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Αλλαγή αρχείου
                </button>
              </div>
            </div>
          )}

          {fileSuccess ? (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fileSuccess}</span>
            </div>
          ) : null}

          {fileError ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          ) : null}
        </div>
      </FieldCard>
    </div>
  );
}