import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";

export type ActionResult<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export class AppError extends Error {}

export function fail(message: string): never {
  throw new AppError(message);
}

export async function run<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { ok: false, error: e.message };
    if (e instanceof ZodError) {
      const first = e.issues[0];
      return { ok: false, error: first?.message || "Dados inválidos" };
    }
    const pgCode = (e as { code?: string; cause?: { code?: string } })?.cause?.code ?? (e as { code?: string })?.code;
    if (pgCode === "23505") return { ok: false, error: "Registro duplicado (SKU, e-mail ou identificador já existe)." };
    console.error(e);
    return { ok: false, error: "Algo deu errado. Tente novamente." };
  }
}
