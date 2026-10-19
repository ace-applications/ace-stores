import { Outlet } from "react-router";

/** Pure nesting wrapper — the desk chrome lives in admin.layout.tsx, the
 *  section pages in admin.*[_index|.$id].tsx. */
export default function Admin() {
  return <Outlet />;
}
