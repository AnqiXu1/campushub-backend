import { useCallback, useEffect, useState } from "react";

import type { AsyncState } from "../types/ui.ts";
import { isAbortError, toUiError } from "../utils/ui-error.ts";

export interface AsyncData<TData> extends AsyncState<TData> {
  readonly reload: () => void;
}

/**
 * Runs `load` whenever it changes (or `reload` is called) and exposes
 * data / isLoading / error. In-flight requests are aborted on cleanup and
 * isLoading is always cleared in a finally block, so it can never hang.
 * `load` MUST be referentially stable (wrap it in useCallback).
 */
export const useAsyncData = <TData>(
  load: (signal: AbortSignal) => Promise<TData>,
  initialData: TData,
): AsyncData<TData> => {
  const [state, setState] = useState<AsyncState<TData>>({
    data: initialData,
    isLoading: true,
    error: null,
  });
  const [reloadCount, setReloadCount] = useState<number>(0);

  useEffect((): (() => void) => {
    const controller: AbortController = new AbortController();

    const run = async (): Promise<void> => {
      setState((previous: AsyncState<TData>): AsyncState<TData> => ({
        ...previous,
        isLoading: true,
        error: null,
      }));
      try {
        const data: TData = await load(controller.signal);
        if (!controller.signal.aborted) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (error: unknown) {
        if (isAbortError(error) || controller.signal.aborted) {
          return;
        }
        setState((previous: AsyncState<TData>): AsyncState<TData> => ({
          ...previous,
          isLoading: false,
          error: toUiError(error),
        }));
      }
    };

    void run();
    return (): void => {
      controller.abort();
    };
  }, [load, reloadCount]);

  const reload = useCallback((): void => {
    setReloadCount((count: number): number => count + 1);
  }, []);

  return { ...state, reload };
};
