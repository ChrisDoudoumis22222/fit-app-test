import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import TrainerMenu from "../components/TrainerMenu";          // ← NEW
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

const AVATAR_PLACEHOLDER = "https://placehold.co/120x120?text=Avatar";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const { profile, loading: authLoading } = useAuth();        // ← include loading

  const [svc, setSvc]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error , setError ]   = useState("");
  const [msg   , setMsg   ]   = useState("");
  const [selected, setSelected] = useState(null);  // slot id

  /* wait until we know the role (for menu) */
  if (authLoading) return <p>Loading…</p>;

  /* pick menu by role */
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu;

  /* ───────── fetch service + slots ───────── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
            *,
            trainer:profiles(
              full_name, avatar_url, bio, specialty, phone, created_at
            ),
            service_extras(*),
            service_slots(id, starts_at, booked, duration_minutes)
          `
        )
        .eq("id", id)
        .single();

      if (error) setError(error.message);
      else setSvc(data);
      setLoading(false);
    })();
  }, [id]);

  /* ───────── book helper ───────── */
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

    setSvc({
      ...svc,
      service_slots: svc.service_slots.map((sl) =>
        sl.id === selected ? { ...sl, booked: true } : sl
      ),
    });
    setSelected(null);
    setMsg("✅ Booking confirmed!");
  };

  /* ───────── guards ───────── */
  if (loading) return <p>Loading…</p>;
  if (error)   return <p style={{ color: "red" }}>{error}</p>;
  if (!svc)    return <p>Service not found.</p>;

  /* ───────── derived data ───────── */
  const t = svc.trainer || {};
  const joined = t.created_at
    ? new Date(t.created_at).toLocaleDateString()
    : "—";

  const freeSlots = svc.service_slots.filter((s) => !s.booked);

  /* group free slots by day */
  const grouped = {};
  freeSlots.forEach((s) => {
    const day = s.starts_at.slice(0, 10);
    (grouped[day] = grouped[day] || []).push(s);
  });

  /* ───────── render ───────── */
  return (
    <>
      <Menu />   {/* dynamic nav bar */}

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

          {svc.tags?.length > 0 && (
            <div style={styles.tagRow}>
              {svc.tags.map((tag) => (
                <span key={tag} style={styles.tagChip}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p style={{ marginTop: 14, lineHeight: 1.5 }}>{svc.descr}</p>

          {svc.service_extras?.length > 0 && (
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
              {t.phone && <p style={styles.trainerLine}>📞 {t.phone}</p>}
              <p style={styles.trainerLine}>Joined: {joined}</p>
            </div>
          </div>

          {/* booking calendar */}
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
                            style={{
                              ...styles.slotBtn,
                              ...(active ? styles.slotActive : {}),
                            }}
                            onClick={() => setSelected(sl.id)}
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

/* styles object: same as previous version */
const styles = {
  /* ... unchanged styles from earlier ... */
  outer: {
    maxWidth: 780,
    margin: "40px auto",
    boxShadow: "0 4px 14px rgba(0,0,0,.08)",
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
  subHead: { margin: "20px 0 10px" },
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
  slotActive: { background: "#007bff", color: "#fff", borderColor: "#007bff" },

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
