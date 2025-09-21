import { useEffect, useRef, useState } from "react";

export function useStallTimer(active: boolean, ms = 15000) {
  const [stalled, setStalled] = useState(false);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setStalled(false);
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = null;
      return;
    }
    // (re)start timer when active loading begins
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setStalled(true), ms);
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, [active, ms]);

  const reset = () => {
    setStalled(false);
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setStalled(true), ms);
  };

  return { stalled, reset, setStalled };
}
