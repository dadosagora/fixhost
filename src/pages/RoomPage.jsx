import RoleGate from "../components/RoleGate";

export default function RoomPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quartos</h2>
        <RoleGate allow={["gestor"]}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Novo quarto
          </button>
        </RoleGate>
      </div>

      <div className="bg-white border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Número</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Status</th>
              <th className="p-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2" colSpan={5}>Nenhum quarto cadastrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
