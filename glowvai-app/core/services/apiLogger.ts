export interface ApiLogEntry {
  requestId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  route: string;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  status?: number;
  success: boolean;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
}

class ApiLoggerService {
  private logs: ApiLogEntry[] = [];
  private readonly maxLogs = 50;

  public logStart(method: ApiLogEntry['method'], route: string): string {
    const requestId = `req_${Math.random().toString(36).substring(2, 9)}`;
    const entry: ApiLogEntry = {
      requestId,
      method,
      route,
      startedAt: Date.now(),
      success: false,
      retryCount: 0,
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    return requestId;
  }

  public logComplete(
    requestId: string,
    status: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string
  ) {
    const entry = this.logs.find((l) => l.requestId === requestId);
    if (entry) {
      entry.finishedAt = Date.now();
      entry.durationMs = entry.finishedAt - entry.startedAt;
      entry.status = status;
      entry.success = success;
      entry.errorCode = errorCode;
      entry.errorMessage = errorMessage;
    }
  }

  public getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  public getAverageLatencyMs(): number {
    const completed = this.logs.filter((l) => l.durationMs !== undefined);
    if (completed.length === 0) return 0;
    const total = completed.reduce((sum, l) => sum + (l.durationMs || 0), 0);
    return Math.round(total / completed.length);
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const apiLogger = new ApiLoggerService();
