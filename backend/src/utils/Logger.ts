import fs from "fs";
import path from "path";

export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  file?: string;
  line?: number;
  function?: string;
  stack?: string;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  data?: unknown;
}

class Logger {
  private logDir: string;
  private maxFileSize: number;
  private maxFiles: number;

  constructor() {
    this.logDir = path.join(process.cwd(), "logs");
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 5;

    // 로그 디렉토리 생성
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split("T")[0];
    return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`);
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseInfo = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      ...(entry.file && { file: entry.file }),
      ...(entry.line && { line: entry.line }),
      ...(entry.function && { function: entry.function }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.ip && { ip: entry.ip }),
      ...(entry.userAgent && { userAgent: entry.userAgent }),
      ...(entry.method && { method: entry.method }),
      ...(entry.url && { url: entry.url }),
      ...(entry.statusCode && { statusCode: entry.statusCode }),
      ...(entry.responseTime && { responseTime: `${entry.responseTime}ms` }),
    };

    let logString = JSON.stringify(baseInfo, null, 2);

    if (entry.stack) {
      logString += `\nStack Trace:\n${entry.stack}`;
    }

    if (entry.data) {
      logString += `\nAdditional Data:\n${JSON.stringify(entry.data, null, 2)}`;
    }

    return logString + "\n" + "=".repeat(80) + "\n";
  }

  private async writeToFile(level: LogLevel, entry: LogEntry): Promise<void> {
    const fileName = this.getLogFileName(level);
    const logContent = this.formatLogEntry(entry);

    try {
      // 파일 크기 체크 및 로테이션
      if (fs.existsSync(fileName)) {
        const stats = fs.statSync(fileName);
        if (stats.size > this.maxFileSize) {
          await this.rotateLogFile(fileName);
        }
      }

      fs.appendFileSync(fileName, logContent, "utf8");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private async rotateLogFile(fileName: string): Promise<void> {
    try {
      // 기존 파일들을 번호로 순환
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${fileName}.${i}`;
        const newFile = `${fileName}.${i + 1}`;

        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // 가장 오래된 파일 삭제
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // 현재 파일을 .1로 이동
      fs.renameSync(fileName, `${fileName}.1`);
    } catch (error) {
      console.error("Failed to rotate log file:", error);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(requestInfo && requestInfo),
      ...(error && {
        stack: error.stack,
        file: this.getCallerInfo().file,
        line: this.getCallerInfo().line,
        function: this.getCallerInfo().function,
      }),
      ...(additionalData ? { data: additionalData } : {}),
    };

    return entry;
  }

  private getCallerInfo(): { file: string; line: number; function: string } {
    const stack = new Error().stack;
    if (!stack) {
      return { file: "unknown", line: 0, function: "unknown" };
    }

    const lines = stack.split("\n");
    // 4번째 줄이 실제 호출한 함수 (Logger -> log method -> getCallerInfo -> 실제 호출)
    const callerLine = lines[4] || lines[3];

    if (!callerLine) {
      return { file: "unknown", line: 0, function: "unknown" };
    }

    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/) || callerLine.match(/at\s+(.+?):(\d+):\d+/);

    if (match) {
      return {
        function: match[1] || "anonymous",
        file: match[2] || "unknown",
        line: parseInt(match[3] || "0", 10),
      };
    }

    return { file: "unknown", line: 0, function: "unknown" };
  }

  async error(
    message: string,
    error?: Error,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.ERROR, message, error, additionalData, requestInfo);

    // 콘솔에도 출력
    console.error(`[${entry.timestamp}] ${entry.level}: ${message}`, error);

    // 파일에 기록
    await this.writeToFile(LogLevel.ERROR, entry);
  }

  async warn(
    message: string,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.WARN, message, undefined, additionalData, requestInfo);

    console.warn(`[${entry.timestamp}] ${entry.level}: ${message}`);
    await this.writeToFile(LogLevel.WARN, entry);
  }

  async info(
    message: string,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.INFO, message, undefined, additionalData, requestInfo);

    console.info(`[${entry.timestamp}] ${entry.level}: ${message}`);
    await this.writeToFile(LogLevel.INFO, entry);
  }

  async debug(
    message: string,
    additionalData?: unknown,
    requestInfo?: {
      requestId?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
      statusCode?: number;
      responseTime?: number;
    },
  ): Promise<void> {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, undefined, additionalData, requestInfo);

    if (process.env.ENVIRONMENT === "dev") {
      console.debug(`[${entry.timestamp}] ${entry.level}: ${message}`);
    }

    await this.writeToFile(LogLevel.DEBUG, entry);
  }
}

export const logger = new Logger();
