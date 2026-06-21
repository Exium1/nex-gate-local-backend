import { Type, Static, TSchema } from "typebox"

export const UUIDField = Type.String({ format: 'uuid' });

export const IdParam = Type.Object({ id: UUIDField })
export type IdParam = Static<typeof IdParam>

export const Nullable = <T extends TSchema>(schema: T) => 
  Type.Union([schema, Type.Null()])
