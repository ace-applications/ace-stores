/**
 * Store state — cart, orders, and the customer library.
 *
 * Session-local for this build (localStorage). Wiring a real account
 * backend, payment provider, and entitlement service replaces this module
 * without touching the components.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface Order {
  id: string;
  email: string;
  items: string[];
  date: string;
}

interface StoreState {
  cart: string[];
  orders: Order[];
  email: string | null;
}

interface StoreApi extends StoreState {
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  placeOrder: (email: string) => Order;
  inLibrary: (id: string) => boolean;
  hydrated: boolean;
}

const KEY = "ace-store-v1";
const EMPTY: StoreState = { cart: [], orders: [], email: null };

const StoreContext = createContext<StoreApi | null>(null);

function load(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StoreState;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      email: typeof parsed.email === "string" ? parsed.email : null,
    };
  } catch {
    return EMPTY;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — state stays in memory */
    }
  }, [state, hydrated]);

  const api = useMemo<StoreApi>(() => {
    const addToCart = (id: string) =>
      setState((s) => (s.cart.includes(id) ? s : { ...s, cart: [...s.cart, id] }));
    const removeFromCart = (id: string) =>
      setState((s) => ({ ...s, cart: s.cart.filter((c) => c !== id) }));
    const clearCart = () => setState((s) => ({ ...s, cart: [] }));
    const placeOrder = (email: string) => {
      const order: Order = {
        id: `ACE-${Date.now().toString(36).toUpperCase()}`,
        email,
        items: [...state.cart],
        date: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        orders: [order, ...s.orders],
        email,
        cart: [],
      }));
      return order;
    };
    const inLibrary = (id: string) => state.orders.some((o) => o.items.includes(id));
    return { ...state, addToCart, removeFromCart, clearCart, placeOrder, inLibrary, hydrated };
  }, [state, hydrated]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
