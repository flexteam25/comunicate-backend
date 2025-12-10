import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService {
  private logDir: string;

  constructor() {
    this.logDir = 'logs';
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeLog(level: string, message: string, data?: any, channel?: string): void {
    const timestamp = new Date().toISOString();
    const logFile = channel ? path.join(this.logDir, `${channel}.log`) : path.join(this.logDir, 'app.log');
    
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      channel: channel || 'app'
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      // Silent fail - don't log to console
    }
  }

  public info(message: string, data?: any, channel?: string): void {
    this.writeLog('info', message, data, channel);
  }

  public warn(message: string, data?: any, channel?: string): void {
    this.writeLog('warn', message, data, channel);
  }

  public error(message: string, data?: any, channel?: string): void {
    this.writeLog('error', message, data, channel);
  }

  public debug(message: string, data?: any, channel?: string): void {
    this.writeLog('debug', message, data, channel);
  }
}
