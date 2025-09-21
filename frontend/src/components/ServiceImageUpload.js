import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ServiceImageUpload({ serviceId, onUploaded }) {
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);

    const ext = file.name.split(".").pop();
    const path = `${serviceId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("service-images")
      .upload(path, file);
    if (error) {
      alert(error.message);
      setBusy(false);
      return;
    }
    const { data } = await supabase.storage
      .from("service-images")
      .getPublicUrl(path);
    onUploaded(data.publicUrl);
    setBusy(false);
  };

  return (
    <label style={{ cursor: "pointer", color: "#007bff" }}>
      {busy ? "Uploading…" : "Upload image"}
      <input type="file" accept="image/*" onChange={handle} hidden />
    </label>
  );
}
