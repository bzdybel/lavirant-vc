import type * as z from "zod";
import { UUID } from "./uuidVo";

export const CorrelationId = UUID;

export type CorrelationIdType = z.infer<typeof CorrelationId>;
