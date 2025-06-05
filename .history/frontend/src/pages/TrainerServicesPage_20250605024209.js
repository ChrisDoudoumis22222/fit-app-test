import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import ServiceImageUpload from "../components/ServiceImageUpload";
import SlotRangeForm from "../components/SlotRangeForm";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

export default function TrainerServicesPage() {
  const { profile } = useAuth();

  /* ── state ───────────────────────────────────────── */
  const [services, setServices] = useState([]);    // list of my services
  const [slots, setSlots]       = useState({});    // serviceId → slot[]
  const [form, setForm]         = useState({
    title: "", descr: "", price: "", tags: "",
  });
  const [error, setError]       = useState("");

  /* ── fetch my services & their slots once ───────── */
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

  /* ── helper: create single service ──────────────── */
  const createService = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      trainer_id: profile.id,
      title: form.title,
      descr: form.descr,
      price: Number(form.price),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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

  /* ── helper: delete service ─────────────────────── */
  const removeService = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  /* ── helper: delete a slot ──────────────────────── */
  const removeSlot = async (slotId, serviceId) => {
    await supabase.from("service_slots").delete().eq("id", slotId);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].filter((sl) => sl.id !== slotId),
    });
  };

  /* ── helper: after image upload ─────────────────── */
  const saveImg = async (serviceId, url) => {
    await supabase.from("services").update({ image_url: url }).eq("id", serviceId);
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, image_url: url } : s))
    );
  };

  /* ── JSX ────────────────────────────────────────── */
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
            {/* image + uploader */}
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

            <h3>
              {s.title} – €{s.price}
            </h3>
            <p>{s.descr}</p>
            <em>{(s.tags || []).join(", ")}</em>
            <br />
            <button onClick={() => removeService(s.id)}>Delete service</button>

            {/* availability */}
            <h4 style={{ marginTop: 12 }}>Slots</h4>
            <SlotRangeForm
              serviceId={s.id}
              onAdded={(newSlots) =>
                setSlots({
                  ...slots,
                  [s.id]: [...newSlots, ...(slots[s.id] || [])],
                })
              }
            />

            <ul>
              {(slots[s.id] || []).map((sl) => (
                <li key={sl.id}>
                  {new Date(sl.starts_at).toLocaleString()}{" "}
                  {sl.booked ? (
                    "(booked)"
                  ) : (
                    <button onClick={() => removeSlot(sl.id, s.id)}>
                      delete
                    </button>
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
