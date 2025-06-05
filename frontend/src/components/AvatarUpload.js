import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function AvatarUpload() {
  const { profile } = useAuth();
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";                // reset so same file can be re-selected

    setMsg("");
    setUploading(true);

    try {
      /* 1️⃣  build path   userId/timestamp.ext */
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/${Date.now()}.${ext}`;

      /* 2️⃣  upload (INSERT only – no upsert) */
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file);            // ← NO upsert

      if (upErr) {
        if (upErr.statusCode === "403") {
          throw new Error(
            "Storage RLS blocked the upload. Check the INSERT policy on bucket avatars."
          );
        }
        throw upErr;
      }

      /* 3️⃣  get public URL */
      const { data } = await supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      const publicUrl = data.publicUrl;

      /* 4️⃣  save URL in profile row */
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);
      if (profErr) throw profErr;

      setMsg("✅ Avatar updated!");
    } catch (err) {
      console.error(err);
      setMsg(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.box}>
      <label style={styles.label}>
        {uploading ? "Uploading…" : "Upload avatar"}
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: "none" }}
        />
      </label>
      {msg && <p style={{ marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

const styles = {
  box: { marginTop: 16, textAlign: "center" },
  label: {
    display: "inline-block",
    padding: "6px 12px",
    background: "#007bff",
    color: "#fff",
    borderRadius: 4,
    cursor: "pointer",
  },
};
