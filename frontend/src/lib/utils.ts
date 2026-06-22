import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseEmbedding(stored: string | null): number[] {
  if (!stored) return [];
  try {
    return JSON.parse(stored) as number[];
  } catch {
    return [];
  }
}

export function serializeEmbedding(vector: number[]): string {
  return JSON.stringify(vector);
}
