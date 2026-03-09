export default function GoalStatusBadge({ status }) {
  const map = {
    not_started: { color: "text-zinc-300 bg-zinc-300/10", label: "Δεν ξεκίνησε" },
    in_progress: { color: "text-blue-400 bg-blue-400/10", label: "Σε εξέλιξη" },
    completed: { color: "text-green-400 bg-green-400/10", label: "Ολοκληρώθηκε" },
    archived: { color: "text-zinc-500 bg-zinc-500/10", label: "Αρχειοθετήθηκε" },
  };

  const cfg = map[status] || map.in_progress;

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}