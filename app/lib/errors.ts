/**
 * One place that decides what a failure may say out loud.
 *
 * The backend returns buyer-safe sentences for the cases it knows about
 * (see `storageFailure` in ace-backend), so those are trusted and passed
 * through. Everything else — statuses, network faults, and anything
 * unrecognised — gets copy written here. Raw request lines and stack
 * fragments never reach a rendered page outside DEV.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  /** what the backend said, when it said something human */
  readonly serverMessage?: string;

  constructor(status: number, path: string, serverMessage?: string) {
    super(`API ${status} ${path}${serverMessage ? `: ${serverMessage}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.serverMessage = serverMessage;
  }
}

/** Backend copy is approved for display only when it reads as prose, not a
 *  status line. Guards against a future handler echoing internals. */
function approvedServerMessage(message?: string): string | undefined {
  if (!message) return undefined;
  if (message.length > 200) return undefined;
  if (/\b(HTTP|Error|Exception|at [\w.]+\()/.test(message)) return undefined;
  return message;
}

const BY_STATUS: Record<number, string> = {
  400: "That request didn't make sense. Check the details and try again.",
  401: "Your session expired — sign in and try again.",
  403: "Your account doesn't have access to that.",
  404: "We couldn't find that.",
  409: "That changed while you were here. Refresh and try again.",
  429: "Too many attempts. Wait a moment, then try again.",
  503: "That part of the store is unavailable right now. Try again shortly.",
};

/**
 * Turn any thrown value into one sentence a buyer can act on.
 * `fallback` covers actions with a known next step (attach a file, etc.).
 */
export function friendlyError(error: unknown, fallback?: string): string {
  if (error instanceof ApiError) {
    const approved = approvedServerMessage(error.serverMessage);
    if (approved) return approved;
    if (error.status >= 500) {
      return "Something broke on our side. Nothing was charged — try again in a moment.";
    }
    return BY_STATUS[error.status] ?? fallback ?? "That didn't work. Try again.";
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "We can't reach the store right now. Check your connection and try again.";
  }
  return fallback ?? "Something went wrong. Try again.";
}

/** Status code for callers that branch on it — 0 means "never reached us". */
export function errorStatus(error: unknown): number {
  return error instanceof ApiError ? error.status : 0;
}
