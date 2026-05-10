"use client";

import type { FormEvent, ReactNode } from "react";
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

import {
  clearAuthToken,
  getAuthToken,
  getWebSocketUrl,
  setAuthToken,
} from "@/src/lib/api";
import {
  escalateIncident,
  fetchCurrentUser,
  fetchIncidents,
  fetchIncidentInsights,
  fetchLogs,
  fetchServiceAlertRule,
  fetchServiceMetrics,
  fetchServices,
  generateIncidentInsight,
  login as loginRequest,
  reopenIncident,
  resolveIncident,
  runMonitoringCheck,
  updateServiceAlertRule,
} from "@/src/lib/services";
import type {
  AIInsight,
  AlertRule,
  CurrentUser,
  Incident,
  LogEntry,
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

function formatLogTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getLogLevelClass(level: string) {
  const normalizedLevel = level.toLowerCase();

  if (normalizedLevel === "error") {
    return "border-red-500/30 bg-red-500/10 text-red-100";
  }

  if (normalizedLevel === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-zinc-800 bg-zinc-900 text-zinc-200";
}

function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800/80 ${className}`}
    />
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-800 bg-zinc-900/90 shadow-sm shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/60 p-6">
      <p className="font-medium text-zinc-200">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="flex h-full flex-col justify-end gap-3">
      <SkeletonBlock className="h-5 w-32" />
      <SkeletonBlock className="h-40 w-full" />
      <div className="flex justify-between">
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-3 w-14" />
        <SkeletonBlock className="h-3 w-14" />
      </div>
    </div>
  );
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
  const [authToken, setAuthTokenState] = useState<string | null>(
    null,
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [insights, setInsights] = useState<
    Record<number, AIInsight[]>
  >({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [alertRule, setAlertRule] = useState<AlertRule | null>(
    null,
  );
  const [warningThreshold, setWarningThreshold] = useState("500");
  const [criticalThreshold, setCriticalThreshold] = useState("1000");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSavingAlertRule, setIsSavingAlertRule] = useState(false);
  const [generatingInsightId, setGeneratingInsightId] = useState<
    number | null
  >(null);
  const [incidentActionId, setIncidentActionId] = useState<
    number | null
  >(null);
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

      const insightsEntries = await Promise.all(
        incidentsData.map(async (incident) => {
          const incidentInsights = await fetchIncidentInsights(
            incident.id,
          );

          return [incident.id, incidentInsights] as const;
        }),
      );

      setInsights(Object.fromEntries(insightsEntries));
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

  const loadLogs = useCallback(async (serviceId?: number) => {
    try {
      const logsData = await fetchLogs(serviceId);

      setLogs(logsData);
    } catch {
      setLogs([]);
    }
  }, []);

  const loadAlertRule = useCallback(async (serviceId: number) => {
    const rule = await fetchServiceAlertRule(serviceId);

    setAlertRule(rule);
    setWarningThreshold(String(rule.warning_response_time_ms));
    setCriticalThreshold(String(rule.critical_response_time_ms));
    setAlertsEnabled(rule.enabled);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = getAuthToken();

      if (!storedToken) {
        setAuthChecked(true);
        setIsLoading(false);
        return;
      }

      try {
        const user = await fetchCurrentUser();

        setAuthTokenState(storedToken);
        setCurrentUser(user);
      } catch {
        clearAuthToken();
        setAuthTokenState(null);
        setCurrentUser(null);
        setIsLoading(false);
      } finally {
        setAuthChecked(true);
      }
    }

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboardData();
  }, [authToken, loadDashboardData]);

  useEffect(() => {
    if (!authToken || !activeServiceId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMetrics(activeServiceId);
    void loadLogs(activeServiceId);
    void loadAlertRule(activeServiceId);
  }, [
    activeServiceId,
    authToken,
    loadAlertRule,
    loadLogs,
    loadMetrics,
  ]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl(authToken));

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
      let socketEvent: WebSocketEvent;

      try {
        socketEvent = JSON.parse(message.data) as WebSocketEvent;
      } catch {
        return;
      }

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

      if (socketEvent.event === "log_update") {
        if (
          activeServiceId &&
          socketEvent.data.service_id !== activeServiceId
        ) {
          return;
        }

        setLogs((currentLogs) => {
          const nextLogs = [
            socketEvent.data,
            ...currentLogs.filter(
              (log) => log.id !== socketEvent.data.id,
            ),
          ];

          return nextLogs.slice(0, 50);
        });
      }
    };

    return () => {
      socket.close();
    };
  }, [activeServiceId, authToken, loadDashboardData, loadMetrics]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const tokenResponse = await loginRequest(
        loginUsername,
        loginPassword,
      );

      setAuthToken(tokenResponse.access_token);

      const user = await fetchCurrentUser();

      setAuthTokenState(tokenResponse.access_token);
      setCurrentUser(user);
      setIsLoading(true);
      await loadDashboardData();
    } catch (requestError) {
      clearAuthToken();
      setAuthTokenState(null);
      setCurrentUser(null);
      setLoginError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in",
      );
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    clearAuthToken();
    setAuthTokenState(null);
    setCurrentUser(null);
    setServices([]);
    setIncidents([]);
    setInsights({});
    setLogs([]);
    setMetrics([]);
    setAlertRule(null);
    setSelectedServiceId(null);
    setIsLoading(false);
  }

  async function handleMonitoringCheck() {
    setIsChecking(true);
    setError(null);

    try {
      await runMonitoringCheck();
      await loadDashboardData();

      if (activeServiceId) {
        await loadMetrics(activeServiceId);
        await loadLogs(activeServiceId);
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

  async function handleGenerateInsight(incidentId: number) {
    setGeneratingInsightId(incidentId);
    setError(null);

    try {
      const insight = await generateIncidentInsight(incidentId);

      setInsights((currentInsights) => ({
        ...currentInsights,
        [incidentId]: [insight],
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate AI insight",
      );
    } finally {
      setGeneratingInsightId(null);
    }
  }

  async function handleSaveAlertRule() {
    if (!activeServiceId) {
      return;
    }

    setIsSavingAlertRule(true);
    setError(null);

    try {
      const updatedRule = await updateServiceAlertRule(
        activeServiceId,
        {
          warning_response_time_ms: Number(warningThreshold),
          critical_response_time_ms: Number(criticalThreshold),
          enabled: alertsEnabled,
        },
      );

      setAlertRule(updatedRule);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save alert rule",
      );
    } finally {
      setIsSavingAlertRule(false);
    }
  }

  async function handleIncidentAction(
    incidentId: number,
    action: "resolve" | "reopen" | "escalate",
  ) {
    setIncidentActionId(incidentId);
    setError(null);

    try {
      if (action === "resolve") {
        await resolveIncident(incidentId);
      }

      if (action === "reopen") {
        await reopenIncident(incidentId);
      }

      if (action === "escalate") {
        await escalateIncident(incidentId);
      }

      await loadDashboardData();

      if (activeServiceId) {
        await loadLogs(activeServiceId);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update incident",
      );
    } finally {
      setIncidentActionId(null);
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <Panel className="w-full max-w-sm p-6">
          <SkeletonBlock className="h-7 w-44" />
          <SkeletonBlock className="mt-4 h-4 w-56" />
          <SkeletonBlock className="mt-8 h-10 w-full" />
        </Panel>
      </main>
    );
  }

  if (!authToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-10 text-white">
        <form
          className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900/95 p-6 shadow-xl shadow-black/30"
          onSubmit={handleLogin}
        >
          <div>
            <h1 className="text-2xl font-semibold">AI Ops Monitor</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Admin access required for the operations dashboard
            </p>
          </div>

          {loginError ? (
            <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
              {loginError}
            </div>
          ) : null}

          <label className="mt-5 block text-sm text-zinc-300">
            Username
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-cyan-500/70"
              onChange={(event) =>
                setLoginUsername(event.target.value)
              }
              value={loginUsername}
            />
          </label>

          <label className="mt-4 block text-sm text-zinc-300">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-cyan-500/70"
              onChange={(event) =>
                setLoginPassword(event.target.value)
              }
              type="password"
              value={loginPassword}
            />
          </label>

          <button
            className="mt-6 w-full rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isAuthenticating}
            type="submit"
          >
            {isAuthenticating ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              AI Ops Monitor
            </h1>

            <p className="mt-1 text-zinc-400">
              Real-time observability dashboard
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

            {currentUser ? (
              <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-300">
                {currentUser.username}
              </span>
            ) : null}

            <button
              className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isChecking}
              onClick={handleMonitoringCheck}
              type="button"
            >
              {isChecking ? "Checking..." : "Run check"}
            </button>

            <button
              className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
              onClick={handleLogout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Panel className="p-4">
            <p className="text-sm text-zinc-400">Services</p>
            <p className="mt-2 text-3xl font-semibold">
              {services.length}
            </p>
          </Panel>

          <Panel className="p-4">
            <p className="text-sm text-zinc-400">Healthy</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-400">
              {healthyServices.length}
            </p>
          </Panel>

          <Panel className="p-4">
            <p className="text-sm text-zinc-400">Open incidents</p>
            <p className="mt-2 text-3xl font-semibold text-red-300">
              {openIncidents.length}
            </p>
          </Panel>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Services</h2>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Panel className="p-5" key={item}>
                  <SkeletonBlock className="h-5 w-32" />
                  <SkeletonBlock className="mt-3 h-4 w-full" />
                  <SkeletonBlock className="mt-2 h-4 w-2/3" />
                </Panel>
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <button
                  className={`rounded-lg border bg-zinc-900/90 p-5 text-left shadow-sm shadow-black/20 transition hover:-translate-y-0.5 hover:border-zinc-600 ${
                    service.id === activeServiceId
                      ? "border-cyan-500/60"
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
            <EmptyState
              detail="Add a service through the API, then use Run check to collect metrics."
              title="No services registered yet."
            />
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
            <Panel className="p-5">
              <h3 className="font-semibold">Response time</h3>
              <div className="mt-4 h-72">
                {isMetricsLoading ? (
                  <MetricSkeleton />
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
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
                    No response time metrics yet.
                  </div>
                )}
              </div>
            </Panel>

            <Panel className="p-5">
              <h3 className="font-semibold">Availability</h3>
              <div className="mt-4 h-72">
                {isMetricsLoading ? (
                  <MetricSkeleton />
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
                  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
                    No availability metrics yet.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Alert rules</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {activeService
                ? activeService.name
                : "Select a service"}
            </p>
          </div>

          <Panel className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="text-sm text-zinc-300">
              Warning latency
              <input
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-cyan-500/70"
                min="1"
                onChange={(event) =>
                  setWarningThreshold(event.target.value)
                }
                type="number"
                value={warningThreshold}
              />
            </label>

            <label className="text-sm text-zinc-300">
              Critical latency
              <input
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-cyan-500/70"
                min="1"
                onChange={(event) =>
                  setCriticalThreshold(event.target.value)
                }
                type="number"
                value={criticalThreshold}
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  checked={alertsEnabled}
                  onChange={(event) =>
                    setAlertsEnabled(event.target.checked)
                  }
                  type="checkbox"
                />
                Enabled
              </label>

              <button
                className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  !activeServiceId ||
                  !alertRule ||
                  isSavingAlertRule
                }
                onClick={handleSaveAlertRule}
                type="button"
              >
                {isSavingAlertRule ? "Saving..." : "Save"}
              </button>
            </div>
          </Panel>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Live logs</h2>
            <p className="text-sm text-zinc-500">
              {activeService
                ? activeService.name
                : "Select a service"}
            </p>
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/90">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  className={`border-b p-4 text-sm last:border-b-0 ${getLogLevelClass(log.level)}`}
                  key={log.id}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <p className="leading-6">{log.message}</p>
                    <div className="flex shrink-0 gap-2 text-xs opacity-75">
                      <span>{log.level}</span>
                      <span>{formatLogTime(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                detail="Logs appear after a monitoring check or incident action."
                title="No logs streamed yet."
              />
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Incidents</h2>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <Panel className="p-5">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="mt-3 h-4 w-full" />
                <SkeletonBlock className="mt-2 h-4 w-2/3" />
              </Panel>
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

                  {insights[incident.id]?.[0] ? (
                    <div className="mt-4 rounded-md border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                      <p className="font-medium">AI insight</p>
                      <p className="mt-2 opacity-85">
                        {insights[incident.id][0].summary}
                      </p>
                      <p className="mt-2 text-cyan-100/75">
                        {insights[incident.id][0].root_cause}
                      </p>
                    </div>
                  ) : (
                    <button
                      className="mt-4 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        generatingInsightId === incident.id
                      }
                      onClick={() =>
                        handleGenerateInsight(incident.id)
                      }
                      type="button"
                    >
                      {generatingInsightId === incident.id
                        ? "Generating insight..."
                        : "Generate AI insight"}
                    </button>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {incident.status === "open" ? (
                      <button
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          incidentActionId === incident.id
                        }
                        onClick={() =>
                          handleIncidentAction(
                            incident.id,
                            "resolve",
                          )
                        }
                        type="button"
                      >
                        Resolve
                      </button>
                    ) : (
                      <button
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          incidentActionId === incident.id
                        }
                        onClick={() =>
                          handleIncidentAction(
                            incident.id,
                            "reopen",
                          )
                        }
                        type="button"
                      >
                        Reopen
                      </button>
                    )}

                    {incident.severity !== "critical" ? (
                      <button
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          incidentActionId === incident.id
                        }
                        onClick={() =>
                          handleIncidentAction(
                            incident.id,
                            "escalate",
                          )
                        }
                        type="button"
                      >
                        Escalate
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                detail="When a service fails or exceeds thresholds, incidents will appear here."
                title="No incidents detected."
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
