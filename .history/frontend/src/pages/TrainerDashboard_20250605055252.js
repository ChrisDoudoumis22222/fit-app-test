import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";        // anon/public client
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
  const [isUploading, setIsUploading] = useState(false);

  // Wait for profile to be ready
  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;

  // Fetch protected trainer secret once
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

  // Diploma‐upload handler (calls /api/update-diploma, then re-fetches profile)
  const onDiplomaSelect = async (e) => {
    setUpErr("");
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // 1) Upload to public "diplomas" bucket under diplomas/{UID}/...
    const path = `${profile.id}/${Date.now()}.${file.name
      .split(".")
      .pop()}`;
    const { error: upError } = await supabase.storage
      .from("diplomas") // must match your bucket name exactly
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (upError) {
      setUpErr(upError.message);
      setIsUploading(false);
      return;
    }

    // 2) Get the public URL
    const { data } = await supabase.storage
      .from("diplomas")
      .getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // 3) Call backend to update profiles.diploma_url (service‐role)
    const {
      data: respData,
      error: respErr,
    } = await fetch("/api/update-diploma", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // pass the access token so requireAuth can verify
        Authorization: `Bearer ${(
          await supabase.auth.getSession()
        ).data.session.access_token}`,
      },
      body: JSON.stringify({ diploma_url: publicUrl }),
    }).then((res) => res.json());

    if (respErr || respData?.error) {
      setUpErr(respErr?.message || respData.error);
      setIsUploading(false);
      return;
    }

    // 4) Re‐fetch this trainer’s profile so we pick up the new diploma_url
    const { data: updatedProfile, error: fetchErr } = await supabase
      .from("profiles")
      .select("diploma_url, avatar_url")
      .eq("id", profile.id)
      .single();

    if (fetchErr) {
      setUpErr(fetchErr.message);
      setIsUploading(false);
      return;
    }

    setDiplomaUrl(updatedProfile.diploma_url);
    if (updatedProfile.avatar_url) {
      setAvatarUrl(updatedProfile.avatar_url);
    }
    setIsUploading(false);
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
              disabled={isUploading}
            />
            {upErr && <p style={{ color: "red" }}>{upErr}</p>}
            {isUploading && <p>Uploading…</p>}
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
