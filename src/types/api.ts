/**
 * The single response shape used by every endpoint.
 * Success and failure each have exactly one format; new endpoints MUST reuse them.
 */

export interface SuccessResponse<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}
