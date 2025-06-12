// frontend/src/components/SlotRangeForm.js
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function SlotRangeForm({ serviceId, onAdded }) {
  const [date, setDate]     = useState("");
  const [from, setFrom]     = useState("08:00");
  const [to,   setTo]       = useState("17:00");
  const [step, setStep]     = useState(60);
  const [dur,  setDur]      = useState(60);
  const [msg,  setMsg]      = useState("");

  const local = (d, t) => {
    const [h, m] = t.split(":").map(Number);
    const dt = new Date(d + "T00:00");
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  const addRange = async () => {
    setMsg("");
    if (!date) return setMsg("Pick a date.");
    const start = local(date, from);
    const end   = local(date, to);
    if (end <= start) return setMsg("End must be after start.");

    const rows = [];
    for (let ts = new Date(start); ts < end; ts = new Date(ts.getTime() + step * 60000))
      rows.push({
        service_id: serviceId,
        starts_at:  ts.toISOString(),
        duration_minutes: dur,
        booked: false,
      });

    if (!rows.length) return setMsg("No slots generated.");

    /* draft */
    if (serviceId === "DRAFT") {
      onAdded(rows, "add");
      return setMsg(`✅ Added ${rows.length} draft slots`);
    }

    /* live */
    const { data, error } = await supabase.from("service_slots").insert(rows).select("*");
    if (error) return setMsg(error.message);
    onAdded(data, "add");
    setMsg(`✅ Added ${data.length} slots`);
  };

  return (
    <div style={styles.row}>
      <input type="date"  value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="time"  value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="time"  value={to}   onChange={(e) => setTo(e.target.value)} />
      <input type="number" min="1" style={{ width: 60 }}
             value={step} onChange={(e) => setStep(Number(e.target.value))} />
      <input type="number" min="1" style={{ width: 60 }}
             value={dur}  onChange={(e) => setDur(Number(e.target.value))} />
      {/* IMPORTANT: plain button, not submit */}
      <button type="button" onClick={addRange}>Add range</button>
      {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
    </div>
  );
}

const styles = { row:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:6} };
