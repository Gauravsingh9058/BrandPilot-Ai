export interface MetricsData {
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  statusCodes: Record<string, number>;
  routeLatencies: Record<string, { count: number; totalMs: number; avgMs: number; maxMs: number }>;
  queueMetrics: {
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
  };
}

class MetricsCollector {
  private startTime = Date.now();
  private totalRequests = 0;
  private totalErrors = 0;
  private statusCodes: Record<string, number> = {};
  private routeLatencies: Record<string, { count: number; totalMs: number; avgMs: number; maxMs: number }> = {};
  private activeJobs = 0;
  private completedJobs = 0;
  private failedJobs = 0;

  recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    this.totalRequests += 1;
    const statusKey = String(statusCode);
    this.statusCodes[statusKey] = (this.statusCodes[statusKey] || 0) + 1;

    if (statusCode >= 400) {
      this.totalErrors += 1;
    }

    const routeKey = `${method} ${path.split('?')[0]}`;
    if (!this.routeLatencies[routeKey]) {
      this.routeLatencies[routeKey] = { count: 0, totalMs: 0, avgMs: 0, maxMs: 0 };
    }
    const current = this.routeLatencies[routeKey];
    current.count += 1;
    current.totalMs += durationMs;
    current.avgMs = Math.round((current.totalMs / current.count) * 100) / 100;
    current.maxMs = Math.max(current.maxMs, durationMs);
  }

  recordJobEvent(event: 'start' | 'complete' | 'fail'): void {
    if (event === 'start') {
      this.activeJobs += 1;
    } else if (event === 'complete') {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      this.completedJobs += 1;
    } else if (event === 'fail') {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      this.failedJobs += 1;
    }
  }

  getSnapshot(): MetricsData {
    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      statusCodes: { ...this.statusCodes },
      routeLatencies: { ...this.routeLatencies },
      queueMetrics: {
        activeJobs: this.activeJobs,
        completedJobs: this.completedJobs,
        failedJobs: this.failedJobs
      }
    };
  }

  toPrometheus(): string {
    const snap = this.getSnapshot();
    const lines: string[] = [
      '# HELP vidsnapai_uptime_seconds Process uptime in seconds',
      '# TYPE vidsnapai_uptime_seconds gauge',
      `vidsnapai_uptime_seconds ${snap.uptimeSeconds}`,
      '',
      '# HELP vidsnapai_http_requests_total Total HTTP requests handled',
      '# TYPE vidsnapai_http_requests_total counter',
      `vidsnapai_http_requests_total ${snap.totalRequests}`,
      '',
      '# HELP vidsnapai_http_errors_total Total HTTP errors (status >= 400)',
      '# TYPE vidsnapai_http_errors_total counter',
      `vidsnapai_http_errors_total ${snap.totalErrors}`,
      '',
      '# HELP vidsnapai_queue_jobs_active Active queue jobs',
      '# TYPE vidsnapai_queue_jobs_active gauge',
      `vidsnapai_queue_jobs_active ${snap.queueMetrics.activeJobs}`,
      '',
      '# HELP vidsnapai_queue_jobs_completed Total completed queue jobs',
      '# TYPE vidsnapai_queue_jobs_completed counter',
      `vidsnapai_queue_jobs_completed ${snap.queueMetrics.completedJobs}`,
      '',
      '# HELP vidsnapai_queue_jobs_failed Total failed queue jobs',
      '# TYPE vidsnapai_queue_jobs_failed counter',
      `vidsnapai_queue_jobs_failed ${snap.queueMetrics.failedJobs}`
    ];

    if (Object.keys(snap.statusCodes).length > 0) {
      lines.push('');
      lines.push('# HELP vidsnapai_http_requests_by_status Total HTTP requests partitioned by status code');
      lines.push('# TYPE vidsnapai_http_requests_by_status counter');
      for (const [code, count] of Object.entries(snap.statusCodes)) {
        lines.push(`vidsnapai_http_requests_by_status{status="${code}"} ${count}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  reset(): void {
    this.totalRequests = 0;
    this.totalErrors = 0;
    this.statusCodes = {};
    this.routeLatencies = {};
    this.activeJobs = 0;
    this.completedJobs = 0;
    this.failedJobs = 0;
  }
}

export const metricsCollector = new MetricsCollector();
