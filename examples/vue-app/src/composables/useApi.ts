import type { ClientResponse } from "@taserjs/client";
import { useAsyncState } from "@vueuse/core";
import type { Ref } from "vue";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
  ) {
    super(`Request failed with ${status} ${statusText}`.trim());
  }
}

export interface UseApiOptions {
  /** Run the request when the composable is created. Defaults to true. */
  immediate?: boolean;
}

export interface UseApiReturn<TData> {
  data: Ref<TData | undefined>;
  loading: Ref<boolean>;
  error: Ref<unknown>;
  /** True once the request has succeeded at least once. */
  ready: Ref<boolean>;
  /** Runs the request again; resolves with the data, or undefined if it failed. */
  refetch: () => Promise<TData | undefined>;
}

/**
 * Wraps a typed Taser.js client call, such as `() => api.users.$get()`, in reactive state.
 * VueUse's `useFetch` takes a URL, so `useAsyncState` is the fit for a client call.
 */
export function useApi<TData>(
  request: () => Promise<ClientResponse<TData>>,
  { immediate = true }: UseApiOptions = {},
): UseApiReturn<TData> {
  const { state, isLoading, isReady, error, execute } = useAsyncState<TData | undefined>(
    async () => {
      const response = await request();
      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }
      return response.json();
    },
    undefined,
    { immediate, resetOnExecute: false },
  );

  return {
    data: state,
    loading: isLoading,
    error,
    ready: isReady,
    refetch: () => execute(),
  };
}
