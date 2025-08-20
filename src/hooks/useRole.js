import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useRole() {
  const [role, setRole] = useState(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setRole(null);
      const { data } = await supabase
        .from("app_users")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(data?.role ?? null);
    })();
  }, []);
  return role;
}
