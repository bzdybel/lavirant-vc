import type { ClockPort } from "./clockPort";

export class Stopwatch {
  private readonly startMs: number;

  constructor(private readonly deps: { Clock: ClockPort }) {
    this.startMs = deps.Clock.now();
  }

  stop(): { durationMs: number } {
    return { durationMs: this.deps.Clock.now() - this.startMs };
  }
}
