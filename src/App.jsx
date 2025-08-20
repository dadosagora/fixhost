import React from "react";
import FixHostPhotoPicker from "./FixHostPhotoPicker";

export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Teste de Upload de Fotos</h1>
      <FixHostPhotoPicker
        ticketId="b154723a-8304-414d-af91-63c53d4415da"
        tableName="chamados"
      />
    </div>
  );
}
