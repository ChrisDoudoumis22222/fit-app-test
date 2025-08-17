"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  FileText,
  GraduationCap,
  Download,
  Loader2,
  CheckCircle2,
  X,
  Trash2,
} from "lucide-react";

export default function DiplomaUpload({
  profileId,
  currentUrl,
  onChange,
  bucket = "diplomas",
  deletePreviousOnReplace = true,
}) {
  const [url, setUrl] = useState(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef(null);

  useEffect(() => setUrl(currentUrl || ""), [currentUrl]);
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const isImage = (u) => /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(u?.split("?")[0]);
  const isPDF = (u) => /\.pdf$/i.test(u?.split("?")[0]);

  const getFileNameFromUrl = (u) => {
    if (!u) return "";
    try {
      return decodeURIComponent(u.split("/").pop().split("?")[0]);
    } catch {
      return "δίπλωμα";
    }
  };

  // Works for public or signed URLs from Supabase Storage
  const extractStoragePath = (publicOrSignedUrl) => {
    try {
      const u = new URL(publicOrSignedUrl);
      const afterObject = u.pathname.split("/object/")[1]; // "public/<bucket>/<path>" OR "sign/<bucket>/<path>"
      if (!afterObject) return null;
      const parts = afterObject.split("/");
      const objectPath = parts.slice(2).join("/");
      return objectPath ? { objectPath } : null;
    } catch {
      return null;
    }
  };

  const updateProfileDiploma = async (newUrl) => {
    // Writes the URL (or null) to profiles.diploma_url
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ diploma_url: newUrl, updated_at: new Date().toISOString() })
      .eq("id", profileId);
    if (upErr) {
      throw new Error(`Αποτυχία ενημέρωσης προφίλ: ${upErr.message}`);
    }
  };

  const handleSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Το αρχείο πρέπει να είναι μικρότερο από 10MB");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    const oldUrl = url;

    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${profileId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) throw upErr;

      // If bucket is public:
      const { data } = await supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Save to DB first (so UI and DB are in sync)
      await updateProfileDiploma(publicUrl);

      // Update UI + parent
      setUrl(publicUrl);
      onChange?.(publicUrl);

      // Optionally delete old storage object
      if (deletePreviousOnReplace && oldUrl) {
        const parsed = extractStoragePath(oldUrl);
        if (parsed?.objectPath) {
          await supabase.storage.from(bucket).remove([parsed.objectPath]);
        }
      }

      setSuccess("Το δίπλωμά σας ανέβηκε επιτυχώς!");
    } catch (err) {
      setError(err.message || "Σφάλμα κατά το ανέβασμα");
      console.error("Diploma upload error →", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!url) return;
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const parsed = extractStoragePath(url);
      if (!parsed?.objectPath) throw new Error("Δεν βρέθηκε το αρχείο προς διαγραφή.");

      // Delete from storage
      const { error: delErr } = await supabase.storage.from(bucket).remove([parsed.objectPath]);
      if (delErr) throw delErr;

      // Clear DB column
      await updateProfileDiploma(null);

      // Update UI + parent
      setUrl("");
      onChange?.(null);

      setSuccess("Το δίπλωμά σας διαγράφηκε.");
    } catch (err) {
      setError(err.message || "Σφάλμα κατά τη διαγραφή");
      console.error("Diploma delete error →", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Success toast */}
      {success && (
        <div
          className="pointer-events-auto fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-emerald-600/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>{success}</span>
          <button
            className="ml-2 rounded-md bg-white/10 p-1 hover:bg-white/20"
            onClick={() => setSuccess("")}
            aria-label="Κλείσιμο ειδοποίησης"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {url ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex flex-col items-center gap-3">
            {isImage(url) ? (
              <div className="flex flex-col items-center">
                <img
                  src={url}
                  alt="Προεπισκόπηση Διπλώματος"
                  className="max-h-48 rounded-lg mb-2"
                />
                <span className="text-sm text-emerald-300 flex items-center gap-1">
                  <FileText className="h-4 w-4" /> Εικόνα Διπλώματος
                </span>
              </div>
            ) : isPDF(url) ? (
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-emerald-400 mb-2" />
                <span className="text-sm text-emerald-300 flex items-center gap-1">
                  PDF: {getFileNameFromUrl(url)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-emerald-300">Το δίπλωμα έχει ανέβει</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-500/80 px-3 py-1.5 text-xs hover:bg-blue-400 transition-colors"
              >
                <Download className="h-3 w-3" /> Προβολή
              </a>

              <label className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/80 px-3 py-1.5 text-xs hover:bg-indigo-400 transition-colors cursor-pointer disabled:opacity-50">
                {uploading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Μεταφόρτωση…
                  </>
                ) : (
                  "Αντικατάσταση"
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleSelect}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-lg bg-red-500/80 px-3 py-1.5 text-xs hover:bg-red-400 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Διαγραφή…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" /> Διαγραφή
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-white/20 p-6 text-center">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-white/40" />
          <p className="text-white/60 mb-4">Ανεβάστε το δίπλωμα ή την πιστοποίησή σας</p>

          <label className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/90 px-4 py-2 text-sm font-medium hover:bg-indigo-400 transition-colors cursor-pointer disabled:opacity-50">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Μεταφόρτωση…
              </>
            ) : (
              "Επιλογή Αρχείου"
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <p className="text-xs text-white/40 mt-2">
            Αποδεκτά: PDF, JPG, PNG, WEBP (έως 10MB)
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg bg-red-500/20 p-3 text-sm text-red-300 flex items-center gap-2"
          role="alert"
          aria-live="assertive"
        >
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}
