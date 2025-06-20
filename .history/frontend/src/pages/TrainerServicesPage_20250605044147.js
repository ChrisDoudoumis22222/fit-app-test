import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import ServiceImageUpload from "../components/ServiceImageUpload";
import SlotCalendarManager from "../components/SlotCalendarManager";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

/* helper – stringify Date to ISO */
const toISO = (d) => new Date(d).toISOString();

export default function TrainerServicesPage() {
  const { profile, loading } = useAuth();

  /* wait until the profile arrives */
  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;

  /* ─────────────── reactive state ─────────────── */
  const [services, setServices] = useState([]);
  const [slots, setSlots]       = useState({});   // serviceId → slot[]
  const [extras, setExtras]     = useState({});   // serviceId → extras[]

  /* draft (new service) state */
  const [draft, setDraft] = useState({
    title: "", descr: "", price: "", tags: "", is_virtual: false,
  });
  const [draftImage, setDraftImage]   = useState(null);
  const [draftExtras, setDraftExtras] = useState([]);
  const [draftSlots , setDraftSlots ] = useState([]);

  /* ─────────────── initial fetch ─────────────── */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(*), service_extras(*)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });

      const slotMap  = {};
      const extraMap = {};
      (data || []).forEach((s) => {
        slotMap[s.id]  = s.service_slots;
        extraMap[s.id] = s.service_extras;
      });

      setServices(data || []);
      setSlots(slotMap);
      setExtras(extraMap);
    })();
  }, [profile.id]);

  /* ─────────────── helpers ─────────────── */

  /* slots merge callback for SlotCalendarManager */
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

  /* create new service */
  const createService = async (e) => {
    e.preventDefault();

    /* 1. service row (no image yet) */
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        trainer_id: profile.id,
        title: draft.title,
        descr: draft.descr,
        price: Number(draft.price),
        tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_virtual: draft.is_virtual,
      })
      .select("*")
      .single();
    if (error) return alert(error.message);

    /* 2. upload cover image (optional) */
    if (draftImage) {
      const path = `${service.id}/${Date.now()}.${
        draftImage.name.split(".").pop()
      }`;
      const { error: upErr } = await supabase.storage
        .from("service-images")
        .upload(path, draftImage);
      if (!upErr) {
        const { data } = await supabase.storage
          .from("service-images")
          .getPublicUrl(path);
        await supabase
          .from("services")
          .update({ image_url: data.publicUrl })
          .eq("id", service.id);
        service.image_url = data.publicUrl;
      }
    }

    /* 3. extras */
    if (draftExtras.length) {
      const payload = draftExtras.map((ex) => ({
        service_id: service.id,
        title: ex.title,
        price: ex.price,
      }));
      const { data: exRows } = await supabase
        .from("service_extras")
        .insert(payload)
        .select("*");
      extras[service.id] = exRows;
    }

    /* 4. slots */
    if (draftSlots.length) {
      const payload = draftSlots.map((sl) => ({
        ...sl,
        service_id: service.id,
      }));
      const { data: slotRows } = await supabase
        .from("service_slots")
        .insert(payload)
        .select("*");
      slots[service.id] = slotRows;
    }

    /* 5. merge to UI + reset draft */
    setServices([service, ...services]);
    setExtras({ ...extras });
    setSlots({ ...slots });
    setDraft({
      title: "",
      descr: "",
      price: "",
      tags: "",
      is_virtual: false,
    });
    setDraftImage(null);
    setDraftExtras([]);
    setDraftSlots([]);
  };

  /* delete service */
  const deleteService = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  /* delete slot */
  const deleteSlot = async (slotId, serviceId) => {
    await supabase.from("service_slots").delete().eq("id", slotId);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].filter((sl) => sl.id !== slotId),
    });
  };

  /* change slot duration */
  const changeDuration = async (slot, serviceId) => {
    const minutes = Number(
      prompt("New duration in minutes", slot.duration_minutes)
    );
    if (!minutes) return;
    await supabase
      .from("service_slots")
      .update({ duration_minutes: minutes })
      .eq("id", slot.id);
    setSlots({
      ...slots,
      [serviceId]: slots[serviceId].map((s) =>
        s.id === slot.id ? { ...s, duration_minutes: minutes } : s
      ),
    });
  };

  /* upload new cover image */
  const saveImg = async (serviceId, url) => {
    await supabase.from("services").update({ image_url: url }).eq("id", serviceId);
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, image_url: url } : s))
    );
  };

  /* add / remove draft extras */
  const addDraftExtra = () => {
    const title = prompt("Extra title");
    if (!title) return;
    const price = Number(prompt("Extra price (€)"));
    if (isNaN(price)) return alert("Invalid price");
    setDraftExtras([...draftExtras, { title, price }]);
  };
  const delDraftExtra = (idx) =>
    setDraftExtras(draftExtras.filter((_, i) => i !== idx));

  /* delete extra from an existing service */
  const removeLiveExtra = async (exId, serviceId) => {
    await supabase.from("service_extras").delete().eq("id", exId);
    setExtras({
      ...extras,
      [serviceId]: extras[serviceId].filter((e) => e.id !== exId),
    });
  };

  /* ─────────────── render ─────────────── */
  return (
    <>
      <TrainerMenu />

      <section style={{ maxWidth: 780, margin: "40px auto" }}>
        <h2>My services</h2>

        {/* CREATE FORM */}
        <form
          onSubmit={createService}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          <input
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            placeholder="Description"
            value={draft.descr}
            onChange={(e) => setDraft({ ...draft, descr: e.target.value })}
          />
          <input
            type="number"
            placeholder="Base price"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <input
            placeholder="Tags (comma separated)"
            value={draft.tags}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={draft.is_virtual}
              onChange={(e) =>
                setDraft({ ...draft, is_virtual: e.target.checked })
              }
            />
            &nbsp;Virtual session
          </label>

          {/* cover image */}
          <label>
            Cover image&nbsp;
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setDraftImage(e.target.files?.[0] || null)}
            />
          </label>

          {/* draft extras */}
          <div style={{ border: "1px solid #ccc", padding: 6 }}>
            <strong>Extras</strong>&nbsp;
            <button type="button" onClick={addDraftExtra}>
              + add
            </button>
            <ul>
              {draftExtras.map((ex, i) => (
                <li key={i}>
                  {ex.title} – €{ex.price}
                  <button
                    type="button"
                    onClick={() => delDraftExtra(i)}
                    style={{ marginLeft: 6 }}
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* draft slots */}
          <div style={{ border: "1px solid #ccc", padding: 6, marginTop: 6 }}>
            <strong>Slots draft</strong>
            <SlotCalendarManager
              serviceId="DRAFT"
              onSlotsChange={(rows, action) => {
                if (action === "add")
                  setDraftSlots([...rows, ...draftSlots]);
                else if (action === "delete") {
                  const ids = rows; // delete = array of ids
                  setDraftSlots(draftSlots.filter((sl) => !ids.includes(sl.id)));
                }
              }}
            />
            <ul>
              {draftSlots.map((sl, i) => (
                <li key={i}>
                  {new Date(sl.starts_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ({sl.duration_minutes} m)
                </li>
              ))}
            </ul>
          </div>

          <button>Add service</button>
        </form>

        {/* EXISTING SERVICES */}
        {services.map((s) => (
          <div
            key={s.id}
            style={{ border: "1px solid #ddd", padding: 10, marginTop: 18 }}
          >
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
            {s.is_virtual && <strong>&nbsp;(Virtual)</strong>}
            <br />
            <button onClick={() => deleteService(s.id)}>Delete service</button>

            {/* extras */}
            <h4 style={{ marginTop: 10 }}>Extras</h4>
            <ul>
              {(extras[s.id] || []).map((ex) => (
                <li key={ex.id}>
                  {ex.title} – €{ex.price}{" "}
                  <button onClick={() => removeLiveExtra(ex.id, s.id)}>🗑</button>
                </li>
              ))}
            </ul>
            <button onClick={addDraftExtra}>+ Add extra</button>

            {/* slots */}
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
