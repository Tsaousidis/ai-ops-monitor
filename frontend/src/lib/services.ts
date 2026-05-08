import { apiRequest } from "./api";
import type {
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
