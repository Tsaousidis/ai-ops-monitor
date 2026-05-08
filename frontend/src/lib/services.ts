import { apiRequest } from "./api";
import type {
  AIInsight,
  AlertRule,
  Incident,
  LogEntry,
  Metric,
  MonitoringResult,
  Service,
} from "./types";

export async function fetchServices() {
  return apiRequest<Service[]>("/services/");
}

export async function fetchIncidents() {
  return apiRequest<Incident[]>("/incidents/");
}

export async function fetchIncidentInsights(incidentId: number) {
  return apiRequest<AIInsight[]>(
    `/incidents/${incidentId}/ai-insights`,
  );
}

export async function generateIncidentInsight(incidentId: number) {
  return apiRequest<AIInsight>(
    `/incidents/${incidentId}/ai-insights`,
    {
      method: "POST",
    },
  );
}

export async function resolveIncident(incidentId: number) {
  return apiRequest<Incident>(
    `/incidents/${incidentId}/resolve`,
    {
      method: "POST",
    },
  );
}

export async function reopenIncident(incidentId: number) {
  return apiRequest<Incident>(
    `/incidents/${incidentId}/reopen`,
    {
      method: "POST",
    },
  );
}

export async function escalateIncident(incidentId: number) {
  return apiRequest<Incident>(
    `/incidents/${incidentId}/escalate`,
    {
      method: "POST",
    },
  );
}

export async function fetchServiceMetrics(serviceId: number) {
  return apiRequest<Metric[]>(`/metrics/service/${serviceId}`);
}

export async function fetchServiceAlertRule(serviceId: number) {
  return apiRequest<AlertRule>(
    `/alert-rules/service/${serviceId}`,
  );
}

export async function updateServiceAlertRule(
  serviceId: number,
  alertRule: Pick<
    AlertRule,
    | "warning_response_time_ms"
    | "critical_response_time_ms"
    | "enabled"
  >,
) {
  return apiRequest<AlertRule>(
    `/alert-rules/service/${serviceId}`,
    {
      method: "PUT",
      body: JSON.stringify(alertRule),
    },
  );
}

export async function fetchLogs(serviceId?: number) {
  const searchParams = new URLSearchParams({
    limit: "50",
  });

  if (serviceId) {
    searchParams.set("service_id", String(serviceId));
  }

  return apiRequest<LogEntry[]>(
    `/logs/?${searchParams.toString()}`,
  );
}

export async function runMonitoringCheck() {
  return apiRequest<MonitoringResult[]>(
    "/monitoring/check-services",
    {
      method: "POST",
    },
  );
}
