export type FixHostProps = {
  ticketId: string;
  currentUrls?: string[];
  onSaved?: (urls: string[]) => void;
};

export default function FixHostPhotoPicker(props: FixHostProps) {
  return (
    <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ fontWeight: 700 }}>FixHostPhotoPicker (teste mínimo)</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
        ticketId: {props.ticketId}
      </div>
    </div>
  );
}
