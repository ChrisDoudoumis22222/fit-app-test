import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import TrainerMenu from "../components/TrainerMenu";       // ← NEW
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function ServicesMarketplacePage() {
  const { profile, loading } = useAuth();
  const nav  = useNavigate();

  const [services, setServices] = useState([]);
  const [msg, setMsg]           = useState("");

  /* ───── wait for auth to finish ───── */
  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;

  /* choose menu by role */
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu;

  /* ───── fetch everything ───── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
            *,
            trainer:profiles(full_name),
            service_extras(*),
            service_slots(id, starts_at, booked)
          `
        )
        .order("created_at", { ascending: false });

      if (error) setMsg(error.message);
      else setServices(data || []);
    })();
  }, []);

  /* ───── booking helper ───── */
  const book = async (service_id, slot_id) => {
    setMsg("");
    if (!slot_id) return setMsg("Choose a slot first");

    const { error } = await supabase.from("bookings").insert({
      service_id,
      user_id: profile.id,
      slot_id,
    });
    if (error) return setMsg(error.message);

    await supabase.from("service_slots").update({ booked: true }).eq("id", slot_id);

    setServices((prev) =>
      prev.map((s) =>
        s.id === service_id
          ? {
              ...s,
              service_slots: s.service_slots.map((sl) =>
                sl.id === slot_id ? { ...sl, booked: true } : sl
              ),
            }
          : s
      )
    );
    setMsg("✅ Booking created!");
  };

  /* ───── UI ───── */
  return (
    <>
      <Menu />   {/* dynamic menu */}

      <section style={{ maxWidth: 780, margin: "40px auto" }}>
        <h2>Marketplace</h2>
        {msg && <p>{msg}</p>}

        {services.map((s) => {
          const freeSlots = s.service_slots.filter((sl) => !sl.booked);

          const handleCardClick = (e) => {
            const tag = e.target.tagName;
            if (tag === "BUTTON" || tag === "SELECT" || tag === "OPTION") return;
            nav(`/service/${s.id}`);
          };

          return (
            <div
              key={s.id}
              onClick={handleCardClick}
              style={{
                border: "1px solid #ddd",
                padding: 12,
                marginTop: 18,
                cursor: "pointer",
              }}
            >
              <img
                src={s.image_url || SERVICE_PLACEHOLDER}
                alt=""
                style={{ width: 200, height: 120, objectFit: "cover" }}
              />

              <h3 style={{ marginBottom: 4 }}>
                {s.title} – €{s.price}
                {s.is_virtual && " (Virtual)"}
              </h3>

              <p style={{ margin: 0 }}>
                uploaded by <strong>{s.trainer?.full_name || "Trainer"}</strong>
              </p>

              <p>{s.descr}</p>
              {s.tags?.length ? <em>{s.tags.join(", ")}</em> : null}

              {/* extras */}
              {s.service_extras?.length ? (
                <>
                  <h4 style={{ margin: "8px 0 4px" }}>Extras</h4>
                  <ul style={{ paddingLeft: 20 }}>
                    {s.service_extras.map((ex) => (
                      <li key={ex.id}>
                        {ex.title} – €{ex.price}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {/* booking */}
              {freeSlots.length ? (
                <>
                  <select id={`slot-${s.id}`}>
                    {freeSlots.map((sl) => (
                      <option key={sl.id} value={sl.id}>
                        {new Date(sl.starts_at).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      book(
                        s.id,
                        document.getElementById(`slot-${s.id}`).value
                      )
                    }
                  >
                    Book
                  </button>
                </>
              ) : (
                <p>No available slots</p>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
