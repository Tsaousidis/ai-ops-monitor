export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="p-8">
        {/* HEADER */}
        <h1 className="text-3xl font-bold">
          AI Ops Monitor
        </h1>

        <p className="text-zinc-400 mt-1">
          Real-time observability dashboard
        </p>

        {/* GRID */}
        <div className="grid grid-cols-3 gap-4 mt-10">

          {/* SERVICE CARD */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h2 className="font-semibold">API Gateway</h2>
            <p className="text-sm text-green-400 mt-2">
              Healthy
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h2 className="font-semibold">Auth Service</h2>
            <p className="text-sm text-yellow-400 mt-2">
              Warning
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h2 className="font-semibold">Database</h2>
            <p className="text-sm text-green-400 mt-2">
              Healthy
            </p>
          </div>

        </div>

        {/* INCIDENT SECTION */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold">
            Incidents
          </h2>

          <div className="mt-4 space-y-2">

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded">
              High latency detected in API Gateway
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
              Auth service response delay increased
            </div>

          </div>
        </div>

      </div>
    </main>
  );
}