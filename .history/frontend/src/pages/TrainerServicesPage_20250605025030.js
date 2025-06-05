// frontend/src/pages/TrainerServicesPage.js
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import ServiceImageUpload from "../components/ServiceImageUpload";
import SlotCalendarManager from "../components/SlotCalendarManager";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function TrainerServicesPage() {
  const { profile } = useAuth();

  /* ───────────────────────── state */
  const [services, setServices] = useState([]);
  const [slots, setSlots]       = useState({});   // serviceId → slot[]
  const [extras, setExtras]     = useState({});   // serviceId → extras[]
  const [form, setForm]         = useState({
    title: "", descr: "", price: "", tags: "", is_virtual: false,
  });
  const [error, setError] = useState("");

  /* ───────────────────────── initial fetch */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(*), service_extras(*)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });

      setServices(data || []);

      const slotMap  = {};
      const extraMap = {};
      (data || []).forEach((s) => {
        slotMap[s.id]  = s.service_slots;
        extraMap[s.id] = s.service_extras;
      });
      setSlots(slotMap);
      setExtras(extraMap);
    })();
  }, [profile.id]);

  /* ───────────────────────── helpers */
  const mergeSlots = (serviceId, payload, action) => {
    if (action === "add") {
      setSlots({ ...slots, [serviceId]: [...payload, ...(slots[serviceId] || [])] });
    } else if (action === "delete") {
      setSlots({
        ...slots,
        [serviceId]: (slots[serviceId] || []).filter((sl) => !payload.includes(sl.id)),
      });
    }
  };

  /* create service */
  const createService = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      trainer_id: profile.id,
      title: form.title,
      descr: form.descr,
      price: Number(form.price),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      is_virtual: form.is_virtual,
    };
    const { data, error } = await supabase.from("services").insert(payload).select("*").single();
    if (error) return setError(error.message);

    setServices([data, ...services]);
    setForm({ title: "", descr: "", price: "", tags: "", is_virtual: false });
  };

  const deleteService = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  const deleteSlot = async (slotId, serviceId) => {
    await supabase.from("service_slots").delete().eq("id", slotId);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].filter((sl) => sl.id !== slotId),
    });
  };

  const changeDuration = async (slot, serviceId) => {
    const newDur = prompt("New duration (minutes)", slot.duration_minutes);
    if (!newDur) return;
    const { error } = await supabase
      .from("service_slots")
      .update({ duration_minutes: Number(newDur) })
      .eq("id", slot.id);
    if (error) return alert(error.message);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].map((r) =>
        r.id === slot.id ? { ...r, duration_minutes: Number(newDur) } : r
      ),
    });
  };

  const saveImg = async (serviceId, url) => {
    await supabase.from("services").update({ image_url: url }).eq("id", serviceId);
    setServices(services.map((s) => (s.id === serviceId ? { ...s, image_url: url } : s)));
  };

  /* add extra */
  const addExtra = async (serviceId) => {
    const title = prompt("Extra title");
    if (!title) return;
    const priceStr = prompt("Extra price (€)");
    const price = Number(priceStr);
    if (isNaN(price)) return alert("Invalid price");
    const { data, error } = await supabase
      .from("service_extras")
      .insert({ service_id: serviceId, title, price })
      .select("*")
      .single();
    if (error) return alert(error.message);
    setExtras({
      ...extras,
      [serviceId]: [...(extras[serviceId] || []), data],
    });
  };

  const delExtra = async (extraId, serviceId) => {
    await supabase.from("service_extras").delete().eq("id", extraId);
    setExtras({
      ...extras,
      [serviceId]: extras[serviceId].filter((e) => e.id !== extraId),
    });
  };

  /* ───────────────────────── render */
  return (
    <>
      <TrainerMenu />

      <section style={{ maxWidth: 760, margin: "40px auto" }}>
        <h2>My services</h2>

        {/* create-service */}
        <form onSubmit={createService} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="Description" value={form.descr} onChange={(e) => setForm({ ...form, descr: e.target.value })} />
          <input type="number" placeholder="Base price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <label>
            <input type="checkbox" checked={form.is_virtual} onChange={(e) => setForm({ ...form, is_virtual: e.target.checked })} />
            &nbsp;Virtual session
          </label>
          <button>Add service</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>

        {/* service list */}
        {services.map((s) => (
          <div key={s.id} style={{ border: "1px solid #ddd", padding: 10, marginTop: 18 }}>
            {/* image */}
            <img src={s.image_url || SERVICE_PLACEHOLDER} alt="" style={{ width: 200, height: 120, objectFit: "cover" }} />
            <br />
            <ServiceImageUpload serviceId={s.id} onUploaded={(url) => saveImg(s.id, url)} />

            {/* main info */}
            <h3>{s.title} – €{s.price}</h3>
            <p>{s.descr}</p>
            <em>{(s.tags || []).join(", ")}</em> &nbsp;
            {s.is_virtual && <strong>(Virtual)</strong>}
            <br />
            <button onClick={() => deleteService(s.id)}>Delete service</button>

            {/* extras */}
            <h4 style={{ marginTop: 10 }}>Extras</h4>
            <button onClick={() => addExtra(s.id)}>+ Add extra</button>
            <ul>
              {(extras[s.id] || []).map((ex) => (
                <li key={ex.id}>
                  {ex.title} – €{ex.price}
                  &nbsp;<button onClick={() => delExtra(ex.id, s.id)}>🗑</button>
                </li>
              ))}
            </ul>

            {/* slots */}
            <h4 style={{ marginTop: 12 }}>Slots</h4>
            <SlotCalendarManager serviceId={s.id} onSlotsChange={(payload, act) => mergeSlots(s.id, payload, act)} />

            <ul>
              {(slots[s.id] || []).map((sl) => (
                <li key={sl.id}>
                  {new Date(sl.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({sl.duration_minutes} m){" "}
                  {sl.booked ? (
                    "(booked)"
                  ) : (
                    <>
                      <button onClick={() => deleteSlot(sl.id, s.id)}>🗑</button>{" "}
                      <button onClick={() => changeDuration(sl, s.id)}>✎</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  );
}
