import { createContext, useContext } from "react";

export type Route = "today" | "routine" | "insights" | "moments" | "care" | "profile";

export interface NavValue {
  route: Route;
  navigate: (route: Route) => void;
  walkOpen: boolean;
  openWalk: (manual?: boolean) => void;
  closeWalk: () => void;
  walkManual: boolean;
}

export const NavContext = createContext<NavValue | null>(null);

export function useNav(): NavValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavContext");
  return ctx;
}

export const ROUTE_TITLES: Record<Route, string> = {
  today: "Today",
  routine: "Routine",
  insights: "Insights",
  moments: "Moments",
  care: "Care",
  profile: "Profile",
};