"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchIncidents,
  fetchServices,
  runMonitoringCheck,
} from "@/src/lib/services";
import type { Incident, Service } from "@/src/lib/types";

function getStatusClass(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "healthy") {
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  }

  if (
    normalizedStatus === "warning" ||
    normalizedStatus === "degraded"
  ) {
    return "text-amber-300 bg-amber-500/10 border-amber-500/20";
  }

  return "text-red-300 bg-red-500/10 border-red-500/20";
}

function getSeverityClass(severity: string) {
  const normalizedSeverity = severity.toLowerCase();

  if (normalizedSeverity === "critical") {
    return "border-red-500/30 bg-red-500/10 text-red-100";
  }

  if (normalizedSeverity === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-200";
}

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const openIncidents = useMemo(
    () => incidents.filter((incident) => incident.status === "open"),
    [incidents],
  );

  const healthyServices = useMemo(
    () => services.filter((service) => service.status === "healthy"),
    [services],
  );

  const loadDashboardData = useCallback(async () => {
    setError(null);

    try {
      const [servicesData, incidentsData] = await Promise.all([
        fetchServices(),
        fetchIncidents(),
      ]);

      setServices(servicesData);
      setIncidents(incidentsData);
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load dashboard data",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboardData();
  }, [loadDashboardData]);

  async function handleMonitoringCheck() {
    setIsChecking(true);
    setError(null);

    try {
      await runMonitoringCheck();
      await loadDashboardData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to run monitoring check",
      );
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              AI Ops Monitor
            </h1>

            <p className="mt-1 text-zinc-400">
              Real-time observability dashboard
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated ? (
              <p className="text-sm text-zinc-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            ) : null}

            <button
              className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isChecking}
              onClick={handleMonitoringCheck}
              type="button"
            >
              {isChecking ? "Checking..." : "Run check"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Services</p>
            <p className="mt-2 text-3xl font-semibold">
              {services.length}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Healthy</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-400">
              {healthyServices.length}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">Open incidents</p>
            <p className="mt-2 text-3xl font-semibold text-red-300">
              {openIncidents.length}
            </p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Services</h2>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">
              Loading services...
            </div>
          ) : services.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <article
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
                  key={service.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        {service.name}
                      </h3>
                      <p className="mt-1 break-all text-sm text-zinc-500">
                        {service.base_url}
                      </p>
                    </div>

                    <span
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${getStatusClass(service.status)}`}
                    >
                      {service.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">
              No services registered yet.
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold">Incidents</h2>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">
                Loading incidents...
              </div>
            ) : incidents.length > 0 ? (
              incidents.map((incident) => (
                <article
                  className={`rounded-lg border p-4 ${getSeverityClass(incident.severity)}`}
                  key={incident.id}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-medium">
                        {incident.title}
                      </h3>
                      <p className="mt-1 text-sm opacity-80">
                        {incident.description}
                      </p>
                    </div>

                    <div className="flex gap-2 text-xs font-medium">
                      <span className="rounded-md border border-current/20 px-2 py-1">
                        {incident.severity}
                      </span>
                      <span className="rounded-md border border-current/20 px-2 py-1">
                        {incident.status}
                      </span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">
                No incidents detected.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
