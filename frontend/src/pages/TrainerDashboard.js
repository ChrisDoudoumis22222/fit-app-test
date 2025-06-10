
/// TODO 1. ΠΡΕΠΕΙ ΝΑ ΜΠΟΡΕΙ ΝΑ ΑΝΕΒΑΖΕΙ ΤΟ ΠΤΥΧΙΟ ΤΟΥ ΑΠΟ ΕΔΩ 
//// 2. ΝΑ ΜΠΟΡΕΙ ΝΑ ΑΛΛΑΖΕΙ ΚΩΔΙΚΟΥΣ ΚΑΙ ΒΑΛΟΥΜΕ ΚΑΙ ΕΧΤΡΑ ΣΤΟΙΧΕΙΑ



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
  const [isUploading, setIsUploading] = useState(false);

  // 1) Block until profile is loaded
  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;

  // 2) Fetch protected trainer‐only secret once
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

  // 3) Delete avatar handler (RLS must allow this)
  const deleteAvatar = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);
    if (!error) {
      setAvatarUrl(PLACEHOLDER);
    }
  };

  // 4) Diploma‐upload handler
  const onDiplomaSelect = async (e) => {
    setUpErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    // a) Upload to public "diplomas" bucket under diplomas/{UID}/...
    const path = `${profile.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upError } = await supabase.storage
      .from("diplomas") // must match exactly your bucket name
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (upError) {
      setUpErr(upError.message);
      setIsUploading(false);
      return;
    }

    // b) Get the public URL
    const { data: urlData } = await supabase.storage
      .from("diplomas")
      .getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // c) Call backend to update profiles.diploma_url (service‐role)
    //    We must unwrap the response properly.
    const {
      data: sessionData,
    } = await supabase.auth.getSession();
    const token = sessionData?.access_token;

    const resp = await fetch("/api/update-diploma", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ diploma_url: publicUrl }),
    });

    const body = await resp.json();
    if (!resp.ok) {
      setUpErr(body.error || "Unknown error");
      setIsUploading(false);
      return;
    }

    // d) Re‐fetch this trainer’s profile so we pick up the new diploma_url
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

        {!diplomaUrl ? (
          <div style={styles.blocker}>
            <p style={{ color: "crimson", marginBottom: 8 }}>
              You must upload at least one diploma or certification before you
              can create services.
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
