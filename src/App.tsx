import TestFotos from "./components/TestFotos";

export default function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Diagnóstico de Upload</h1>
      <p>Teste com 1 da galeria + 1 da câmera. Veja o console (F12) para logs.</p>
      <TestFotos />
    </div>
  );
}
