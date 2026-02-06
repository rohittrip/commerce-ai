import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private context: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, traceId?: string) {
    console.log(this.format('INFO', message, traceId));
  }

  error(message: string, trace?: string, traceId?: string) {
    console.error(this.format('ERROR', message, traceId), trace);
  }

  warn(message: string, traceId?: string) {
    console.warn(this.format('WARN', message, traceId));
  }

  debug(message: string, traceId?: string) {
    console.debug(this.format('DEBUG', message, traceId));
  }

  private format(level: string, message: string, traceId?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = this.context ? `[${this.context}]` : '';
    const trace = traceId ? `[${traceId}]` : '';
    return `${timestamp} ${level} ${ctx} ${trace} ${message}`;
  }
}
