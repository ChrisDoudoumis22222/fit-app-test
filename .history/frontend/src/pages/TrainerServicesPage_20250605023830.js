import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import ServiceImageUpload from "../components/ServiceImageUpload";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function TrainerServicesPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState({});          // serviceId -> slot list
  const [form, setForm] = useState({ title: "", descr: "", price: "", tags: "" });
  const [error, setError] = useState("");

  /* fetch services + slots */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(*)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });
      setServices(data || []);
      const m = {};
      (data || []).forEach((s) => (m[s.id] = s.service_slots));
      setSlots(m);
    })();
  }, [profile.id]);

  /* add service */
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
    const { data, error } = await supabase
      .from("services")
      .insert(payload)
      .select("*")
      .single();
    if (error) return setError(error.message);
    setServices([data, ...services]);
    setForm({ title: "", descr: "", price: "", tags: "" });
  };

  /* delete service */
  const remove = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  /* add slot */
  const addSlot = async (serviceId) => {
    const iso = prompt("ISO date-time (e.g. 2025-06-20T15:00)");
    if (!iso) return;
    const { error, data } = await supabase
      .from("service_slots")
      .insert({ service_id: serviceId, starts_at: iso })
      .select("*")
      .single();
    if (error) return alert(error.message);
    setSlots({ ...slots, [serviceId]: [data, ...(slots[serviceId] || [])] });
  };

  /* delete slot */
  const delSlot = async (slotId, serviceId) => {
    await supabase.from("service_slots").delete().eq("id", slotId);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].filter((s) => s.id !== slotId),
    });
  };

  /* image upload callback */
  const saveImg = async (serviceId, url) => {
    await supabase.from("services").update({ image_url: url }).eq("id", serviceId);
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, image_url: url } : s))
    );
  };

  return (
    <>
      <TrainerMenu />

      <section style={{ maxWidth: 700, margin: "40px auto" }}>
        <h2>My services</h2>

        {/* create form */}
        <form onSubmit={create} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Description" value={form.descr} onChange={(e) => setForm({ ...form, descr: e.target.value })} />
          <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <button>Add service</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>

        {/* list */}
        {services.map((s) => (
          <div key={s.id} style={{ border: "1px solid #ddd", padding: 8, marginTop: 14 }}>
            <img
              src={s.image_url || SERVICE_PLACEHOLDER}
              alt=""
              style={{ width: 200, height: 120, objectFit: "cover" }}
            />
            <br />
            <ServiceImageUpload serviceId={s.id} onUploaded={(url) => saveImg(s.id, url)} />
            <h3>{s.title} – €{s.price}</h3>
            <p>{s.descr}</p>
            <em>{(s.tags || []).join(", ")}</em>
            <br />
            <button onClick={() => remove(s.id)}>Delete service</button>

            <h4>Slots</h4>
            <button onClick={() => addSlot(s.id)}>+ Add slot</button>
            <ul>
              {(slots[s.id] || []).map((sl) => (
                <li key={sl.id}>
                  {new Date(sl.starts_at).toLocaleString()}{" "}
                  {sl.booked ? "(booked)" : <button onClick={() => delSlot(sl.id, s.id)}>delete</button>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
