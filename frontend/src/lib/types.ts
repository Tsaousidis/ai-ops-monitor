export type Service = {
  id: number;
  name: string;
  base_url: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Incident = {
  id: number;
  service_id: number;
  severity: string;
  title: string;
  description: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
};

export type MonitoringResult = {
  service: string;
  status: string;
  response_time: number;
};
