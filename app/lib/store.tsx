/**
 * Store state — the cart and the customer library.
 *
 * Cart persists in localStorage; orders are the server's truth, synced
 * from `GET /orders/me` whenever the session changes.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authClient, myOrders, type OrderShape } from "./api";

interface StoreState {
  cart: string[];
  orders: OrderShape[];
}

interface StoreApi extends StoreState {
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  refreshOrders: () => Promise<void>;
  /** true when any PAID order owns this product */
  inLibrary: (productId: number) => boolean;
  hydrated: boolean;
}

const KEY = "ace-store-v1";
const EMPTY: StoreState = { cart: [], orders: [] };

const StoreContext = createContext<StoreApi | null>(null);

function load(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      orders: [],
    };
  } catch {
    return EMPTY;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // localStorage is client-only, so the cart cannot be a lazy initializer —
  // SSR would render an empty cart and hydration would mismatch. The
  // `hydrated` flag is what lets callers distinguish "empty" from "not yet
  // read", which is why this is an effect and not useState(load).
  const [state, setState] = useState<StoreState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ cart: state.cart }));
    } catch {
      /* storage unavailable — state stays in memory */
    }
  }, [state.cart, hydrated]);

  // Orders follow the session, and nothing else: an admin approves an order on
  // their own desk, so identity-keyed fetching alone leaves the buyer's shelf
  // stale forever. `refreshOrders()` is the only way to re-read, and the
  // library route calls it on entry.
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) {
      setState((s) => ({ ...s, orders: [] }));
      return;
    }
    let alive = true;
    myOrders()
      .then((orders) => alive && setState((s) => ({ ...s, orders })))
      .catch(() => alive && setState((s) => ({ ...s, orders: [] })));
    return () => {
      alive = false;
    };
  }, [userId]);

  const refreshOrders = useCallback(async () => {
    const orders = await myOrders().catch(() => [] as OrderShape[]);
    setState((s) => ({ ...s, orders }));
  }, []);

  const api = useMemo<StoreApi>(() => {
    const addToCart = (id: string) =>
      setState((s) => (s.cart.includes(id) ? s : { ...s, cart: [...s.cart, id] }));
    const removeFromCart = (id: string) =>
      setState((s) => ({ ...s, cart: s.cart.filter((c) => c !== id) }));
    const clearCart = () => setState((s) => ({ ...s, cart: [] }));
    const inLibrary = (productId: number) =>
      state.orders.some((o) => o.status === "paid" && o.items.some((it) => it.productId === productId));
    return { ...state, addToCart, removeFromCart, clearCart, refreshOrders, inLibrary, hydrated };
  }, [state, hydrated, refreshOrders]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}