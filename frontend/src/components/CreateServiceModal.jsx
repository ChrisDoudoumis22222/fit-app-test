/*  CreateServiceModal.jsx – Glass-Dark v5.4
    -----------------------------------------
    • same UI as v5.3
    • parent isn’t notified until user dismisses popup
*/

'use client';

import { useState, useEffect } from 'react';
import { createPortal }        from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast }               from 'react-hot-toast';
import { supabase }            from '../supabaseClient';
import { useAuth }             from '../AuthProvider';
import ServiceCreatedPopup     from './ServiceCreatedPopup';
import {
  PlusCircle, Trash2, Check, X, Euro,
  CalendarClock, Upload, ChevronDown
} from 'lucide-react';

/* ───────── helpers ───────── */
const tagArray = csv => csv.split(',').map(t => t.trim()).filter(Boolean);
const ringMono = 'ring-1 ring-white/10';
const glassBG  = {
  background:'linear-gradient(135deg,#000 0%,#111 100%)',
  backdropFilter:'blur(28px) saturate(160%)',
  WebkitBackdropFilter:'blur(28px) saturate(160%)',
};
const Blobs = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -left-24 -top-20 size-96 rounded-full bg-white/5 blur-3xl"/>
    <div className="absolute right-0 -bottom-24 size-72 rounded-full bg-white/7 blur-2xl"/>
  </div>
);

/* ================================================================= */
export default function CreateServiceModal({
  open,
  onClose,
  onCreated = () => {},
  onEdit    = () => {},
}) {
  const { profile } = useAuth();

  /* form state */
  const [draft, setDraft]   = useState({ title:'', description:'', price:'', tags:'', is_virtual:false });
  const [imageFile, setImg] = useState(null);
  const [extras, setExtras] = useState([]);
  const [slots,  setSlots]  = useState([]);

  /* inline extras */
  const [exTitle, setExTitle] = useState('');
  const [exPrice, setExPrice] = useState('');
  const [extrasOpen,setExtrasOpen] = useState(false);

  /* ui flags */
  const [errs,setErrs]       = useState({});
  const [submitting,setSub]  = useState(false);
  const [popupOpen,setPopup] = useState(false);
  const [created,setCreated] = useState({ service:null, extras:[], slots:[] });

  /* reset on modal open */
  useEffect(()=>{
    if(!open) return;
    setDraft({ title:'', description:'', price:'', tags:'', is_virtual:false });
    setImg(null); setExtras([]); setSlots([]);
    setExTitle(''); setExPrice(''); setExtrasOpen(false);
    setErrs({}); setSub(false); setPopup(false);
    setCreated({ service:null, extras:[], slots:[] });
  },[open]);

  if(!open) return null;

  /* validation */
  const validate = () => {
    const e={};
    if(!draft.title.trim())        e.title=true;
    if(!draft.description.trim())  e.description=true;
    if(!draft.price||draft.price<=0) e.price=true;
    if(!draft.tags.trim())         e.tags=true;
    if(!imageFile)                 e.image=true;
    if(!slots.length)              e.slots=true;
    setErrs(e);
    if(Object.keys(e).length) toast.error('Συμπληρώστε τα υποχρεωτικά πεδία');
    return !Object.keys(e).length;
  };

  /* submit */
  async function handleSubmit(e){
    e.preventDefault();
    if(submitting) return;
    if(!validate()) return;

    setSub(true);
    const toastId = toast.loading('Αποθήκευση…');

    try{
      /* 1. main row */
      const { data:service, error } = await supabase
        .from('services')
        .insert({ trainer_id:profile.id, ...draft,
                  price:Number(draft.price), tags:tagArray(draft.tags) })
        .select('*').single();
      if(error) throw error;

      /* 2. image */
      const ext=imageFile.name.split('.').pop();
      const path=`${service.id}/${Date.now()}.${ext}`;
      const { error:upErr } = await supabase
        .storage.from('service-images')
        .upload(path,imageFile,{upsert:true});
      if(upErr) throw upErr;
      const { data:{ publicUrl } } = supabase.storage
        .from('service-images').getPublicUrl(path);
      await supabase.from('services').update({ image_url:publicUrl }).eq('id',service.id);
      service.image_url = publicUrl;

      /* 3. extras & slots */
      const exRows = extras.length
        ? (await supabase.from('service_extras')
             .insert(extras.map(ex=>({...ex, service_id:service.id }))).select('*')).data
        : [];
      const slRows = slots.length
        ? (await supabase.from('service_slots')
             .insert(slots.map(s=>({...s, service_id:service.id, booked:false }))).select('*')).data
        : [];

      toast.dismiss(toastId);
      setCreated({ service, extras:exRows, slots:slRows });
      setPopup(true);
      setSub(false);
    }catch(err){
      console.error('[CreateServiceModal]',err);
      toast.dismiss(toastId);
      toast.error(err.message||'Σφάλμα δημιουργίας');
      setSub(false);
    }
  }

  /* helpers for quick slot add & range add */
  const quickAddSlot = () => {
    const dt = prompt('Ώρα έναρξης (YYYY-MM-DDThh:mm)');
    if(!dt) return;
    const start = new Date(dt);
    if(Number.isNaN(start)) return toast.error('Μη έγκυρη ημερομηνία');
    const dur = Number(prompt('Διάρκεια (λεπτά)',60));
    if(!dur||dur<=0) return toast.error('Μη έγκυρη διάρκεια');
    setSlots(p=>[...p,{ starts_at:start.toISOString(), duration_minutes:dur }]);
  };

  function SlotRangeDraftForm(){
    const [date,setDate] = useState('');
    const [from,setFrom] = useState('08:00');
    const [to,setTo]     = useState('17:00');
    const [step,setStep] = useState(60);
    const [dur,setDur]   = useState(60);
    const [msg,setMsg]   = useState('');

    const local = (d,t)=>{ const [h,m]=t.split(':'); const dt=new Date(`${d}T00:00`); dt.setHours(+h,+m); return dt; };

    const addRange = ()=>{
      setMsg('');
      if(!date) return setMsg('Επιλέξτε ημερομηνία');
      const start=local(date,from), end=local(date,to);
      if(end<=start) return setMsg('Η λήξη πρέπει να είναι μετά την έναρξη');
      if(step<=0||dur<=0) return setMsg('Βήμα & διάρκεια πρέπει >0');
      const rows=[];
      for(let ts=new Date(start); ts<end; ts=new Date(ts.getTime()+step*60000))
        rows.push({ starts_at:ts.toISOString(), duration_minutes:dur });
      if(!rows.length) return setMsg('Δεν δημιουργήθηκαν slots');
      setSlots(p=>[...rows,...p]); setMsg(`✅ Προστέθηκαν ${rows.length} slots`);
    };

    return(
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Input type="date"  className="w-32" value={date} onChange={e=>setDate(e.target.value)}/>
        <Input type="time"  className="w-24" value={from} onChange={e=>setFrom(e.target.value)}/>
        <Input type="time"  className="w-24" value={to}   onChange={e=>setTo(e.target.value)}/>
        <Input type="number" className="w-20" min="1" value={step} onChange={e=>setStep(+e.target.value)}/>
        <Input type="number" className="w-20" min="1" value={dur}  onChange={e=>setDur(+e.target.value)}/>
        <button type="button" className="btn-secondary px-3 py-1.5" onClick={addRange}>Προσθήκη range</button>
        {msg && <span className="ml-2 text-green-400">{msg}</span>}
      </div>
    );
  }

  /* tiny primitives */
  const baseInput =
    'rounded-md bg-white/5 py-2.5 px-3 w-full text-sm text-gray-100 placeholder-gray-500 '+
    'border border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/70 '+
    'focus:border-primary/70 transition';
  const Input    = p => <input   {...p} className={`${baseInput}${p.error?' border-red-600 focus:ring-red-600':''} ${p.className||''}`}/>; // eslint-disable-line
  const Textarea = p => <textarea {...p} className={`${baseInput} h-32 resize-none${p.error?' border-red-600 focus:ring-red-600':''} ${p.className||''}`}/>; // eslint-disable-line
  const Label    = ({text,error,className=''}) => <label className={`block mb-1 text-xs ${error?'text-red-500':'text-gray-400'} ${className}`}>{text}</label>;
  const Switch   = ({checked,onChange,label}) => (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <span className={`relative inline-block h-5 w-9 rounded-full transition ${checked?'bg-primary':'bg-gray-700'}`}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={e=>onChange(e.target.checked)}/>
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition ${checked?'translate-x-4':''}`}/>
      </span>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );

  /* ––––––––– JSX ––––––––– */
  return createPortal(
    <AnimatePresence>
      {/* dim layer */}
      <motion.div key="bg" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  transition={{duration:0.25}}
                  className="fixed inset-0 z-50 grid place-items-center">
        <motion.div className="absolute inset-0 bg-black"
                    initial={{opacity:0}} animate={{opacity:0.6}} exit={{opacity:0}}
                    transition={{duration:0.25}}
                    onClick={() => !popupOpen && onClose()}/>

        {/* card */}
        <motion.form onSubmit={handleSubmit}
          initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.8,opacity:0}}
          transition={{duration:0.35,ease:[0.42,0,0.2,1]}}
          className={`relative max-h-[90vh] w-[92vw] max-w-3xl overflow-y-auto rounded-3xl shadow-2xl ${ringMono}`}
          style={glassBG}>
          {/* inline css tokens */}
          <style>{`
            .btn-primary  {border-radius:.5rem;background:#10b981;padding:.5rem 1rem;font-size:.875rem;font-weight:500;color:#fff;transition:.2s;}
            .btn-primary:hover  {background:#059669;}
            .btn-secondary{border-radius:.5rem;background:rgba(255,255,255,.1);padding:.375rem .75rem;font-size:.75rem;color:#e5e5e5;transition:.2s;}
            .btn-secondary:hover{background:rgba(255,255,255,.15);}
            .btn-cancel  {border-radius:.5rem;background:#ef4444;padding:.5rem 1rem;font-size:.875rem;font-weight:500;color:#fff;transition:.2s;}
            .btn-cancel:hover  {background:#dc2626;}
            .icon-btn{display:inline-flex;align-items:center;justify-content:center;border-radius:9999px;padding:.25rem;}
          `}</style>
          <Blobs/>

          {/* header */}
          <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
              <Upload className="size-5 text-gray-400"/> Δημιουργία Υπηρεσίας
            </h2>
            <button type="button" className="icon-btn text-gray-400 hover:text-gray-100"
                    disabled={submitting||popupOpen} onClick={onClose}>
              <X className="size-5"/>
            </button>
          </header>

          {/* body */}
          <div className="grid gap-6 p-8 md:grid-cols-2">
            {/* left column */}
            <div className="space-y-5">
              <Label text="Τίτλος *" error={errs.title}/>
              <Input placeholder="Τίτλος" value={draft.title} error={errs.title}
                     onChange={e=>setDraft({...draft,title:e.target.value})}/>

              <Label text="Περιγραφή *" className="mt-4" error={errs.description}/>
              <Textarea placeholder="Περιγραφή" value={draft.description} error={errs.description}
                        onChange={e=>setDraft({...draft,description:e.target.value})}/>

              <Label text="Τιμή (€) *" className="mt-4" error={errs.price}/>
              <div className="relative">
                <Euro className="absolute left-3 top-2.5 size-4 text-gray-500"/>
                <Input type="number" className="pl-10" placeholder="0"
                       value={draft.price} error={errs.price}
                       onChange={e=>setDraft({...draft,price:e.target.value})}/>
              </div>

              <Label text="Ετικέτες (κόμμα) *" className="mt-4" error={errs.tags}/>
              <Input placeholder="fitness, yoga" value={draft.tags} error={errs.tags}
                     onChange={e=>setDraft({...draft,tags:e.target.value})}/>

              <div className="pt-4">
                <Switch checked={draft.is_virtual}
                        onChange={v=>setDraft({...draft,is_virtual:v})}
                        label="Διαδικτυακή"/>
              </div>
            </div>

            {/* right column */}
            <div className="space-y-6">
              <Label text="Εικόνα *" error={errs.image}/>
              <div onDragOver={e=>e.preventDefault()}
                   onDrop={e=>{e.preventDefault(); if(e.dataTransfer.files?.[0]) setImg(e.dataTransfer.files[0]);}}>
                <label htmlFor="img-up"
                       className={`group relative flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed
                                   ${errs.image?'border-red-600':'border-white/15'} text-center transition
                                   hover:border-primary/60 hover:bg-white/5`}>
                  {imageFile
                    ? <img src={URL.createObjectURL(imageFile)} alt="preview"
                           className="h-full w-full rounded-xl object-cover"/>
                    : (
                      <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-300">
                        <Upload className="h-8 w-8"/><p className="mt-2 text-sm">Κλικ ή σύρε εικόνα</p>
                      </div>
                    )}
                </label>
                <input id="img-up" type="file" accept="image/*" className="sr-only"
                       onChange={e=>setImg(e.target.files?.[0] || null)}/>
              </div>

              {/* extras */}
              <div className="rounded-xl bg-white/5 border border-white/10">
                <button type="button" onClick={()=>setExtrasOpen(!extrasOpen)}
                        className="w-full flex items-center justify-between px-5 py-4 text-gray-200">
                  <span className="font-medium">Πρόσθετα</span>
                  <ChevronDown className={`size-5 transition ${extrasOpen?'rotate-180':''}`}/>
                </button>
                <AnimatePresence initial={false}>
                  {extrasOpen && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
                                exit={{height:0,opacity:0}} transition={{duration:0.3,ease:[0.42,0,0.2,1]}}
                                className="px-5 pb-5 space-y-4">
                      <div className="flex gap-2">
                        <Input className="flex-1" placeholder="Τίτλος"
                               value={exTitle} onChange={e=>setExTitle(e.target.value)}/>
                        <Input type="number" className="w-24" placeholder="€"
                               value={exPrice} onChange={e=>setExPrice(e.target.value)}/>
                        <button type="button" className="icon-btn text-gray-300 hover:text-primary"
                                onClick={()=>{ if(!exTitle||!exPrice) return;
                                               setExtras([...extras,{title:exTitle,price:Number(exPrice)}]);
                                               setExTitle(''); setExPrice('');}}>
                          <PlusCircle className="size-5"/>
                        </button>
                      </div>

                      {extras.length
                        ? (
                          <ul className="space-y-1 text-xs">
                            {extras.map((ex,i)=>(
                              <li key={i} className="flex justify-between rounded bg-white/10 px-3 py-2">
                                <span>{ex.title}</span>
                                <span className="flex items-center gap-2">
                                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary/90">
                                    €{ex.price}
                                  </span>
                                  <Trash2 className="size-4 cursor-pointer text-gray-400 hover:text-red-500"
                                          onClick={()=>setExtras(extras.filter((_,idx)=>idx!==i))}/>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )
                        : <p className="text-xs text-gray-500">Δεν υπάρχουν πρόσθετα.</p>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* slots */}
            <div className="md:col-span-2 rounded-xl bg-white/5 border border-white/10 p-5">
              <header className="mb-3 flex items-center justify-between text-gray-200">
                <span className="font-medium">Πρόχειρες ώρες *</span>
                <button type="button"
                        className="btn-secondary flex items-center gap-1 text-xs"
                        onClick={quickAddSlot}>
                  <CalendarClock className="size-4"/> Προσθήκη
                </button>
              </header>

              <SlotRangeDraftForm/>
              {errs.slots && <p className="text-xs text-red-500 mb-2">Προσθέστε ώρες</p>}

              {slots.length
                ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {slots.map((sl,i)=>(
                      <li key={i} className="rounded bg-white/10 px-3 py-2">
                        {new Date(sl.starts_at).toLocaleString('el-GR',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        {' '}({sl.duration_minutes} λ.)
                      </li>
                    ))}
                  </ul>
                )
                : <p className="text-xs text-gray-500">Χωρίς πρόχειρες ώρες.</p>}
            </div>
          </div>

          {/* footer */}
          <footer className="flex items-center justify-end gap-3 px-8 py-4 border-t border-white/10 bg-black/30">
            <button type="button" className="btn-cancel flex items-center gap-1"
                    disabled={submitting||popupOpen} onClick={onClose}>
              <X className="size-4"/> Άκυρωση
            </button>
            <button type="submit" className="btn-primary flex items-center gap-1"
                    disabled={submitting||popupOpen}>
              <Check className="size-4"/> Δημιουργία
            </button>
          </footer>
        </motion.form>
      </motion.div>

      {/* popup */}
      {popupOpen && (
        <ServiceCreatedPopup
          service={created.service}
          onContinue={()=>{
            setPopup(false);
            onCreated(created.service, created.extras, created.slots);
            onClose();
          }}
          onEdit={(srv)=>{
            setPopup(false);
            onEdit(srv);
            onClose();
          }}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}
