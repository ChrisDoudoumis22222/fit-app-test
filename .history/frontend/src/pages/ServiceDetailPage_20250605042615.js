import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

const AVATAR_PLACEHOLDER = "https://placehold.co/120x120?text=Avatar";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();

  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  /* ───────────────────────── fetch ───────────────────────── */
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
            service_extras(*),
            service_slots(id, starts_at, booked)
          `
        )
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setSvc(data);
      setLoading(false);
    })();
  }, [id]);

  /* ─────────────────────── booking helper ─────────────────── */
  const book = async () => {
    setMsg("");
    const slotId = document.getElementById("slot-select").value;
    if (!slotId) return setMsg("Choose a slot first.");

    /* 1) create booking row */
    const { error } = await supabase.from("bookings").insert({
      service_id: svc.id,
      user_id: profile.id,
      slot_id: slotId,
    });
    if (error) return setMsg(error.message);

    /* 2) mark slot booked */
    await supabase
      .from("service_slots")
      .update({ booked: true })
      .eq("id", slotId);

    /* 3) update UI */
    setSvc({
      ...svc,
      service_slots: svc.service_slots.map((sl) =>
        sl.id === slotId ? { ...sl, booked: true } : sl
      ),
    });
    setMsg("✅ Booking confirmed!");
  };

  /* ─────────────────────── guard states ───────────────────── */
  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!svc) return <p>Service not found.</p>;

  const trainer = svc.trainer || {};
  const joined = trainer.created_at
    ? new Date(trainer.created_at).toLocaleDateString()
    : "—";

  const freeSlots = svc.service_slots.filter((sl) => !sl.booked);

  /* ───────────────────────── render ───────────────────────── */
  return (
    <>
      <UserMenu />

      <div style={styles.outer}>
        <img
          src={svc.image_url || SERVICE_PLACEHOLDER}
          alt=""
          style={styles.cover}
        />

        <div style={styles.body}>
          <h1 style={{ marginBottom: 8 }}>{svc.title}</h1>

          <p style={styles.price}>
            €{svc.price}
            {svc.is_virtual && <span style={styles.badge}>Virtual</span>}
          </p>

          {svc.tags?.length && (
            <div style={styles.tagRow}>
              {svc.tags.map((tag) => (
                <span key={tag} style={styles.tagChip}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p style={{ marginTop: 14, lineHeight: 1.5 }}>{svc.descr}</p>

          {svc.service_extras?.length && (
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
          )}

          {/* trainer block */}
          <div style={styles.trainerCard}>
            <img
              src={trainer.avatar_url || AVATAR_PLACEHOLDER}
              alt="avatar"
              style={styles.avatar}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {trainer.full_name || "Trainer"}
              </p>
              {trainer.specialty && (
                <p style={styles.trainerLine}>{trainer.specialty}</p>
              )}
              {trainer.bio && <p style={styles.trainerLine}>{trainer.bio}</p>}
              {trainer.phone && (
                <p style={styles.trainerLine}>📞 {trainer.phone}</p>
              )}
              <p style={styles.trainerLine}>Joined: {joined}</p>
            </div>
          </div>

          {/* booking section */}
          <h3 style={styles.subHead}>Book a slot</h3>
          {freeSlots.length ? (
            <>
              <select id="slot-select" style={{ padding: 6 }}>
                {freeSlots.map((sl) => (
                  <option key={sl.id} value={sl.id}>
                    {new Date(sl.starts_at).toLocaleString()}
                  </option>
                ))}
              </select>
              <button style={styles.cta} onClick={book}>
                Book now
              </button>
            </>
          ) : (
            <p style={{ marginTop: 6, fontStyle: "italic" }}>
              Sorry, no slots available at the moment—please check another
              service.
            </p>
          )}

          {msg && <p>{msg}</p>}
        </div>
      </div>
    </>
  );
}

/* ───────── styles ───────── */
const styles = {
  outer: {
    maxWidth: 780,
    margin: "40px auto",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
  },
  cover: { width: "100%", height: 340, objectFit: "cover" },
  body: { padding: 24 },
  price: { fontSize: 20, fontWeight: 600, margin: 0 },
  badge: {
    marginLeft: 8,
    background: "#007bff",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 12,
  },
  tagRow: { marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" },
  tagChip: {
    background: "#efefef",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
  },
  subHead: { margin: "20px 0 6px" },
  trainerCard: {
    marginTop: 24,
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
    marginLeft: 8,
    padding: "10px 24px",
    fontSize: 15,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
