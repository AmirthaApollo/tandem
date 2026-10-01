import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";
import { AppProvider } from "./store/AppContext";
import { NavContext, type NavValue } from "./nav";
import { Landing } from "./screens/Landing";
import { Onboarding } from "./screens/Onboarding";
import { Today } from "./screens/Today";
import { Routine } from "./screens/Routine";
import { Insights } from "./screens/Insights";
import { Moments } from "./screens/Moments";
import { Care } from "./screens/Care";
import { Profile } from "./screens/Profile";
import { WalkMode } from "./screens/WalkMode";

const nav: NavValue = {
  route: "today",
  navigate: () => {},
  walkOpen: false,
  openWalk: () => {},
  closeWalk: () => {},
  walkManual: false,
};

function render(node: ReactElement) {
  return renderToString(
    <AppProvider>
      <NavContext.Provider value={nav}>{node}</NavContext.Provider>
    </AppProvider>,
  );
}

describe("screen smoke renders", () => {
  const screens: [string, ReactElement][] = [
    ["Landing", <Landing onEnter={() => {}} />],
    ["Today", <Today />],
    ["Routine", <Routine />],
    ["Insights", <Insights />],
    ["Moments", <Moments />],
    ["Care", <Care />],
    ["Profile", <Profile />],
  ];

  for (const [name, node] of screens) {
    it(`renders ${name}`, () => {
      const html = render(node);
      expect(html.length).toBeGreaterThan(200);
    });
  }

  it("renders onboarding and walk mode", () => {
    expect(render(<Onboarding onDone={() => {}} />).length).toBeGreaterThan(200);
    expect(render(<WalkMode manual onClose={() => {}} />).length).toBeGreaterThan(100);
  });
});