import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function AvatarUpload() {
  const { profile } = useAuth();                       // current user profile
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  /*───────────────────────────────────────────────
    Handle <input type="file"> change event
  ───────────────────────────────────────────────*/
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMsg("");
    setUploading(true);

    try {
      /* 1. build path   userId/timestamp.ext */
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      /* 2. upload (upsert=true overwrites old avatar) */
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        if (uploadErr.statusCode === "403") {
          throw new Error(
            "Upload blocked by Storage RLS policy. Ask admin to grant insert permissions."
          );
        }
        throw uploadErr;
      }

      /* 3. get public URL */
      const { data } = await supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      /* 4. save URL in profile row */
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);
      if (profErr) throw profErr;

      /* 5. immediate feedback: reload page or state */
      setMsg("✅ Avatar updated!");
      // optional: force a refetch in AuthProvider by reloading:
      // window.location.reload();

    } catch (err) {
      console.error(err);
      setMsg(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      // clear the file input so the same file can be re-selected if needed
      e.target.value = "";
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
