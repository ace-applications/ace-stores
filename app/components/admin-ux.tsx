import { useCallback, useEffect, useRef, useState } from "react";

/** Styled confirm built on the native <dialog>: focus trap, Esc-to-cancel and
 *  backdrop come from the platform, so there is nothing to hand-roll.
 *  `ask()` records the pending action; the dialog renders it and runs it on
 *  confirm. Cancel/confirm both settle, resetting the hook. */
export interface ConfirmAsk {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  action: () => void;
}

export function useConfirm() {
  const [ask, setAsk] = useState<ConfirmAsk | null>(null);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (ask && !dialog.open) dialog.showModal();
    if (!ask && dialog.open) dialog.close();
  }, [ask]);

  const request = useCallback((next: ConfirmAsk) => setAsk(next), []);
  const settle = useCallback(
    (ok: boolean) => {
      const current = ask;
      setAsk(null);
      if (ok && current) current.action();
    },
    [ask],
  );

  return {
    ask: request,
    dialog: (
      <dialog
        ref={ref}
        onClose={() => setAsk(null)}
        className="panel panel-raised rounded-2xl p-6 text-ink backdrop:bg-black/60"
        style={{ maxWidth: "26rem" }}
        aria-labelledby="confirm-title"
      >
        {ask && (
          <>
            <h2 id="confirm-title" className="font-display text-lg font-bold text-ink">
              {ask.title}
            </h2>
            {ask.body && <p className="mt-2 text-[13.5px] text-dim">{ask.body}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => settle(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-danger={ask.danger || undefined}
                // autofocus lands the destructive choice on the primary action
                autoFocus
                onClick={() => settle(true)}
              >
                {ask.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </>
        )}
      </dialog>
    ),
  };
}

/** Transient status toast: {!null message → shown, auto-clears after 3s}. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return {
    show,
    toast: message ? (
      <p className="toast" role="status">
        {message}
      </p>
    ) : null,
  };
}
