import { apiRequest } from "./api";
import type {
  Incident,
  MonitoringResult,
  Service,
} from "./types";

export async function fetchServices() {
  return apiRequest<Service[]>("/services/");
}

export async function fetchIncidents() {
  return apiRequest<Incident[]>("/incidents/");
}

export async function runMonitoringCheck() {
  return apiRequest<MonitoringResult[]>(
    "/monitoring/check-services",
    {
      method: "POST",
    },
  );
}
