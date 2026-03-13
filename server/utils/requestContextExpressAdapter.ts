import type { Request } from "express";
import type { HasRequestHeader } from "./requestContextPort";

export class RequestContextExpressAdapter implements HasRequestHeader {
  constructor(private readonly req: Request) {}

  get request() {
    return {
      header: (name: string): string | undefined => {
        const value = this.req.headers[name.toLowerCase()];
        if (Array.isArray(value)) return value[0];
        return value;
      },
    };
  }
}
