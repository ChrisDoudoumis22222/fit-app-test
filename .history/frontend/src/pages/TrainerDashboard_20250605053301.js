import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import AvatarUpload from "../components/AvatarUpload";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";
import { PLACEHOLDER } from "../utils/avatar";

export default function TrainerDashboard() {
  const { profile, loading } = useAuth();
  const [secret, setSecret] = useState("…loading…");
  const [avatarUrl, setAvatarUrl] = useState(
    profile?.avatar_url || PLACEHOLDER
  );
  const [diplomaUrl, setDiplomaUrl] = useState(profile?.diploma_url || null);
  const [upErr, setUpErr] = useState("");

  // Wait for auth/profile to load
  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;

  // Fetch protected trainer secret message once
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/trainer/secret", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSecret(data.message || data.error);
    })();
  }, []);

  // Delete avatar handler
  const deleteAvatar = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);
    if (!error) {
      setAvatarUrl(PLACEHOLDER);
    }
  };

  // Diploma‐upload handler
  const onDiplomaSelect = async (e) => {
    setUpErr("");
    const file = e.target.files?.[0];
    if (!file) return;

    // File path under diplomas/{trainer-UID}/...
    const path = `${profile.id}/${Date.now()}.${file.name
      .split(".")
      .pop()}`;

    // Upload to the public "diplomas" bucket
    const { error: upError } = await supabase.storage
      .from("diplomas") // must match your bucket name exactly
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (upError) {
      // Since the bucket is public, any error is simply shown
      return setUpErr(upError.message);
    }

    // Fetch the public URL of that file
    const { data } = await supabase.storage
      .from("diplomas")
      .getPublicUrl(path);

    // Update the trainer's profile row with diploma_url
    await supabase
      .from("profiles")
      .update({ diploma_url: data.publicUrl })
      .eq("id", profile.id);

    setDiplomaUrl(data.publicUrl);
  };

  return (
    <>
      {/* TrainerMenu will disable “My services” if profile.diploma_url is null */}
      <TrainerMenu />

      <section style={styles.container}>
        <img src={avatarUrl} alt="avatar" style={styles.avatar} />
        {profile.avatar_url && (
          <button style={styles.deleteBtn} onClick={deleteAvatar}>
            Delete avatar
          </button>
        )}

        <h1>Trainer dashboard 🏋️‍♀️</h1>
        <p style={{ marginTop: 4 }}>
          <strong>Role:</strong> {profile.role}
        </p>
        <p>{secret}</p>

        {/* If no diploma yet, prompt upload */}
        {!diplomaUrl ? (
          <div style={styles.blocker}>
            <p style={{ color: "crimson", marginBottom: 8 }}>
              You must upload at least one diploma or certification
              before you can create services.
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={onDiplomaSelect}
            />
            {upErr && <p style={{ color: "red" }}>{upErr}</p>}
          </div>
        ) : (
          <p style={{ color: "green" }}>
            ✅ Diploma uploaded – you can post services.
          </p>
        )}

        <AvatarUpload />
        <EditProfileForm />
        <ChangePasswordForm />
      </section>
    </>
  );
}

const styles = {
  container: { textAlign: "center", marginTop: 40 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 10,
  },
  deleteBtn: { marginBottom: 12 },
  blocker: {
    border: "1px solid #d33",
    padding: 12,
    margin: "18px auto",
    maxWidth: 360,
    borderRadius: 8,
    background: "#ffecec",
  },
};
