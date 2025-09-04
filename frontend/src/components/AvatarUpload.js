"use client";

import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Camera, Loader2, Trash2 } from "lucide-react";

export default function AvatarUpload({
  url,
  onUpload,
  onDelete,
  bucket = "avatars",
  icon   = <Camera className="h-4 w-4" />,
}) {
  const [uploading, setUploading] = useState(false);
  const [error,      setError]    = useState("");
  const fileInput = useRef(null);

  /* αληθινό avatar = public URL */
  const hasAvatar =
    !!url && url.startsWith("http") &&
    !url.startsWith("data:image/svg+xml") &&
    !url.includes("Avatar%3C");

  /* ---------------- Ανέβασμα ---------------- */
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Το αρχείο πρέπει να είναι μικρότερο από 5 MB.");
      fileInput.current.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");

      const { data: { user }, error: usrErr } = await supabase.auth.getUser();
      if (usrErr || !user) throw new Error("Δεν υπάρχει ενεργή συνεδρία.");

      const ext      = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      onUpload?.(finalUrl);
    } catch (err) {
      console.error("Σφάλμα ανεβάσματος avatar →", err);
      setError(err.message || "Αποτυχία ανεβάσματος.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  /* ---------------- Διαγραφή ---------------- */
  const deleteAvatar = async () => {
    if (!hasAvatar) return;

    try {
      setUploading(true);
      setError("");

      const { data: { user }, error: usrErr } = await supabase.auth.getUser();
      if (usrErr || !user) throw new Error("Δεν υπάρχει ενεργή συνεδρία.");

      const path = decodeURI(url)
        .split(`/object/public/${bucket}/`)[1]
        .split("?")[0];

      const { error: remErr } = await supabase
        .storage
        .from(bucket)
        .remove([path]);
      if (remErr) throw remErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      onDelete?.();
    } catch (err) {
      console.error("Σφάλμα διαγραφής avatar →", err);
      setError(err.message || "Αποτυχία διαγραφής.");
    } finally {
      setUploading(false);
    }
  };

  const label = uploading
    ? "Ανέβασμα…"
    : hasAvatar
    ? "Αλλαγή"
    : "Αλλαγή Avatar";

  /* ---------------- UI ---------------- */
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Κουμπί Ανεβάσματος */}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                      ${uploading
                        ? "bg-neutral-500 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500"} 
                      disabled:opacity-50`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
          {label}
        </button>

        {/* Κουμπί Διαγραφής – εμφανίζεται μόνο με αληθινό avatar */}
        {hasAvatar && (
          <button
            type="button"
            onClick={deleteAvatar}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Διαγραφή
          </button>
        )}
      </div>

      {/* Κρυφό input */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        className="hidden"
      />

      {/* Μήνυμα Σφάλματος */}
      {error && (
        <span className="text-sm text-rose-400">{error}</span>
      )}
    </div>
  );
}
