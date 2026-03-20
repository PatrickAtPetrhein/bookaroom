"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function routeBySession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      router.replace(user ? "/schedule" : "/login");
    }

    void routeBySession();
  }, [router, supabase]);

  return null;
}
