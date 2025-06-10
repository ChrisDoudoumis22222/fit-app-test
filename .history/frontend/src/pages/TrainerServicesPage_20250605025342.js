import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import ServiceImageUpload from "../components/ServiceImageUpload";
import SlotCalendarManager from "../components/SlotCalendarManager";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

/* helper to make ISO strings */
const toISO = (d) => new Date(d).toISOString();

export default function TrainerServicesPage() {
  const { profile } = useAuth();

  /* existing state */
  const [services, setServices] = useState([]);
  const [slots, setSlots]       = useState({});
  const [extras, setExtras]     = useState({});

  /* --------------------------------------------------
     1. initial fetch
  --------------------------------------------------*/
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(*), service_extras(*)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });

      setServices(data || []);
      const slotMap={}, extraMap={};
      (data||[]).forEach((s)=>{
        slotMap [s.id]=s.service_slots;
        extraMap[s.id]=s.service_extras;
      });
      setSlots(slotMap); setExtras(extraMap);
    })();
  }, [profile.id]);

  /* --------------------------------------------------
     2. create-form local draft state
  --------------------------------------------------*/
  const [draft, setDraft] = useState({
    title:"", descr:"", price:"", tags:"", is_virtual:false,
  });
  const [draftImage, setDraftImage]   = useState(null);
  const [draftExtras, setDraftExtras] = useState([]);
  const [draftSlots , setDraftSlots ] = useState([]); // array of {starts_at,duration_minutes}

  /* slot drafter adds to draftSlots */
  const appendDraftSlots = (rows) =>
    setDraftSlots([...rows, ...draftSlots]);

  /* --------------------------------------------------
     3. handle create
  --------------------------------------------------*/
  const createService = async (e) => {
    e.preventDefault();

    /* 3-A insert service row (no image yet) */
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        trainer_id: profile.id,
        title: draft.title,
        descr: draft.descr,
        price: Number(draft.price),
        tags: draft.tags.split(",").map((t)=>t.trim()).filter(Boolean),
        is_virtual: draft.is_virtual,
      })
      .select("*")
      .single();
    if (error) return alert(error.message);

    /* 3-B upload cover image if any */
    if (draftImage) {
      const path = `${service.id}/${Date.now()}.${draftImage.name.split(".").pop()}`;
      const upErr = (await supabase.storage
        .from("service-images")
        .upload(path, draftImage)).error;
      if (!upErr) {
        const { data } = await supabase.storage
          .from("service-images")
          .getPublicUrl(path);
        await supabase.from("services")
          .update({ image_url: data.publicUrl })
          .eq("id", service.id);
        service.image_url = data.publicUrl;
      }
    }

    /* 3-C bulk insert extras */
    if (draftExtras.length) {
      const payload = draftExtras.map((ex)=>({
        service_id: service.id, title: ex.title, price: ex.price }));
      const { data: exRows } = await supabase
        .from("service_extras")
        .insert(payload)
        .select("*");
      extras[service.id]=exRows;   // merge to local state
    }

    /* 3-D bulk insert slots */
    if (draftSlots.length) {
      const payload = draftSlots.map((sl)=>({
        ...sl, service_id:service.id }));
      const { data: slotRows } = await supabase
        .from("service_slots")
        .insert(payload)
        .select("*");
      slots[service.id]=slotRows;
    }

    /* 3-E merge to UI state */
    setServices([service, ...services]);
    setExtras({...extras});
    setSlots({...slots});

    /* 3-F reset draft */
    setDraft({title:"",descr:"",price:"",tags:"",is_virtual:false});
    setDraftImage(null);
    setDraftExtras([]);
    setDraftSlots([]);
  };

  /* --------------------------------------------------
     4. UI helpers for draft extras / slots
  --------------------------------------------------*/
  const addDraftExtra = () => {
    const title = prompt("Extra title");
    if (!title) return;
    const p = Number(prompt("Extra price (€)"));
    if (isNaN(p)) return alert("Invalid price");
    setDraftExtras([...draftExtras,{title,price:p}]);
  };
  const delDraftExtra = (i) =>
    setDraftExtras(draftExtras.filter((_,idx)=>idx!==i));

  /* --------------------------------------------------
     5. existing service helpers (delete/edit slot etc.)
  --------------------------------------------------*/
  const deleteService = async (id) => {
    await supabase.from("services").delete().eq("id", id);
    setServices(services.filter((s) => s.id !== id));
  };

  const deleteSlot = async (slotId, serviceId) => {
    await supabase.from("service_slots").delete().eq("id", slotId);
    setSlots({...slots,
      [serviceId]: slots[serviceId].filter((sl)=>sl.id!==slotId)});
  };

  const changeDuration = async (slot, serviceId) => {
    const n = Number(prompt("New duration",slot.duration_minutes));
    if (!n) return;
    await supabase.from("service_slots")
      .update({duration_minutes:n}).eq("id",slot.id);
    setSlots({...slots,
      [serviceId]: slots[serviceId].map((r)=>r.id===slot.id?{...r,duration_minutes:n}:r)});
  };

  const saveImg = async (sid,url)=>{
    await supabase.from("services").update({image_url:url}).eq("id",sid);
    setServices(services.map(s=>s.id===sid?{...s,image_url:url}:s));
  };

  /* --------------------------------------------------
     6. render
  --------------------------------------------------*/
  return (
    <>
      <TrainerMenu />

      <section style={{ maxWidth: 780, margin: "40px auto" }}>
        <h2>My services</h2>

        {/* ── CREATE FORM ───────────────────────────────── */}
        <form onSubmit={createService} style={{display:"flex",flexDirection:"column",gap:6}}>
          <input placeholder="Title" value={draft.title}
            onChange={(e)=>setDraft({...draft,title:e.target.value})}/>
          <textarea placeholder="Description" value={draft.descr}
            onChange={(e)=>setDraft({...draft,descr:e.target.value})}/>
          <input type="number" placeholder="Base price" value={draft.price}
            onChange={(e)=>setDraft({...draft,price:e.target.value})}/>
          <input placeholder="Tags (comma separated)" value={draft.tags}
            onChange={(e)=>setDraft({...draft,tags:e.target.value})}/>
          <label>
            <input type="checkbox" checked={draft.is_virtual}
              onChange={(e)=>setDraft({...draft,is_virtual:e.target.checked})}/>
            &nbsp;Virtual session
          </label>

          {/* cover image */}
          <label>Cover image&nbsp;
            <input type="file" accept="image/*"
              onChange={(e)=>setDraftImage(e.target.files?.[0]||null)}/>
          </label>

          {/* draft extras */}
          <div style={{border:"1px solid #ccc",padding:6}}>
            <strong>Extras</strong>&nbsp;
            <button type="button" onClick={addDraftExtra}>+ add</button>
            <ul>
              {draftExtras.map((ex,i)=>(
                <li key={i}>{ex.title} – €{ex.price}&nbsp;
                  <button type="button" onClick={()=>delDraftExtra(i)}>🗑</button>
                </li>
              ))}
            </ul>
          </div>

          {/* draft slot generator */}
          <div style={{border:"1px solid #ccc",padding:6,marginTop:6}}>
            <strong>Slots draft</strong>
            <SlotCalendarManager
              serviceId="DRAFT"              /* dummy id not used */
              onSlotsChange={(rows,action)=>{
                if(action==="add") setDraftSlots([...rows,...draftSlots]);
                else if(action==="delete"){
                  const ids=rows; // rows is array of ids in delete mode
                  setDraftSlots(draftSlots.filter((sl)=>!ids.includes(sl.id)));
                }
              }}
            />
            <ul>
              {draftSlots.map((sl,i)=>(
                <li key={i}>{new Date(sl.starts_at).toLocaleTimeString([],{
                  hour:"2-digit",minute:"2-digit"})} ({sl.duration_minutes} m)
                </li>
              ))}
            </ul>
          </div>

          <button>Add service</button>
        </form>

        {/* ── EXISTING SERVICES ────────────────────────── */}
        {services.map((s)=>(
          <div key={s.id} style={{border:"1px solid #ddd",padding:10,marginTop:18}}>
            <img src={s.image_url||SERVICE_PLACEHOLDER} alt=""
                 style={{width:200,height:120,objectFit:"cover"}}/><br/>
            <ServiceImageUpload serviceId={s.id}
              onUploaded={(url)=>saveImg(s.id,url)}/>

            <h3>{s.title} – €{s.price}</h3>
            <p>{s.descr}</p>
            <em>{(s.tags||[]).join(", ")}</em>&nbsp;
            {s.is_virtual&&<strong>(Virtual)</strong>}
            <br/>
            <button onClick={()=>deleteService(s.id)}>Delete service</button>

            {/* extras */}
            <h4 style={{marginTop:10}}>Extras</h4>
            <ul>
              {(extras[s.id]||[]).map((ex)=>(
                <li key={ex.id}>{ex.title} – €{ex.price}&nbsp;
                  <button onClick={()=>{ /* delete extra */ 
                    supabase.from("service_extras").delete().eq("id",ex.id);
                    setExtras({...extras,
                      [s.id]:extras[s.id].filter(e=>e.id!==ex.id)});
                  }}>🗑</button>
                </li>
              ))}
            </ul>
            <button onClick={()=>addDraftExtra(s.id)}>+ Add extra</button>

            {/* slots */}
            <h4 style={{marginTop:12}}>Slots</h4>
            <SlotCalendarManager serviceId={s.id}
              onSlotsChange={(payload,action)=>mergeSlots(s.id,payload,action)}/>
            <ul>
              {(slots[s.id]||[]).map((sl)=>(
                <li key={sl.id}>
                  {new Date(sl.starts_at).toLocaleTimeString([],{
                    hour:"2-digit",minute:"2-digit"
                  })} ({sl.duration_minutes} m){" "}
                  {sl.booked?"(booked)":(
                    <>
                      <button onClick={()=>deleteSlot(sl.id,s.id)}>🗑</button>{" "}
                      <button onClick={()=>changeDuration(sl,s.id)}>✎</button>
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
