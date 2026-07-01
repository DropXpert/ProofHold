import { useEffect, useState } from "react";
import { useDealStore } from "@/store/dealStore";

export function useDealWithRemoteLoad(id?: string) {
  const deal = useDealStore((s) => (id ? s.getDeal(id) : undefined));
  const loadFromSupabase = useDealStore((s) => s.loadFromSupabase);
  const [loadedId, setLoadedId] = useState<string | null>(deal && id ? id : null);

  useEffect(() => {
    if (!id) {
      setLoadedId(null);
      return;
    }

    if (deal) {
      setLoadedId(id);
      return;
    }

    let cancelled = false;
    setLoadedId(null);
    Promise.resolve(loadFromSupabase({ force: true })).finally(() => {
      if (!cancelled) setLoadedId(id);
    });

    return () => {
      cancelled = true;
    };
  }, [id, deal, loadFromSupabase]);

  return {
    deal,
    loading: Boolean(id && !deal && loadedId !== id),
    loaded: Boolean(deal || (id && loadedId === id)),
  };
}
