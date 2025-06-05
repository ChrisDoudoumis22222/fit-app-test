import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function ServicesMarketplacePage() {
  const { profile } = useAuth();
  const [services, setServices] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("services").select("*").order("created_at", { ascending: false });
      setServices(data || []);
    })();
  }, []);

  const book = async (service_id) => {
    setMsg("");
    const { error } = await supabase.from("bookings").insert({
      service_id,
      user_id: profile.id,
    });
    if (error) return setMsg(error.message);
    setMsg("✅ Booking created!");
  };

  return (
    <section style={{ maxWidth: 720, margin: "40px auto" }}>
      <h2>All services</h2>
      {msg && <p>{msg}</p>}
      <ul>
        {services.map((s) => (
          <li key={s.id} style={{ borderBottom: "1px solid #ddd", padding: 8 }}>
            <strong>{s.title}</strong> – €{s.price}
            <br />
            {s.descr}
            <br />
            <em>{(s.tags || []).join(", ")}</em>
            <br />
            <button onClick={() => book(s.id)}>Book</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
