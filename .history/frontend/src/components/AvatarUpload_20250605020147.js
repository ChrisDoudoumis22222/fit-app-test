import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function AvatarUpload() {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}/${Date.now()}.${fileExt}`;

      /* 1) upload to Storage bucket */
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      /* 2) get public URL */
      const { data } = await supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      /* 3) store URL in profile row */
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);
      if (profErr) throw profErr;

      setMsg("✅ Avatar updated!");
    } catch (err) {
      console.error(err);
      setMsg(err.message);
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
