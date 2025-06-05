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
  const [selected, setSelected] = useState(null);      // slot id

  /* ── fetch service + slots ─────────────────────── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
            *,
            trainer:profiles(full_name, avatar_url, bio, specialty, phone, created_at),
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

  /* ── book helper ──────────────────────────────── */
  const book = async () => {
    setMsg("");
    if (!selected) return setMsg("Choose a slot first.");

    const { error } = await supabase.from("bookings").insert({
      service_id: svc.id,
      user_id: profile.id,
      slot_id: selected,
    });
    if (error) return setMsg(error.message);

    await supabase
      .from("service_slots")
      .update({ booked: true })
      .eq("id", selected);

    /* optimistic UI update */
    setSvc({
      ...svc,
      service_slots: svc.service_slots.map((sl) =>
        sl.id === selected ? { ...sl, booked: true } : sl
      ),
    });
    setSelected(null);
    setMsg("✅ Booking confirmed!");
  };

  /* ── guards ───────────────────────────────────── */
  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!svc) return <p>Service not found.</p>;

  /* ── data shaping ─────────────────────────────── */
  const trainer = svc.trainer || {};
  const joined = trainer.created_at
    ? new Date(trainer.created_at).toLocaleDateString()
    : "—";

  /* group free slots into {isoDate: [slot]} */
  const freeSlots = svc.service_slots.filter((sl) => !sl.booked);
  const grouped = {};
  freeSlots.forEach((sl) => {
    const dateKey = new Date(sl.starts_at).toISOString().slice(0, 10); // YYYY-MM-DD
    (grouped[dateKey] = grouped[dateKey] || []).push(sl);
  });

  /* ── render ───────────────────────────────────── */
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
          {/* …title, price, tags, description, trainer… (unchanged) */}

          {/* trainer card etc. (same as earlier code) */}
          {/*   — trimmed for brevity; keep your existing markup here — */}

          {/* ───── Booking section ───── */}
          <h3 style={styles.subHead}>Book a slot</h3>

          {Object.keys(grouped).length ? (
            <>
              <div style={styles.calendar}>
                {Object.entries(grouped).map(([day, slots]) => (
                  <div key={day} style={styles.dayCol}>
                    <strong>
                      {new Date(day).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </strong>
                    <div style={styles.slotWrap}>
                      {slots.map((sl) => {
                        const time = new Date(sl.starts_at).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" }
                        );
                        const active = selected === sl.id;
                        return (
                          <button
                            key={sl.id}
                            onClick={() => setSelected(sl.id)}
                            style={{
                              ...styles.slotBtn,
                              ...(active ? styles.slotActive : {}),
                            }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

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

/* ── inline styles ───────────────────────── */
const styles = {
  outer: { maxWidth: 780, margin: "40px auto", boxShadow: "0 4px 14px rgba(0,0,0,.08)", borderRadius: 12, overflow: "hidden", background: "#fff" },
  cover: { width: "100%", height: 340, objectFit: "cover" },
  body: { padding: 24 },
  /* …price, badge, tagChip etc. keep as before … */
  subHead: { margin: "20px 0 10px" },

  /* calendar */
  calendar: { display: "flex", gap: 12, flexWrap: "wrap" },
  dayCol: { minWidth: 110 },
  slotWrap: { display: "flex", flexDirection: "column", gap: 6, marginTop: 4 },
  slotBtn: {
    padding: "4px 8px",
    border: "1px solid #bbb",
    borderRadius: 6,
    background: "#f5f5f5",
    cursor: "pointer",
    fontSize: 13,
  },
  slotActive: {
    background: "#007bff",
    color: "#fff",
    borderColor: "#007bff",
  },

  cta: {
    marginTop: 18,
    padding: "10px 24px",
    fontSize: 15,
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
