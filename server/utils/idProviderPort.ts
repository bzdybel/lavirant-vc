import type { UUIDType } from "./uuidVo";

export interface IdProviderPort {
  generate(): UUIDType;
}
