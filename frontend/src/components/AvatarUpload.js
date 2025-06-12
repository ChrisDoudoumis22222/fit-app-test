"use client"

import { useState, useRef } from "react"
import { supabase } from "../supabaseClient"

/**
 * Avatar uploader χωρίς preview.
 * Το κουμπί δείχνει:
 *   • "Edit avatar"  ─ αν ο χρήστης έχει ήδη avatar
 *   • "Change avatar" ─ αν δεν έχει avatar ακόμη
 *   • "Uploading…"   ─ κατά τη μεταφορά αρχείου
 */
export default function AvatarUpload({ url, onUpload, bucket = "avatars" }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  /** true όταν το url δεν είναι κενό και δεν είναι placeholder svg */
  const hasAvatar =
    !!url && !url.startsWith("data:image/svg+xml") && !url.includes("Avatar%3C")

  /* handle file → upload → publicUrl */
  const uploadAvatar = async (e) => {
    try {
      setUploading(true)
      setError("")

      const file = e.target.files?.[0]
      if (!file) {
        setError("Please choose an image.")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File is larger than 5 MB.")
        return
      }

      const { data: { user }, error: usrErr } = await supabase.auth.getUser()
      if (usrErr || !user) {
        setError("No active session.")
        return
      }

      const ext      = file.name.split(".").pop()
      const fileName = `avatar-${Date.now()}.${ext}`
      const filePath = `${user.id}/${fileName}`

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true, cacheControl: "3600" })
      if (upErr) throw upErr

      const { data: urlData } = await supabase.storage.from(bucket).getPublicUrl(filePath)
      onUpload?.(`${urlData.publicUrl}?t=${Date.now()}`)
    } catch (err) {
      setError(err.message)
      console.error("Avatar upload error →", err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  /* ----------------------------------------------------------- */
  const label = uploading
    ? "Uploading…"
    : hasAvatar
    ? "Edit avatar"
    : "Change avatar"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          backgroundColor: uploading ? "#9ca3af" : "#2563eb",
          color: "white",
          border: "none",
          padding: "10px 18px",
          borderRadius: 6,
          cursor: uploading ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
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
        <span style={{ color: "#ef4444", fontSize: 14 }}>
          {error}
        </span>
      )}
    </div>
  )
}
