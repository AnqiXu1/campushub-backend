/**
 * Types shared by hooks and components.
 * Type-only: no runtime values live in src/types.
 */

/** A failure prepared for display. `isConflict` is true for HTTP 409 responses. */
export interface UiError {
  readonly message: string;
  readonly isConflict: boolean;
}

/** The state every async workflow exposes. */
export interface AsyncState<TData> {
  readonly data: TData;
  readonly isLoading: boolean;
  readonly error: UiError | null;
}
