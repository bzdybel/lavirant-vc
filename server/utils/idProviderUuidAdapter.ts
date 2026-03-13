import { randomUUID } from "node:crypto";
import type { IdProviderPort } from "./idProviderPort";
import type { UUIDType } from "./uuidVo";

export class IdProviderUuidAdapter implements IdProviderPort {
  generate(): UUIDType {
    return randomUUID();
  }
}
