import { apiRequest } from "./api";
import type {
  AIInsight,
  Incident,
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

export async function fetchServiceMetrics(serviceId: number) {
  return apiRequest<Metric[]>(`/metrics/service/${serviceId}`);
}

export async function runMonitoringCheck() {
  return apiRequest<MonitoringResult[]>(
    "/monitoring/check-services",
    {
      method: "POST",
    },
  );
}
