'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthProvider';
import SlotCalendarManager from './SlotCalendarManager';
import {
  PlusCircle, Trash2, Check, X, Globe, Tag, Euro,
  CalendarClock, Upload,
} from 'lucide-react';

/* "a, b" → ["a","b"] */
const tagArray = (csv = '') =>
  csv.split(',').map((t) => t.trim()).filter(Boolean);

export default function CreateServiceModal({ open, onClose, onCreated }) {
  const { profile } = useAuth();

  /* ─── draft state ─── */
  const [draft, setDraft]   = useState({
    title: '', description: '', price: '', tags: '', is_virtual: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [extras, setExtras]       = useState([]);
  const [slots,  setSlots]        = useState([]);

  /* inline extra inputs */
  const [exTitle, setExTitle] = useState('');
  const [exPrice, setExPrice] = useState('');

  /* reset when reopened */
  useEffect(() => {
    if (open) {
      setDraft({ title:'', description:'', price:'', tags:'', is_virtual:false });
      setImageFile(null); setExtras([]); setSlots([]);
      setExTitle(''); setExPrice('');
    }
  }, [open]);

  if (!open) return null;

  /* quick slot add via prompt */
  const quickAddSlot = () => {
    const dt = prompt('Ώρα έναρξης (YYYY-MM-DDThh:mm)');
    if (!dt) return;
    const start = new Date(dt);
    if (Number.isNaN(start)) return toast.error('Μη έγκυρη ημερομηνία');
    const dur = Number(prompt('Διάρκεια (λεπτά)', 60));
    if (Number.isNaN(dur) || dur <= 0) return toast.error('Μη έγκυρη διάρκεια');
    setSlots((p) => [...p, { starts_at: start.toISOString(), duration_minutes: dur }]);
  };

  /* submit handler */
  async function handleSubmit(e) {
    e.preventDefault();
    const toastId = toast.loading('Αποθήκευση…');

    try {
      /* 1. insert service row */
      const { data: service, error } = await supabase
        .from('services')
        .insert({
          trainer_id: profile.id,
          ...draft,
          price: draft.price ? Number(draft.price) : null,
          tags: tagArray(draft.tags),
        })
        .select('*')
        .single();
      if (error) throw error;

      /* 2. optional cover upload */
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop();
        const path = `${service.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('service-images')
          .upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from('service-images').getPublicUrl(path);

        await supabase.from('services').update({ image_url: publicUrl }).eq('id', service.id);
        service.image_url = publicUrl;
      }

      /* 3. extras & slots */
      const exRows = extras.length
        ? (
            await supabase
              .from('service_extras')
              .insert(extras.map((e) => ({ ...e, service_id: service.id })))
              .select('*')
          ).data
        : [];

      const slRows = slots.length
        ? (
            await supabase
              .from('service_slots')
              .insert(
                slots.map((s) => ({
                  ...s,
                  service_id: service.id,
                  booked: false,
                })),
              )
              .select('*')
          ).data
        : [];

      toast.success('Η υπηρεσία δημιουργήθηκε!', { id: toastId, icon: <Check /> });
      onCreated(service, exRows, slRows);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα δημιουργίας', { id: toastId, icon: <X /> });
    }
  }

  /* ——— UI ——— */
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* FORM (footer is inside the form) */}
      <form
        id="create-service-form"
        onSubmit={handleSubmit}
        className="animate-pop relative z-10 flex max-h-[90vh] w-[92vw] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white/80 shadow-xl backdrop-blur-xl"
      >
        {/* header */}
        <header className="flex items-center justify-between border-b border-white/30 bg-white/70 px-6 py-4 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-gray-800">Δημιουργία υπηρεσίας</h2>
          <button type="button" onClick={onClose} className="icon-btn text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* body */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
          {/* main column */}
          <div className="space-y-4">
            {/* title */}
            <div className="relative">
              <input
                className="input peer w-full"
                placeholder=" "
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
              />
              <label className="floating-label">Τίτλος</label>
            </div>

            {/* description */}
            <div className="relative">
              <textarea
                className="input peer h-32 w-full resize-none"
                placeholder=" "
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                required
              />
              <label className="floating-label">Περιγραφή</label>
            </div>

            {/* price */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <Euro className="h-4 w-4" />
              </span>
              <input
                type="number"
                className="input pl-10"
                placeholder="Τιμή"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                required
              />
            </div>

            {/* tags */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <Tag className="h-4 w-4" />
              </span>
              <input
                className="input pl-10"
                placeholder="Ετικέτες (κόμμα)"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              />
            </div>

            {/* virtual toggle */}
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={draft.is_virtual}
                onChange={(e) => setDraft({ ...draft, is_virtual: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Διαδικτυακή
              {draft.is_virtual && <Globe className="h-4 w-4 text-primary" />}
            </label>
          </div>

          {/* right column */}
          <div className="space-y-6">
            {/* image drop-zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) setImageFile(e.dataTransfer.files[0]);
              }}
            >
              <label
                htmlFor="cover-upload"
                className="group relative flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-center transition hover:border-primary hover:bg-primary/5"
              >
                {imageFile ? (
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-primary">
                    <Upload className="h-8 w-8" />
                    <p className="mt-2 text-sm">Κλικ ή σύρε εικόνα</p>
                  </div>
                )}
              </label>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* extras */}
            <section className="rounded-xl border border-gray-200 p-4">
              <header className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-700">Πρόσθετα</h3>
                <PlusCircle
                  className="h-5 w-5 cursor-pointer text-primary hover:scale-110"
                  onClick={() => {
                    if (!exTitle || !exPrice) return;
                    setExtras([...extras, { title: exTitle, price: Number(exPrice) }]);
                    setExTitle('');
                    setExPrice('');
                  }}
                />
              </header>

              {/* add-row */}
              <div className="mb-3 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Τίτλος"
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                />
                <input
                  type="number"
                  className="input w-24"
                  placeholder="€"
                  value={exPrice}
                  onChange={(e) => setExPrice(e.target.value)}
                />
              </div>

              {extras.length ? (
                <ul className="space-y-1 text-xs">
                  {extras.map((ex, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded bg-stone-50 p-2 hover:bg-stone-100"
                    >
                      <span>{ex.title}</span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          €{ex.price}
                        </span>
                        <Trash2
                          className="h-4 w-4 cursor-pointer text-gray-500 hover:text-red-500"
                          onClick={() => setExtras(extras.filter((_, idx) => idx !== i))}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-stone-400">Δεν υπάρχουν πρόσθετα.</p>
              )}
            </section>
          </div>

          {/* slots */}
          <section className="col-span-full rounded-xl border border-gray-200 p-4">
            <header className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-700">Πρόχειρες ώρες</span>
              <button
                type="button"
                onClick={quickAddSlot}
                className="btn-secondary flex items-center gap-1 text-xs"
              >
                <CalendarClock className="h-4 w-4" /> Προσθήκη
              </button>
            </header>

            <SlotCalendarManager
              serviceId="DRAFT"
              onSlotsChange={(rows, action) => {
                if (action === 'add') setSlots([...rows, ...slots]);
                else setSlots(slots.filter((s) => !rows.includes(s.id)));
              }}
            />

            {slots.length ? (
              <ul className="mt-2 space-y-1 text-xs">
                {slots.map((sl, i) => (
                  <li key={i} className="rounded bg-stone-50 p-2">
                    {new Date(sl.starts_at).toLocaleString('el-GR', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ({sl.duration_minutes} λ.)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400">Χωρίς πρόχειρες ώρες.</p>
            )}
          </section>
        </div>

        {/* footer INSIDE the form */}
        <footer className="flex items-center justify-end gap-3 border-t border-white/30 bg-white/70 px-6 py-4 backdrop-blur-sm">
          <button type="button" onClick={onClose} className="btn-secondary">
            Άκυρωση
          </button>
          <button
            type="submit"
            form="create-service-form"
            className="btn-primary flex items-center gap-1"
          >
            <Check className="h-4 w-4" /> Δημιουργία
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
