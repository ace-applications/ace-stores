import { Link } from "react-router";
import { DATA_NOTE } from "../data/products";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-xl font-bold tracking-[-0.01em] text-ink">ACE Stores</div>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-dim">
            Video transitions and audio assets for creators — produced in house, sold at one price
            per pack, unlocked in your library once we confirm your transfer.
          </p>
          <p className="mt-4 text-[12.5px] text-faint">
            Part of the ACE LLC family — alongside ACE Apps and ACE Magazine.
          </p>
        </div>

        <nav aria-label="Shop">
          <div className="label-caps">shop</div>
          <ul className="mt-3 space-y-2 text-[13.5px]">
            <li>
              <Link to="/catalog" className="text-dim hover:text-accent">
                Full catalog
              </Link>
            </li>
            <li>
              <Link to="/catalog?family=video" className="text-dim hover:text-accent">
                Video transitions
              </Link>
            </li>
            <li>
              <Link to="/catalog?family=audio" className="text-dim hover:text-accent">
                Audio assets
              </Link>
            </li>
            <li>
              <Link to="/library" className="text-dim hover:text-accent">
                Your library
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <div className="label-caps">the fine print</div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
            Every pack ships under one royalty-free license; final terms are set before launch.
          </p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-faint">{DATA_NOTE}</p>
          <p className="mt-4 text-[12.5px] text-faint tnum">© 2026 ACE LLC</p>
        </div>
      </div>
    </footer>
  );
}
