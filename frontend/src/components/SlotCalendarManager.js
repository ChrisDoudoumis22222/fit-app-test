// src/components/SlotCalendarManager.jsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PlusCircle, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

/* ────────────────────────────────────────────────────────── */
/* Create an array of Date objects every <step> minutes from
   <from> (HH:MM) up to but *not* including <to> (HH:MM).     */
const makeSeries = (day, from, to, step) => {
  if (!day) return [];

  const [fH, fM] = from.split(':').map(Number);
  const [tH, tM] = to.split(':').map(Number);

  const start = new Date(`${day}T00:00`);
  start.setHours(fH, fM, 0, 0);

  const end = new Date(`${day}T00:00`);
  end.setHours(tH, tM, 0, 0);

  const arr = [];
  for (let ts = new Date(start); ts < end; ts.setMinutes(ts.getMinutes() + step))
    arr.push(new Date(ts));
  return arr;
};
/* ────────────────────────────────────────────────────────── */

export default function SlotCalendarManager({ serviceId, onSlotsChange }) {
  const [day, setDay]   = useState('');
  const [from, setFrom] = useState('08:00');
  const [to, setTo]     = useState('17:00');
  const [dur, setDur]   = useState(60); // minutes
  const [msg, setMsg]   = useState({ text: '', ok: true });

  /* helper: build rows the DB / parent expect */
  const buildRows = (dates) =>
    dates.map((d) => ({
      id: serviceId === 'DRAFT' ? `draft-${d.getTime()}` : undefined,
      service_id: serviceId,
      starts_at: d.toISOString(),
      duration_minutes: dur,
      booked: false,
    }));

  /* flash message 3 s */
  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: '', ok: true }), 3000);
  };

  /* ─── add range ────────────────────── */
  const addRange = async (e) => {
    e.preventDefault();
    if (!day) return flash('📅 Επιλέξτε ημερομηνία', false);

    const stamps = makeSeries(day, from, to, dur);
    if (!stamps.length) return flash('⛔ Το εύρος είναι κενό', false);

    /* draft mode */
    if (serviceId === 'DRAFT') {
      const rows = buildRows(stamps);
      onSlotsChange(rows, 'add');
      return flash(`✅ Προστέθηκαν ${rows.length} draft slot`, true);
    }

    /* live → DB */
    const { data, error } = await supabase
      .from('service_slots')
      .insert(buildRows(stamps))
      .select('*');

    if (error) return flash(error.message, false);
    onSlotsChange(data, 'add');
    flash(`✅ Προστέθηκαν ${data.length} slot`, true);
  };

  /* ─── delete all slots of the chosen day ───────────────── */
  const deleteDay = async () => {
    if (!day) return flash('📅 Επιλέξτε ημερομηνία', false);

    /* draft mode */
    if (serviceId === 'DRAFT') {
      const stamps = makeSeries(day, from, to, dur);
      const ids = stamps.map((ts) => `draft-${ts.getTime()}`);
      onSlotsChange(ids, 'delete');
      return flash(`🗑️ Διαγραφή ${ids.length} draft slot`, true);
    }

    /* live mode */
    const fromLocal = new Date(`${day}T00:00`);
    const toLocal   = new Date(fromLocal);
    toLocal.setDate(toLocal.getDate() + 1);

    const { data: rows } = await supabase
      .from('service_slots')
      .select('id')
      .eq('service_id', serviceId)
      .gte('starts_at', fromLocal.toISOString())
      .lt('starts_at',  toLocal.toISOString());

    if (!rows?.length) return flash('Δεν υπάρχουν slot εκείνη την ημέρα', false);

    const { error } = await supabase
      .from('service_slots')
      .delete()
      .in('id', rows.map((r) => r.id));

    if (error) return flash(error.message, false);

    onSlotsChange(rows.map((r) => r.id), 'delete');
    flash(`🗑️ Διαγραφή ${rows.length} slot`, true);
  };

  /* ─── UI ───────────────────────────── */
  return (
    <form onSubmit={addRange} className="flex flex-wrap items-end gap-3 text-sm">
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-gray-600">Ημ/νία</label>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
               className="input" />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-xs text-gray-600">Από</label>
        <input type="time" value={from} onChange={(e) => setFrom(e.target.value)}
               className="input w-28" />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-xs text-gray-600">Έως</label>
        <input type="time" value={to} onChange={(e) => setTo(e.target.value)}
               className="input w-28" />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-xs text-gray-600">Διάρκεια (λ.)</label>
        <input type="number" min="5" step="5" value={dur}
               onChange={(e) => setDur(Number(e.target.value))}
               className="input w-24" />
      </div>

      {/* actions */}
      <button type="submit" className="btn-primary flex items-center gap-1">
        <PlusCircle className="h-4 w-4" /> Προσθήκη
      </button>
      <button type="button" onClick={deleteDay}
              className="btn-secondary flex items-center gap-1">
        <Trash2 className="h-4 w-4" /> Διαγραφή ημέρας
      </button>

      {/* flash message */}
      {msg.text && (
        <span
          className={`ml-2 inline-flex items-center gap-1 text-xs ${
            msg.ok ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {msg.ok ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {msg.text}
        </span>
      )}
    </form>
  );
}
