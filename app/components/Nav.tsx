import { Link, NavLink } from "react-router";
import { useStore } from "../lib/store";
import logoWhite from "../../assets/Logo/ACE Stores Logo/Ace Stores White .png";

export function Nav() {
  const { cart } = useStore();

  return (
    <header className="sticky top-0 z-40">
      {/* announcement strip — product truth, not a fake promotion */}
      <div className="bg-accent px-4 py-2 text-center">
        <p className="font-display text-[12px] font-bold tracking-[0.08em] text-ground uppercase">
          One price per pack · instant download to your library
        </p>
      </div>

      <div className="border-b border-hairline bg-ground/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="ACE Stores home">
            <img src={logoWhite} alt="ACE Stores" className="h-9 w-auto" />
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-2" aria-label="Store">
            <NavLink
              to="/catalog"
              className={({ isActive }) =>
                `font-display text-[12.5px] font-bold tracking-[0.08em] uppercase px-2 py-2.5 transition-colors sm:px-3 ${
                  isActive ? "text-accent" : "text-dim hover:text-ink"
                }`
              }
            >
              Catalog
            </NavLink>
            <NavLink
              to="/library"
              className={({ isActive }) =>
                `font-display text-[12.5px] font-bold tracking-[0.08em] uppercase px-2 py-2.5 transition-colors sm:px-3 ${
                  isActive ? "text-accent" : "text-dim hover:text-ink"
                }`
              }
            >
              Library
            </NavLink>
            <NavLink
              to="/checkout"
              aria-label={`Cart, ${cart.length} item${cart.length === 1 ? "" : "s"}`}
              className={({ isActive }) =>
                `ml-0.5 flex items-center gap-2 rounded-lg border px-2.5 py-2.5 font-display text-[12.5px] font-bold tracking-[0.08em] uppercase transition-colors sm:ml-1 sm:px-3.5 ${
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
          </nav>
        </div>
      </div>
    </header>
  );
}
