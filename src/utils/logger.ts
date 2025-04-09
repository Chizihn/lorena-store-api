import chalk from "chalk";

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

class Logger {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatMessage(
    level: LogLevel,
    message: string,
    meta?: any
  ): string {
    const timestamp = this.getTimestamp();
    const formattedMessage = `[${timestamp}] ${level}: ${message}`;

    if (meta) {
      return `${formattedMessage} ${JSON.stringify(meta, null, 2)}`;
    }

    return formattedMessage;
  }

  static info(message: string, meta?: any): void {
    console.log(chalk.blue(this.formatMessage(LogLevel.INFO, message, meta)));
  }

  static warn(message: string, meta?: any): void {
    console.log(chalk.yellow(this.formatMessage(LogLevel.WARN, message, meta)));
  }

  static error(message: string, meta?: any): void {
    console.log(chalk.red(this.formatMessage(LogLevel.ERROR, message, meta)));
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === "development") {
      console.log(
        chalk.gray(this.formatMessage(LogLevel.DEBUG, message, meta))
      );
    }
  }
}

export default Logger;
