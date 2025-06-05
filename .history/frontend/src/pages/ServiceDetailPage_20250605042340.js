import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import UserMenu from "../components/UserMenu";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

const AVATAR_PLACEHOLDER =
  "https://placehold.co/120x120?text=Avatar";

export default function ServiceDetailPage() {
  const { id } = useParams();          // /service/:id
  const [svc, setSvc]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error , setError  ] = useState("");

  /* ───────── fetch service + trainer profile ───────── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
            *,
            trainer:profiles(
              full_name,
              avatar_url,
              bio,
              specialty,
              phone,
              created_at
            )
          `
        )
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else       setSvc(data);
      setLoading(false);
    })();
  }, [id]);

  /* ───────── loading / error guards ───────── */
  if (loading) return <p>Loading…</p>;
  if (error)   return <p style={{ color: "red" }}>{error}</p>;
  if (!svc)    return <p>Service not found.</p>;

  const t = svc.trainer || {};
  const joined = t.created_at
    ? new Date(t.created_at).toLocaleDateString()
    : "—";

  return (
    <>
      <UserMenu />

      <section style={styles.card}>
        {/* cover image */}
        <img
          src={svc.image_url || SERVICE_PLACEHOLDER}
          alt=""
          style={styles.img}
        />

        {/* title + price */}
        <h2 style={{ marginTop: 12 }}>{svc.title}</h2>
        <p>
          <strong>Price:</strong> €{svc.price}
          {svc.is_virtual && " · (Virtual session)"}
        </p>

        {/* tags + descr */}
        {svc.tags?.length && (
          <p>
            <em>{svc.tags.join(", ")}</em>
          </p>
        )}
        <p>{svc.descr}</p>

        {/* trainer block */}
        <div style={styles.trainerBox}>
          <img
            src={t.avatar_url || AVATAR_PLACEHOLDER}
            alt="avatar"
            style={styles.avatar}
          />

          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0 }}>
              <strong>{t.full_name || "Trainer"}</strong>
            </p>
            {t.specialty && <p style={styles.sub}>{t.specialty}</p>}
            {t.bio && <p style={styles.sub}>{t.bio}</p>}
            {t.phone && <p style={styles.sub}>📞 {t.phone}</p>}
            <p style={styles.sub}>Joined: {joined}</p>
          </div>
        </div>

        {/* placeholder booking */}
        <button
          style={styles.bookBtn}
          onClick={() => alert("Booking flow coming soon…")}
        >
          Book now
        </button>
      </section>
    </>
  );
}

/* ───────── inline styles ───────── */
const styles = {
  card: {
    maxWidth: 640,
    margin: "40px auto",
    padding: 16,
    border: "1px solid #ddd",
    textAlign: "center",
  },
  img: { width: "100%", height: 320, objectFit: "cover" },

  trainerBox: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    margin: "20px auto 10px",
    maxWidth: 480,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
  },
  sub: { margin: "2px 0", fontSize: 14 },

  bookBtn: { marginTop: 22, padding: "10px 28px", fontSize: 16 },
};
