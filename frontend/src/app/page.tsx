"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getWebSocketUrl } from "@/src/lib/api";
import {
  fetchIncidents,
  fetchServiceMetrics,
  fetchServices,
  runMonitoringCheck,
} from "@/src/lib/services";
import type {
  Incident,
  Metric,
  Service,
  WebSocketEvent,
} from "@/src/lib/types";

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

function formatMetricTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildMetricSeries(
  metrics: Metric[],
  metricType: string,
  valueMapper: (value: number) => number = (value) => value,
) {
  return metrics
    .filter((metric) => metric.metric_type === metricType)
    .slice()
    .sort(
      (firstMetric, secondMetric) =>
        new Date(firstMetric.timestamp).getTime() -
        new Date(secondMetric.timestamp).getTime(),
    )
    .map((metric) => ({
      time: formatMetricTime(metric.timestamp),
      value: valueMapper(metric.value),
    }));
}

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const activeServiceId =
    selectedServiceId ?? services[0]?.id ?? null;

  const activeService = useMemo(
    () =>
      services.find((service) => service.id === activeServiceId) ??
      null,
    [activeServiceId, services],
  );

  const openIncidents = useMemo(
    () => incidents.filter((incident) => incident.status === "open"),
    [incidents],
  );

  const healthyServices = useMemo(
    () => services.filter((service) => service.status === "healthy"),
    [services],
  );

  const visibleMetrics = useMemo(
    () => (activeServiceId ? metrics : []),
    [activeServiceId, metrics],
  );

  const responseTimeData = useMemo(
    () => buildMetricSeries(visibleMetrics, "response_time"),
    [visibleMetrics],
  );

  const availabilityData = useMemo(
    () =>
      buildMetricSeries(
        visibleMetrics,
        "availability",
        (value) => value * 100,
      ),
    [visibleMetrics],
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

  const loadMetrics = useCallback(async (serviceId: number) => {
    setIsMetricsLoading(true);
    setMetricsError(null);

    try {
      const metricsData = await fetchServiceMetrics(serviceId);

      setMetrics(metricsData);
    } catch (requestError) {
      setMetricsError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load service metrics",
      );
    } finally {
      setIsMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!activeServiceId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMetrics(activeServiceId);
  }, [activeServiceId, loadMetrics]);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl());

    socket.onopen = () => {
      setSocketStatus("connected");
    };

    socket.onclose = () => {
      setSocketStatus("disconnected");
    };

    socket.onerror = () => {
      setSocketStatus("disconnected");
    };

    socket.onmessage = (message) => {
      const socketEvent = JSON.parse(
        message.data,
      ) as WebSocketEvent;

      if (socketEvent.event === "service_update") {
        setServices((currentServices) =>
          currentServices.map((service) =>
            service.id === socketEvent.data.service_id
              ? {
                  ...service,
                  status: socketEvent.data.status,
                }
              : service,
          ),
        );

        void loadDashboardData();

        if (
          activeServiceId === socketEvent.data.service_id
        ) {
          void loadMetrics(activeServiceId);
        }
      }

      if (socketEvent.event === "incident_update") {
        void loadDashboardData();
      }
    };

    return () => {
      socket.close();
    };
  }, [activeServiceId, loadDashboardData, loadMetrics]);

  async function handleMonitoringCheck() {
    setIsChecking(true);
    setError(null);

    try {
      await runMonitoringCheck();
      await loadDashboardData();

      if (activeServiceId) {
        await loadMetrics(activeServiceId);
      }
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
            <span
              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                socketStatus === "connected"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              {socketStatus}
            </span>

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
                <button
                  className={`rounded-lg border bg-zinc-900 p-5 text-left transition hover:border-zinc-600 ${
                    service.id === activeServiceId
                      ? "border-zinc-500"
                      : "border-zinc-800"
                  }`}
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  type="button"
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
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-zinc-400">
              No services registered yet.
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Metrics</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {activeService
                  ? activeService.name
                  : "Select a service"}
              </p>
            </div>

            {services.length > 0 ? (
              <select
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                onChange={(event) =>
                  setSelectedServiceId(Number(event.target.value))
                }
                value={activeServiceId ?? ""}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {metricsError ? (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {metricsError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-semibold">Response time</h3>
              <div className="mt-4 h-72">
                {isMetricsLoading ? (
                  <div className="flex h-full items-center text-sm text-zinc-500">
                    Loading response time...
                  </div>
                ) : responseTimeData.length > 0 ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={responseTimeData}>
                      <CartesianGrid
                        stroke="#27272a"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="time"
                        stroke="#71717a"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#71717a"
                        tick={{ fontSize: 12 }}
                        unit="ms"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "8px",
                          color: "#fafafa",
                        }}
                      />
                      <Line
                        dataKey="value"
                        dot={false}
                        name="Response time"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center text-sm text-zinc-500">
                    No response time metrics yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-semibold">Availability</h3>
              <div className="mt-4 h-72">
                {isMetricsLoading ? (
                  <div className="flex h-full items-center text-sm text-zinc-500">
                    Loading availability...
                  </div>
                ) : availabilityData.length > 0 ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <LineChart data={availabilityData}>
                      <CartesianGrid
                        stroke="#27272a"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="time"
                        stroke="#71717a"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#71717a"
                        tick={{ fontSize: 12 }}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "8px",
                          color: "#fafafa",
                        }}
                      />
                      <Line
                        dataKey="value"
                        dot={false}
                        name="Availability"
                        stroke="#34d399"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center text-sm text-zinc-500">
                    No availability metrics yet.
                  </div>
                )}
              </div>
            </div>
          </div>
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
