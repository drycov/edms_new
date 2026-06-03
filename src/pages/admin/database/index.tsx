export function DatabasePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Database</h1>

      <div className="mt-4 space-y-4">
        <div className="border rounded-lg p-4">
          Migrations status
        </div>

        <div className="border rounded-lg p-4">
          Backup / Restore
        </div>
      </div>
    </div>
  );
}