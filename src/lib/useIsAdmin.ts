import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Authoritative server-side check (SECURITY DEFINER RPC).
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (cancelled) return;
      setIsAdmin(!error && data === true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, loading };
}
