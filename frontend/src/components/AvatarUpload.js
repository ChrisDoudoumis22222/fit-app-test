/*  AvatarUpload.jsx  –  Lucide button + DB sync
    --------------------------------------------
    • Keeps the Camera / Loader2 icon button UI
    • Uploads to Supabase storage (`avatars` bucket by default)
    • On success:
        1. writes the public URL to `profiles.avatar_url`
        2. calls onUpload(url) so the parent can refresh its state
*/

"use client";

import { useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Camera, Loader2 } from "lucide-react";   // npm i lucide-react if needed

export default function AvatarUpload({
  url,
  onUpload,
  bucket = "avatars",
  icon   = <Camera size={16} />,   // customise from parent if you like
}) {
  const [uploading, setUploading] = useState(false);
  const [error,      setError]    = useState("");
  const fileInputRef = useRef(null);

  /* helper: true if current url is a real uploaded image */
  const hasAvatar =
    !!url &&
    !url.startsWith("data:image/svg+xml") &&
    !url.includes("Avatar%3C");   // matches your placeholder logic

  /* -------------------------------------------------- */
  const uploadAvatar = async (e) => {
    try {
      setUploading(true);
      setError("");

      const file = e.target.files?.[0];
      if (!file)    return setError("Please choose an image.");
      if (file.size > 5 * 1024 * 1024)
        return setError("File is larger than 5 MB.");

      /* current logged-in user */
      const { data: { user }, error: usrErr } = await supabase.auth.getUser();
      if (usrErr || !user) return setError("No active session.");

      /* create unique path */
      const ext      = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      /* upload to storage */
      const { error: upErr } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;

      /* get public URL */
      const { data: urlData } = await supabase
        .storage
        .from(bucket)
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-buster

      /* --- NEW: persist to profiles table --- */
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      /* notify parent */
      onUpload?.(publicUrl);
    } catch (err) {
      console.error("Avatar upload error →", err);
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* -------------------------------------------------- */
  const label = uploading
    ? "Uploading…"
    : hasAvatar
    ? "Αλλαγή"
    : "Change avatar";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          backgroundColor: uploading ? "#6b7280" /* gray-500 */ : "#2563eb", /* indigo-600 */
          color: "white",
          border: "none",
          padding: "10px 18px",
          borderRadius: 6,
          cursor: uploading ? "not-allowed" : "pointer",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {uploading ? <Loader2 className="animate-spin" size={16} /> : icon}
        {label}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        style={{ display: "none" }}
      />

      {!!error && (
        <span style={{ color: "#ef4444", fontSize: 14 }}>{error}</span>
      )}
    </div>
  );
}
