"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";

const TEN_MB = 10 * 1024 * 1024;

const DEFAULT_MAX_INPUT_BYTES = TEN_MB; // 10MB max input
const DEFAULT_HARD_MAX_BYTES = TEN_MB; // 10MB final hard cap
const DEFAULT_TARGET_BYTES = 2.5 * 1024 * 1024; // quality-first image target

const DEFAULT_DIMENSIONS = [2560, 2200, 1920, 1680, 1440, 1280, 1080, 960, 840];
const DEFAULT_QUALITIES = [0.96, 0.93, 0.9, 0.87, 0.84, 0.8, 0.76];

const FILE_INPUT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf";

const CAMERA_INPUT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp"]);
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PDF_MIMES = new Set(["application/pdf"]);

const cn = (...classes) => classes.filter(Boolean).join(" ");

const fmtBytes = (n) => {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n}B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  return `${(kb / 1024).toFixed(2)}MB`;
};

const getFileExt = (fileOrName) => {
  const name =
    typeof fileOrName === "string"
      ? fileOrName
      : String(fileOrName?.name || "");
  const clean = name.trim().toLowerCase();
  const idx = clean.lastIndexOf(".");
  return idx >= 0 ? clean.slice(idx + 1) : "";
};

const replaceExt = (filename, newExt) => {
  const clean = String(filename || "file").trim();
  const idx = clean.lastIndexOf(".");
  const base = idx > 0 ? clean.slice(0, idx) : clean;
  return `${base}.${newExt}`;
};

const mimeToExt = (mime) => {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "bin";
};

const uniq = (arr) => [...new Set(arr.filter(Boolean))];

const supportsWebP = () => {
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
};

const toBlobAsync = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallback below
    }
  }

  return await new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

function getAcceptedFileKind(file) {
  const type = String(file?.type || "").toLowerCase().trim();
  const ext = getFileExt(file);

  if (PDF_MIMES.has(type) || ext === "pdf") return "pdf";
  if (IMAGE_MIMES.has(type) || IMAGE_EXTS.has(ext)) return "image";

  return null;
}

function getNormalizedMime(file) {
  const kind = getAcceptedFileKind(file);
  const ext = getFileExt(file);

  if (kind === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";

  const type = String(file?.type || "").toLowerCase().trim();
  if (IMAGE_MIMES.has(type) || PDF_MIMES.has(type)) return type;

  return "";
}

function getSmartTargetBytes(originalBytes, requestedTargetBytes) {
  if (Number.isFinite(requestedTargetBytes) && requestedTargetBytes > 0) {
    return Math.min(Math.round(requestedTargetBytes), DEFAULT_HARD_MAX_BYTES);
  }

  if (originalBytes <= 900 * 1024) {
    return Math.max(320 * 1024, Math.round(originalBytes * 0.92));
  }

  if (originalBytes <= 2.5 * 1024 * 1024) {
    return Math.round(originalBytes * 0.72);
  }

  if (originalBytes <= 5 * 1024 * 1024) {
    return Math.round(originalBytes * 0.58);
  }

  return Math.round(originalBytes * 0.48);
}

async function imageHasTransparency(source, width, height) {
  try {
    const sampleMax = 64;
    const scale = Math.min(1, sampleMax / Math.max(width, height));
    const sw = Math.max(1, Math.round(width * scale));
    const sh = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
    if (!ctx) return false;

    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(source, 0, 0, sw, sh);

    const { data } = ctx.getImageData(0, 0, sw, sh);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }

    return false;
  } catch {
    return false;
  }
}

function getOutputTypes(sourceType, hasAlpha) {
  const canWebP = supportsWebP();

  if (hasAlpha) {
    return uniq([canWebP ? "image/webp" : null, "image/png"]);
  }

  if (sourceType === "image/jpeg") {
    return uniq([canWebP ? "image/webp" : null, "image/jpeg"]);
  }

  if (sourceType === "image/png") {
    return uniq([canWebP ? "image/webp" : null, "image/png"]);
  }

  if (sourceType === "image/webp") {
    return uniq([canWebP ? "image/webp" : null, "image/jpeg"]);
  }

  return uniq([canWebP ? "image/webp" : null, "image/jpeg"]);
}

async function compressImageToTarget(
  file,
  {
    targetBytes = DEFAULT_TARGET_BYTES,
    hardMaxBytes = DEFAULT_HARD_MAX_BYTES,
    dimensions = DEFAULT_DIMENSIONS,
    qualities = DEFAULT_QUALITIES,
    alwaysReencode = true,
  } = {}
) {
  const fileType = getNormalizedMime(file);
  if (!fileType.startsWith("image/")) {
    throw new Error("Επιτρέπονται μόνο PNG, JPG, JPEG, WEBP ή PDF.");
  }

  const resolvedTargetBytes = getSmartTargetBytes(file.size, targetBytes);

  if (!alwaysReencode && file.size <= Math.min(resolvedTargetBytes, hardMaxBytes)) {
    return {
      file,
      blob: file,
      type: fileType,
      width: null,
      height: null,
      hitTarget: true,
      skipped: true,
      originalBytes: file.size,
      outputBytes: file.size,
      fileKind: "image",
      fileName: file.name,
      qualityPreserved: true,
    };
  }

  const img = await decodeImage(file);

  try {
    const width = img.width;
    const height = img.height;
    const maxSide = Math.max(width, height);
    const hasAlpha = await imageHasTransparency(img, width, height);
    const outputTypes = getOutputTypes(fileType, hasAlpha);

    const allDims = uniq([maxSide, ...dimensions.filter((d) => d < maxSide)]);

    let best = null;

    for (const maxDim of allDims) {
      const scale = Math.min(1, maxDim / maxSide);
      const tw = Math.max(1, Math.round(width * scale));
      const th = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;

      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) throw new Error("Αποτυχία δημιουργίας canvas.");

      ctx.clearRect(0, 0, tw, th);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, tw, th);

      for (const outType of outputTypes) {
        const qSteps = outType === "image/png" ? [undefined] : qualities;

        for (const q of qSteps) {
          const blob = await toBlobAsync(canvas, outType, q);
          if (!blob) continue;

          const candidate = {
            blob,
            type: outType,
            width: tw,
            height: th,
            quality: q ?? null,
          };

          if (!best || blob.size < best.blob.size) {
            best = candidate;
          }

          if (blob.size <= resolvedTargetBytes) {
            const notWorthReencoding = blob.size >= file.size * 0.98;
            if (notWorthReencoding && file.size <= hardMaxBytes) {
              return {
                file,
                blob: file,
                type: fileType,
                width,
                height,
                hitTarget: file.size <= resolvedTargetBytes,
                skipped: true,
                originalBytes: file.size,
                outputBytes: file.size,
                fileKind: "image",
                fileName: file.name,
                qualityPreserved: true,
                hasAlpha,
              };
            }

            const finalFile = new File(
              [blob],
              replaceExt(file.name, mimeToExt(outType)),
              {
                type: outType,
                lastModified: Date.now(),
              }
            );

            return {
              file: finalFile,
              blob,
              type: outType,
              width: tw,
              height: th,
              hitTarget: true,
              skipped: false,
              originalBytes: file.size,
              outputBytes: blob.size,
              fileKind: "image",
              fileName: finalFile.name,
              qualityPreserved: true,
              hasAlpha,
            };
          }
        }
      }
    }

    if (!best) {
      throw new Error("Αποτυχία συμπίεσης εικόνας.");
    }

    const notWorthReencoding = best.blob.size >= file.size * 0.98;
    if (notWorthReencoding && file.size <= hardMaxBytes) {
      return {
        file,
        blob: file,
        type: fileType,
        width,
        height,
        hitTarget: file.size <= resolvedTargetBytes,
        skipped: true,
        originalBytes: file.size,
        outputBytes: file.size,
        fileKind: "image",
        fileName: file.name,
        qualityPreserved: true,
        hasAlpha,
      };
    }

    if (best.blob.size > hardMaxBytes) {
      throw new Error(
        `Η εικόνα παραμένει πάνω από ${fmtBytes(hardMaxBytes)} και μετά τη συμπίεση.`
      );
    }

    const finalFile = new File(
      [best.blob],
      replaceExt(file.name, mimeToExt(best.type)),
      {
        type: best.type,
        lastModified: Date.now(),
      }
    );

    return {
      file: finalFile,
      blob: best.blob,
      type: best.type,
      width: best.width,
      height: best.height,
      hitTarget: false,
      skipped: false,
      originalBytes: file.size,
      outputBytes: best.blob.size,
      fileKind: "image",
      fileName: finalFile.name,
      qualityPreserved: true,
      hasAlpha,
    };
  } finally {
    if (typeof img?.close === "function") {
      try {
        img.close();
      } catch {
        // ignore
      }
    }
  }
}

export default function CompressedImageUploader({
  onCompressed,
  className = "",
  disabled = false,
  initialPreview = "",
  title = "Ανέβασμα αρχείου",
  subtitle = "Οι εικόνες βελτιστοποιούνται πριν το upload. Τα PDF κρατιούνται όπως είναι.",
  selectLabel = "Επιλογή αρχείου",
  cameraLabel = "Κάμερα",
  showCameraButton = true,
  showPreview = true,
  targetBytes = DEFAULT_TARGET_BYTES,
  hardMaxBytes = DEFAULT_HARD_MAX_BYTES,
  maxInputBytes = DEFAULT_MAX_INPUT_BYTES,
  alwaysReencode = true,
  cameraCapture = "environment",
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const objectUrlRef = useRef("");

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(initialPreview || "");
  const [previewKind, setPreviewKind] = useState(initialPreview ? "image" : "");
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    setPreviewUrl(initialPreview || "");
    setPreviewKind(initialPreview ? "image" : "");
  }, [initialPreview]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const flash = useCallback((type, text) => {
    setNotice({ type, text });
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setNotice(null), 2800);
  }, []);

  const infoText = useMemo(() => {
    if (!meta) return null;
    return `${fmtBytes(meta.originalBytes)} → ${fmtBytes(meta.outputBytes)}`;
  }, [meta]);

  const clearSelection = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }

    setPreviewUrl("");
    setPreviewKind("");
    setMeta(null);
    setNotice(null);
    setError("");

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, []);

  const handlePickedFile = useCallback(
    async (file) => {
      if (!file) return;

      const kind = getAcceptedFileKind(file);

      if (!kind) {
        const msg = "Επιτρέπονται μόνο PNG, JPG, JPEG, WEBP ή PDF.";
        setError(msg);
        flash("error", msg);
        return;
      }

      if (file.size > maxInputBytes) {
        const msg = `Το αρχείο είναι πολύ μεγάλο. Μέγιστο επιτρεπτό μέγεθος: ${fmtBytes(
          maxInputBytes
        )}.`;
        setError(msg);
        flash("error", msg);
        return;
      }

      try {
        setBusy(true);
        setError("");
        setNotice(null);

        let result;

        if (kind === "pdf") {
          result = {
            file,
            blob: file,
            type: "application/pdf",
            width: null,
            height: null,
            hitTarget: true,
            skipped: true,
            originalBytes: file.size,
            outputBytes: file.size,
            fileKind: "pdf",
            fileName: file.name,
            qualityPreserved: true,
          };
        } else {
          result = await compressImageToTarget(file, {
            targetBytes,
            hardMaxBytes,
            alwaysReencode,
          });
        }

        setMeta(result);
        setPreviewKind(result.fileKind);

        if (showPreview) {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }

          const nextUrl = URL.createObjectURL(result.file);
          objectUrlRef.current = nextUrl;
          setPreviewUrl(nextUrl);
        }

        await onCompressed?.(result.file, result);

        if (result.fileKind === "pdf") {
          flash("success", `Το PDF είναι έτοιμο για upload (${fmtBytes(result.outputBytes)}).`);
        } else if (result.skipped) {
          flash("success", `Η εικόνα είναι έτοιμη (${fmtBytes(result.outputBytes)}).`);
        } else if (result.hitTarget) {
          flash(
            "success",
            `Η εικόνα βελτιστοποιήθηκε: ${fmtBytes(result.originalBytes)} → ${fmtBytes(
              result.outputBytes
            )}.`
          );
        } else {
          flash(
            "success",
            `Έγινε ισχυρή συμπίεση: ${fmtBytes(result.originalBytes)} → ${fmtBytes(
              result.outputBytes
            )}.`
          );
        }
      } catch (err) {
        console.error("CompressedImageUploader error →", err);
        const msg = err?.message || "Αποτυχία επεξεργασίας αρχείου.";
        setError(msg);
        flash("error", msg);
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
      }
    },
    [alwaysReencode, flash, hardMaxBytes, maxInputBytes, onCompressed, showPreview, targetBytes]
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white sm:text-lg">{title}</h3>
            <p className="mt-1 text-sm text-white/55">{subtitle}</p>
          </div>

          {busy ? (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Επεξεργασία...
            </div>
          ) : null}
        </div>

        {showPreview ? (
          <div className="mt-4 flex justify-center">
            {previewKind === "image" && previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                loading="lazy"
                decoding="async"
                className="h-auto max-h-52 w-auto max-w-full rounded-2xl bg-white/5 object-contain"
              />
            ) : previewKind === "pdf" && meta ? (
              <div className="flex w-full max-w-md flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center">
                <FileText className="h-8 w-8 text-white/75" />
                <div className="mt-2 text-sm font-semibold text-white">
                  {meta.fileName || "PDF αρχείο"}
                </div>
                <div className="mt-1 text-xs text-white/55">{fmtBytes(meta.outputBytes)}</div>

                {previewUrl ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                  >
                    Άνοιγμα PDF
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="flex h-40 w-full max-w-md items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-white/45">
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-7 w-7" />
                  <span className="text-sm">Δεν υπάρχει preview ακόμα</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-4 text-center text-xs text-white/45">
          PNG / JPG / JPEG / WEBP / PDF • έως {fmtBytes(maxInputBytes)}
        </div>

        {infoText ? (
          <div className="mt-2 text-center text-xs text-emerald-200">{infoText}</div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {selectLabel}
          </button>

          {showCameraButton ? (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {cameraLabel}
            </button>
          ) : null}

          {(previewUrl || meta) ? (
            <button
              type="button"
              onClick={clearSelection}
              disabled={disabled || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-rose-200 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Καθαρισμός
            </button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          onChange={(e) => handlePickedFile(e.target.files?.[0])}
          disabled={disabled || busy}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept={CAMERA_INPUT_ACCEPT}
          capture={cameraCapture}
          onChange={(e) => handlePickedFile(e.target.files?.[0])}
          disabled={disabled || busy}
          className="hidden"
        />

        {(notice || error) ? (
          <div className="mt-4 flex justify-center">
            {notice ? (
              <div
                className={cn(
                  "inline-flex w-full max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm",
                  notice.type === "success"
                    ? "bg-emerald-500/10 text-emerald-200"
                    : "bg-rose-500/10 text-rose-200"
                )}
              >
                {notice.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{notice.text}</span>
              </div>
            ) : (
              <div className="w-full max-w-md rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}