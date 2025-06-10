// frontend/src/components/SlotRangeForm.js
import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function SlotRangeForm({ serviceId, onAdded }) {
  const [date, setDate] = useState("");         // YYYY-MM-DD
  const [from, setFrom] = useState("08:00");    // HH:mm (24h)
  const [to,   setTo]   = useState("17:00");    // HH:mm
  const [step, setStep] = useState(60);         // minutes
  const [msg,  setMsg ] = useState("");

  const generateISO = (day, time) =>
    new Date(`${day}T${time}:00`).toISOString();

  const handle = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!date) return setMsg("Pick a date first.");
    const [fromH, fromM] = from.split(":").map(Number);
    const [toH,   toM  ] = to  .split(":").map(Number);
    const start = new Date(date);
    start.setHours(fromH, fromM, 0, 0);
    const end = new Date(date);
    end.setHours(toH, toM, 0, 0);

    if (end <= start) return setMsg("End time must be after start time.");

    /* build an array of slot objects */
    const slots = [];
    for (let t = new Date(start); t < end; t.setMinutes(t.getMinutes() + Number(step))) {
      slots.push({ service_id: serviceId, starts_at: t.toISOString() });
    }

    if (!slots.length) return setMsg("No slots generated.");

    const { error, data } = await supabase
      .from("service_slots")
      .insert(slots)
      .select("*");

    if (error) return setMsg(error.message);
    onAdded(data);             // update parent list
    setMsg(`✅ Added ${data.length} slots`);
  };

  return (
    <form onSubmit={handle} style={styles.row}>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="time" value={to}   onChange={(e) => setTo(e.target.value)} />
      <input
        type="number"
        min="5"
        value={step}
        onChange={(e) => setStep(e.target.value)}
        style={{ width: 60 }}
        title="minutes"
      />
      <button>Add range</button>
      {msg && <span style={{ marginLeft: 8 }}>{msg}</span>}
    </form>
  );
}

const styles = {
  row: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
};
