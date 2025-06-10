import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import UserMenu from "../components/UserMenu";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

const AVATAR_PLACEHOLDER = "https://placehold.co/120x120?text=Avatar";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* fetch service + trainer profile */
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
            ),
            service_extras(*)
          `
        )
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setSvc(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!svc) return <p>Service not found.</p>;

  const t = svc.trainer || {};
  const joined = t.created_at
    ? new Date(t.created_at).toLocaleDateString()
    : "—";

  return (
    <>
      <UserMenu />

      <div style={styles.outer}>
        {/* cover image */}
        <img
          src={svc.image_url || SERVICE_PLACEHOLDER}
          alt=""
          style={styles.cover}
        />

        {/* body */}
        <div style={styles.body}>
          <h1 style={{ marginBottom: 8 }}>{svc.title}</h1>

          <p style={styles.price}>
            €{svc.price}
            {svc.is_virtual && (
              <span style={styles.badge}>Virtual</span>
            )}
          </p>

          {/* tags */}
          {svc.tags?.length ? (
            <div style={styles.tagRow}>
              {svc.tags.map((tag) => (
                <span key={tag} style={styles.tagChip}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <p style={{ marginTop: 14, lineHeight: 1.5 }}>{svc.descr}</p>

          {/* extras */}
          {svc.service_extras?.length ? (
            <>
              <h3 style={styles.subHead}>Extras</h3>
              <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                {svc.service_extras.map((ex) => (
                  <li key={ex.id}>
                    {ex.title} – €{ex.price}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {/* trainer card */}
          <div style={styles.trainerCard}>
            <img
              src={t.avatar_url || AVATAR_PLACEHOLDER}
              alt="avatar"
              style={styles.avatar}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {t.full_name || "Trainer"}
              </p>
              {t.specialty && <p style={styles.trainerLine}>{t.specialty}</p>}
              {t.bio && <p style={styles.trainerLine}>{t.bio}</p>}
              {t.phone && (
                <p style={styles.trainerLine}>📞 {t.phone}</p>
              )}
              <p style={styles.trainerLine}>Joined: {joined}</p>
            </div>
          </div>

          <button
            style={styles.cta}
            onClick={() => alert("Booking flow coming soon…")}
          >
            Book now
          </button>
        </div>
      </div>
    </>
  );
}

/* ── inline styles ─────────────────────────── */
const styles = {
  outer: {
    maxWidth: 780,
    margin: "40px auto",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
  },
  cover: {
    width: "100%",
    height: 340,
    objectFit: "cover",
  },
  body: {
    padding: 24,
  },
  price: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
  },
  badge: {
    marginLeft: 8,
    background: "#007bff",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
    verticalAlign: "middle",
  },
  tagRow: {
    marginTop: 8,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  tagChip: {
    background: "#efefef",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
  },
  subHead: { margin: "18px 0 4px" },
  trainerCard: {
    marginTop: 22,
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 12,
    border: "1px solid #e5e5e5",
    borderRadius: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
  },
  trainerLine: { margin: "2px 0", fontSize: 14 },
  cta: {
    marginTop: 28,
    padding: "12px 28px",
    fontSize: 16,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
