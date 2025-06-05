import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function ServicesMarketplacePage() {
  const { profile } = useAuth();
  const [services, setServices] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(id, starts_at, booked)")
        .order("created_at", { ascending: false });
      setServices(data || []);
    })();
  }, []);

  const book = async (service_id, slot_id) => {
    setMsg("");
    if (!slot_id) return setMsg("Choose a slot first.");
    const { error } = await supabase.from("bookings").insert({
      service_id,
      user_id: profile.id,
      slot_id,
    });
    if (error) return setMsg(error.message);
    await supabase.from("service_slots").update({ booked: true }).eq("id", slot_id);
    setMsg("✅ Booking created!");
    // optimistically mark slot booked in UI
    setServices(
      services.map((s) =>
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
  };

  return (
    <>
      <UserMenu />

      <section style={{ maxWidth: 780, margin: "40px auto" }}>
        <h2>Services</h2>
        {msg && <p>{msg}</p>}

        {services.map((s) => {
          const freeSlots = s.service_slots.filter((sl) => !sl.booked);
          return (
            <div key={s.id} style={{ border: "1px solid #ddd", padding: 10, marginTop: 16 }}>
              <img
                src={s.image_url || SERVICE_PLACEHOLDER}
                alt=""
                style={{ width: 200, height: 120, objectFit: "cover" }}
              />
              <h3>{s.title} – €{s.price}</h3>
              <p>{s.descr}</p>
              <em>{(s.tags || []).join(", ")}</em>
              <br />
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
