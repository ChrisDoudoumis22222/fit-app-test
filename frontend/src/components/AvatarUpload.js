// FILE: src/components/AvatarUpload.jsx
"use client";

import { useState, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { Camera, Loader2, Trash2 } from "lucide-react";

export default function AvatarUpload({
  url,
  onUpload,
  onDelete,
  bucket = "avatars",
  icon = <Camera className="h-4 w-4" />,
  className = "",
  disabled = false,
  maxSizeMB = 5,
  placeholderUrl, // ✅ optional: pass your placeholder to hide delete on default
  deleteLabel = "Αφαίρεση",
  uploadLabelDefault = "Αλλαγή Avatar",
  uploadLabelChange = "Αλλαγή",
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  const isDicebearPlaceholder = useMemo(() => {
    if (!url) return false;
    return /api\.dicebear\.com\/.*\/initials\/svg/i.test(url);
  }, [url]);

  // ✅ “real avatar” = public URL AND not placeholder
  const hasAvatar = useMemo(() => {
    if (!url) return false;
    if (!/^https?:\/\//i.test(url)) return false;

    // ignore common placeholder patterns
    if (url.startsWith("data:image/svg+xml")) return false;
    if (url.includes("Avatar%3C")) return false;
    if (isDicebearPlaceholder) return false;

    // ignore explicit placeholderUrl if provided
    if (placeholderUrl && url === placeholderUrl) return false;

    return true;
  }, [url, placeholderUrl, isDicebearPlaceholder]);

  const hardDisabled = disabled || uploading;

  /* ---------------- Upload ---------------- */
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Το αρχείο πρέπει να είναι μικρότερο από ${maxSizeMB} MB.`);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");

      const {
        data: { user },
        error: usrErr,
      } = await supabase.auth.getUser();
      if (usrErr || !user) throw new Error("Δεν υπάρχει ενεργή συνεδρία.");

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      onUpload?.(finalUrl);
    } catch (err) {
      console.error("Σφάλμα ανεβάσματος avatar →", err);
      setError(err?.message || "Αποτυχία ανεβάσματος.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  /* ---------------- Delete ---------------- */
  const deleteAvatar = async () => {
    if (!hasAvatar) return;

    const ok = window.confirm("Θέλεις να αφαιρέσεις την εικόνα προφίλ;");
    if (!ok) return;

    try {
      setUploading(true);
      setError("");

      const {
        data: { user },
        error: usrErr,
      } = await supabase.auth.getUser();
      if (usrErr || !user) throw new Error("Δεν υπάρχει ενεργή συνεδρία.");

      // Public URL format includes /storage/v1/object/public/[bucket]/[path] :contentReference[oaicite:0]{index=0}
      const path = decodeURI(url)
        .split(`/object/public/${bucket}/`)[1]
        ?.split("?")[0];

      if (!path) throw new Error("Δεν βρέθηκε path για διαγραφή.");

      const { error: remErr } = await supabase.storage.from(bucket).remove([path]);
      if (remErr) throw remErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      onDelete?.();
    } catch (err) {
      console.error("Σφάλμα διαγραφής avatar →", err);
      setError(err?.message || "Αποτυχία διαγραφής.");
    } finally {
      setUploading(false);
    }
  };

  const label = uploading
    ? "Ανέβασμα…"
    : hasAvatar
    ? uploadLabelChange
    : uploadLabelDefault;

  return (
    <div className={["w-full", className].join(" ")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Upload */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={hardDisabled}
          className={[
            "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
            "bg-indigo-600 hover:bg-indigo-500 text-white",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
          {label}
        </button>

        {/* Delete (only if real avatar) */}
        {hasAvatar ? (
          <button
            type="button"
            onClick={deleteAvatar}
            disabled={hardDisabled}
            className={[
              "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold",
              "bg-rose-500/15 hover:bg-rose-500/22 text-rose-200 border border-rose-500/25",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <Trash2 className="h-4 w-4" />
            {deleteLabel}
          </button>
        ) : (
          // keep layout consistent when there's no delete
          <div className="hidden sm:block" />
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={hardDisabled}
        className="hidden"
      />

      {error && <div className="mt-2 text-sm text-rose-400">{error}</div>}
    </div>
  );
}