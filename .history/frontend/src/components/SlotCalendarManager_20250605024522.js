import React, { useState } from "react";
import { supabase } from "../supabaseClient";

/* Helper: generate every timestamp in the range */
const makeSeries = (day, from, to, step) => {
  const [fH, fM] = from.split(":").map(Number);
  const [tH, tM] = to.split(":").map(Number);
  const start = new Date(`${day}T00:00:00`);
  start.setHours(fH, fM, 0, 0);
  const end = new Date(`${day}T00:00:00`);
  end.setHours(tH, tM, 0, 0);

  const arr = [];
  for (let t = new Date(start); t < end; t.setMinutes(t.getMinutes() + step)) {
    arr.push(new Date(t));
  }
  return arr;
};

export default function SlotCalendarManager({ serviceId, onSlotsChange }) {
  const [day,  setDay ]  = useState("");
  const [from, setFrom]  = useState("08:00");
  const [to,   setTo]    = useState("17:00");
  const [dur,  setDur]   = useState(60);
  const [msg,  setMsg]   = useState("");

  /* create many slots */
  const addRange = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!day) return setMsg("Pick a date");

    const stamps = makeSeries(day, from, to, dur);
    if (!stamps.length) return setMsg("Range is empty");

    const rows = stamps.map((d) => ({
      service_id: serviceId,
      starts_at: d.toISOString(),
      duration_minutes: dur,
    }));

    const { data, error } = await supabase
      .from("service_slots")
      .insert(rows)
      .select("*");
    if (error) return setMsg(error.message);
    onSlotsChange(data, "add");
    setMsg(`✅ added ${data.length} slots`);
  };

  /* delete all slots on that date */
  const deleteDay = async () => {
    if (!day) return;
    const fromISO = `${day}T00:00:00.000Z`;
    const toISO   = `${day}T23:59:59.999Z`;
    const { data: ids } = await supabase
      .from("service_slots")
      .select("id")
      .eq("service_id", serviceId)
      .gte("starts_at", fromISO)
      .lte("starts_at", toISO);

    if (!ids.length) return setMsg("No slots on that day");
    await supabase.from("service_slots")
      .delete()
      .in("id", ids.map((r) => r.id));
    onSlotsChange(ids.map((r) => r.id), "delete");
    setMsg(`🗑 removed ${ids.length} slots`);
  };

  return (
    <form onSubmit={addRange} style={styles.row}>
      <input type="date"   value={day}  onChange={(e) => setDay(e.target.value)} />
      <input type="time"   value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="time"   value={to}   onChange={(e) => setTo(e.target.value)} />
      <input type="number" min="5" value={dur} onChange={(e) => setDur(e.target.value)} title="minutes" style={{ width: 60 }} />
      <button>Add</button>
      <button type="button" onClick={deleteDay}>Delete day</button>
      {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
    </form>
  );
}

const styles = { row:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:6} };
