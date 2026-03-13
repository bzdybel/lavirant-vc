import * as z from "zod";

export const UUIDError = { Type: "uuid.type" } as const;

export const UUID = z.string().uuid({ message: UUIDError.Type });

export type UUIDType = z.infer<typeof UUID>;
