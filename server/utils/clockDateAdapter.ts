import type { ClockPort } from "./clockPort";

export class ClockDateAdapter implements ClockPort {
  now(): number {
    return Date.now();
  }
}
