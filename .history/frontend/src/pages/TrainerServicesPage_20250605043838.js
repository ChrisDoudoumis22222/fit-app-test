/* (imports stay the same) */

export default function TrainerServicesPage() {
  const { profile, loading } = useAuth();            // ← include loading

  /* wait until profile is ready */
  if (loading) return <p style={{ textAlign: "center" }}>Loading…</p>;

  /* ── STATE & EFFECTS (unchanged except for the dep) ── */
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState({});
  const [extras, setExtras] = useState({});
  /* …draft state stays the same… */

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("services")
        .select("*, service_slots(*), service_extras(*)")
        .eq("trainer_id", profile.id)         // profile now guaranteed
        .order("created_at", { ascending: false });

      /* build slot/extra maps */
      const slotMap = {}, extraMap = {};
      (data || []).forEach((s) => {
        slotMap[s.id]  = s.service_slots;
        extraMap[s.id] = s.service_extras;
      });
      setServices(data || []);
      setSlots(slotMap);
      setExtras(extraMap);
    })();
  }, [profile.id]);                           // safe: profile.id exists

  /* ── mergeSlots helper (was missing) ── */
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

  /* rest of file (form, JSX) is identical */
  /* … */
}
