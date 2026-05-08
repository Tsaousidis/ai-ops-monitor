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

export type AIInsight = {
  id: number;
  incident_id: number;
  summary: string;
  root_cause: string;
  created_at: string;
};

export type AlertRule = {
  id: number;
  service_id: number;
  warning_response_time_ms: number;
  critical_response_time_ms: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Metric = {
  id: number;
  service_id: number;
  metric_type: "response_time" | "availability" | string;
  value: number;
  timestamp: string;
};

export type LogEntry = {
  id: number;
  service_id: number;
  level: string;
  message: string;
  timestamp: string;
};

export type MonitoringResult = {
  service_id: number;
  service: string;
  status: string;
  response_time: number;
};

export type WebSocketEvent =
  | {
      event: "service_update";
      data: {
        service_id: number;
        service: string;
        status: string;
        response_time: number;
      };
    }
  | {
      event: "incident_update";
      data: {
        id: number;
        service_id: number;
        severity: string;
        title: string;
        status: string;
      };
    }
  | {
      event: "log_update";
      data: LogEntry;
    };
