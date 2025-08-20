import FixHostPhotoPicker from "./components/FixHostPhotoPicker";

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>TESTE: FixHostPhotoPicker montado?</h1>

      {/* Render direto do componente com um ticketId qualquer só para aparecer na tela */}
      <FixHostPhotoPicker
        ticketId="TESTE_TICKET_ID"
        currentUrls={[]}
        onSaved={(urls) => console.log("onSaved (teste):", urls)}
      />
    </div>
  );
}
