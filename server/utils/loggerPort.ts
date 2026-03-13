export interface LoggerPort {
  info(data: object): void;
  warn(data: object): void;
  error(data: object): void;
}
