export class HttpError extends Error {
  status: number;
  reasons?: string[];

  constructor(status: number, message: string, reasons?: string[]) {
    super(message);
    this.status = status;
    this.reasons = reasons;
  }
}
