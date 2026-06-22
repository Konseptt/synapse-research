import { customType } from "drizzle-orm/pg-core";

/** nv-embedqa-e5-v5 dimension */
export const EMBEDDING_DIMENSION = 1024;

export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${EMBEDDING_DIMENSION})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string | number[]): number[] {
    if (Array.isArray(value)) return value;
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((n) => Number.parseFloat(n.trim()));
    }
    return [];
  },
});

export function toPgVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
