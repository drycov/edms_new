export function IntegrationsPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Integrations</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Supabase</h3>
          <p className="text-sm text-gray-500">
            Database + Auth integration
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">SMTP</h3>
          <p className="text-sm text-gray-500">
            Email delivery service
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold">Webhooks</h3>
          <p className="text-sm text-gray-500">
            Event-driven integrations
          </p>
        </div>
      </div>
    </div>
  );
}