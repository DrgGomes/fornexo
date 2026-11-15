"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";

export function useAction() {
  const [pending, start] = useTransition();
  const router = useRouter();

  const exec = useCallback(
    <T,>(
      fn: () => Promise<ActionResult<T>>,
      opts?: { success?: string; onSuccess?: (data: T | undefined) => void; refresh?: boolean; silent?: boolean },
    ) =>
      new Promise<ActionResult<T>>((resolve) => {
        start(async () => {
          const res = await fn();
          if (res.ok) {
            const msg = opts?.success ?? res.message;
            if (msg && !opts?.silent) toast.success(msg);
            opts?.onSuccess?.(res.data);
            if (opts?.refresh !== false) router.refresh();
          } else {
            toast.error(res.error);
          }
          resolve(res);
        });
      }),
    [router],
  );

  return { pending, exec };
}
