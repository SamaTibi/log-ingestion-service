export const LOG_LEVELS = [
  "debug",
  "info",
  "warn",
  "error",
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface LogInput {
  timestamp: string | Date;
  level: LogLevel;
  service: string;
  message: string;
  attributes?: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  attributes: Record<string, unknown>;
  createdAt: Date;
}

export interface IngestLogsResult {
  total: number;
  accepted: number;
  rejected: Array<{
    index: number;
    reason: string;
  }>;
}