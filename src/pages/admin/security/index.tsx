export function SecurityPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Security</h1>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-4">
          Roles & Permissions
        </div>

        <div className="border rounded-lg p-4">
          Audit Logs
        </div>
      </div>
    </div>
  );
}