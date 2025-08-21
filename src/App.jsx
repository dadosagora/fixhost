import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import FixHostPhotoPicker from "./components/FixHostPhotoPicker";

const REAL_TICKET_ID = "b154723a-8304-414d-af91-63c53d4415da";
const TABLE_NAME = "chamados";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("fotos")
        .eq("id", REAL_TICKET_ID)
        .single();
      if (!error && data?.fotos) setUrls(data.fotos);
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>FixHost – Upload de Fotos (PROD)</h1>
      <FixHostPhotoPicker
        ticketId={REAL_TICKET_ID}
        currentUrls={urls}
        onSaved={(newUrls) => setUrls(newUrls)}
      />
    </div>
  );
}
