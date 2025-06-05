import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import ServiceImageUpload from "../components/ServiceImageUpload";
import SlotCalendarManager from "../components/SlotCalendarManager";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function TrainerServicesPage() {
  const { profile } = useAuth();

  /* ─────────── state ─────────── */
  const [services, setServices] = useState([]);   // all my services
  const [slots, setSlots]       = useState({});   // serviceId → slot[]
  const [form, setForm]         = useState({
    title: "", descr: "", price: "", tags: "",
  });
  const [error, setError]       = useState("");

  /* ───────── fetch services+slots once ───────── */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(*)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });

      setServices(data || []);
      const map = {};
      (data || []).forEach((s) => (map[s.id] = s.service_slots));
      setSlots(map);
    })();
  }, [profile.id]);

  /* ───────── create a new service ───────── */
  const createService = async (e) => {
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

  /* ───────── delete service ───────── */
  const removeService = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  /* ───────── delete single slot ───────── */
  const removeSlot = async (slotId, serviceId) => {
    await supabase.from("service_slots").delete().eq("id", slotId);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].filter((sl) => sl.id !== slotId),
    });
  };

  /* ───────── update slot duration ───────── */
  const editDuration = async (slot, serviceId) => {
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

  /* ───────── after image upload ───────── */
  const saveImg = async (serviceId, url) => {
    await supabase.from("services").update({ image_url: url }).eq("id", serviceId);
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, image_url: url } : s))
    );
  };

  /* ───────── helper for SlotCalendarManager ───────── */
  const mergeSlots = (serviceId, payload, action) => {
    if (action === "add") {
      setSlots({
        ...slots,
        [serviceId]: [...payload, ...(slots[serviceId] || [])],
      });
    } else if (action === "delete") {
      setSlots({
        ...slots,
        [serviceId]: (slots[serviceId] || []).filter(
          (sl) => !payload.includes(sl.id)
        ),
      });
    }
  };

  /* ───────── render ───────── */
  return (
    <>
      <TrainerMenu />

      <section style={{ maxWidth: 720, margin: "40px auto" }}>
        <h2>My services</h2>

        {/* create-service form */}
        <form
          onSubmit={createService}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            placeholder="Description"
            value={form.descr}
            onChange={(e) => setForm({ ...form, descr: e.target.value })}
          />
          <input
            type="number"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <button>Add service</button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>

        {/* list of services */}
        {services.map((s) => (
          <div
            key={s.id}
            style={{ border: "1px solid #ddd", padding: 10, marginTop: 16 }}
          >
            {/* image */}
            <img
              src={s.image_url || SERVICE_PLACEHOLDER}
              alt=""
              style={{ width: 200, height: 120, objectFit: "cover" }}
            />
            <br />
            <ServiceImageUpload
              serviceId={s.id}
              onUploaded={(url) => saveImg(s.id, url)}
            />

            {/* basic info */}
            <h3>
              {s.title} – €{s.price}
            </h3>
            <p>{s.descr}</p>
            <em>{(s.tags || []).join(", ")}</em>
            <br />
            <button onClick={() => removeService(s.id)}>Delete service</button>

            {/* slot calendar */}
            <h4 style={{ marginTop: 12 }}>Slots</h4>
            <SlotCalendarManager
              serviceId={s.id}
              onSlotsChange={(payload, action) =>
                mergeSlots(s.id, payload, action)
              }
            />

            <ul>
              {(slots[s.id] || []).map((sl) => (
                <li key={sl.id}>
                  {new Date(sl.starts_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ({sl.duration_minutes} m){" "}
                  {sl.booked ? (
                    "(booked)"
                  ) : (
                    <>
                      <button onClick={() => removeSlot(sl.id, s.id)}>🗑</button>{" "}
                      <button onClick={() => editDuration(sl, s.id)}>✎</button>
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
