import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function TrainerServicesPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ title: "", descr: "", price: "", tags: "" });
  const [error, setError] = useState("");

  /* fetch my services */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });
      setServices(data || []);
    })();
  }, [profile.id]);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      trainer_id: profile.id,
      title: form.title,
      descr: form.descr,
      price: Number(form.price),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const { error, data } = await supabase.from("services").insert(payload).single();
    if (error) return setError(error.message);
    setServices([data, ...services]);
    setForm({ title: "", descr: "", price: "", tags: "" });
  };

  const remove = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  return (
    <section style={{ maxWidth: 620, margin: "40px auto" }}>
      <h2>My services</h2>

      <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea placeholder="Description" value={form.descr} onChange={(e) => setForm({ ...form, descr: e.target.value })} />
        <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <button>Add service</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>

      <ul>
        {services.map((s) => (
          <li key={s.id} style={{ borderBottom: "1px solid #ddd", padding: 8 }}>
            <strong>{s.title}</strong> – €{s.price}
            <br />
            {s.descr}
            <br />
            <em>{(s.tags || []).join(", ")}</em>
            <br />
            <button onClick={() => remove(s.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
