import { Link, NavLink, useLocation } from "react-router";
import { useStore } from "../lib/store";
import { authClient } from "../lib/api";
import logoWhite from "../../assets/Logo/ACE Stores Logo/Ace Stores White .png";

const LINK = "font-chrome text-[12.5px] font-bold tracking-[0.08em] uppercase px-1.5 py-3 transition-colors sm:px-3";

export function Nav() {
  const { cart } = useStore();
  const location = useLocation();
  const { data: session } = authClient.useSession();
  // standing on the sign-in page would loop ?next=/sign-in back onto itself
  const next = location.pathname === "/sign-in" ? "/" : location.pathname + location.search;

  return (
    <header className="sticky top-0 z-40">
      {/* announcement strip — product truth, not a fake promotion */}
      <div className="bg-accent px-4 py-2 text-center">
        <p className="font-chrome text-[12px] font-bold tracking-[0.08em] text-ground uppercase">
          One price per pack · downloads unlock when we confirm your transfer
        </p>
      </div>

      <div className="overflow-x-auto border-b border-hairline bg-ground/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="ACE Stores home">
            <img src={logoWhite} alt="ACE Stores" className="h-8 w-auto sm:h-9" />
          </Link>

          <nav className="flex items-center gap-0 sm:gap-2" aria-label="Store">
            {/* Cart stays first on narrow screens: it is the only route into
                the cart, and the session block would push it off-canvas. */}
            <NavLink
              to="/catalog"
              className={({ isActive }) =>
                `${LINK} ${isActive ? "text-accent" : "text-dim hover:text-ink"}`
              }
            >
              Catalog
            </NavLink>
            <NavLink
              to="/library"
              className={({ isActive }) =>
                `${LINK} ${isActive ? "text-accent" : "text-dim hover:text-ink"}`
              }
            >
              Library
            </NavLink>
            <NavLink
              to="/checkout"
              aria-label={`Cart, ${cart.length} item${cart.length === 1 ? "" : "s"}`}
              className={({ isActive }) =>
                `-order-1 flex items-center gap-2 rounded-lg border px-2.5 py-3 font-bold tracking-[0.08em] uppercase transition-colors sm:order-none sm:ml-1 sm:px-3.5 ${
                  isActive
                    ? "border-accent text-accent"
                    : cart.length > 0
                      ? "border-accent/60 text-accent"
                      : "border-hairline text-dim hover:border-ink hover:text-ink"
                }`
              }
            >
              <span aria-hidden>Cart</span>
              <span className="tnum">[{String(cart.length).padStart(2, "0")}]</span>
            </NavLink>
            {session?.user ? (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `${LINK} ${isActive ? "text-accent" : "text-dim hover:text-ink"}`
                  }
                >
                  Desk
                </NavLink>
                <span className="hidden max-w-[10rem] truncate font-bold tracking-[0.08em] text-dim uppercase sm:block">
                  {session.user.email}
                </span>
                <button
                  type="button"
                  className={`${LINK} text-dim hover:text-ink`}
                  onClick={() => void authClient.signOut()}
                >
                  out
                </button>
              </>
            ) : (
              <NavLink
                to={`/sign-in?next=${encodeURIComponent(next)}`}
                className={({ isActive }) =>
                  `${LINK} ${isActive ? "text-accent" : "text-dim hover:text-ink"}`
                }
              >
                Sign in
              </NavLink>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}