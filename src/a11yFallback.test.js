// v340 (audit Web Interface Guidelines, lot 2) : un div cliquable (curseur main) devient atteignable au clavier.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { useA11yFallback } from "./a11yFallback";

function Page({ onHit }) {
  useA11yFallback();
  return (<div>
    <div data-testid="c" style={{ cursor: "pointer" }} onClick={onHit}>Ouvrir</div>
    <div data-testid="bg" style={{ position: "fixed", inset: 0, cursor: "pointer" }} onClick={onHit} />
    <button style={{ cursor: "pointer" }}>Bouton</button>
  </div>);
}

test("v340 : div cliquable → tabindex, rôle bouton, Entrée = clic ; fond de fenêtre ignoré", () => {
  jest.useFakeTimers();
  const hit = jest.fn();
  const box = document.createElement("div"); document.body.appendChild(box); const root = createRoot(box);
  act(() => { root.render(<Page onHit={hit} />); });
  const getByTestId = id => box.querySelector("[data-testid=\"" + id + "\"]");
  act(() => { jest.advanceTimersByTime(400); });
  const c = getByTestId("c"), bg = getByTestId("bg");
  expect(c.getAttribute("tabindex")).toBe("0");
  expect(c.getAttribute("role")).toBe("button");
  expect(bg.hasAttribute("tabindex")).toBe(false);
  c.focus();
  act(() => { c.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  expect(hit).toHaveBeenCalledTimes(1);
  act(() => root.unmount()); box.remove(); jest.useRealTimers();
});

// v403 : passeport figé — la zone de clic élargie d'un bouton « all: unset » se calait sur un parent et couvrait toute la page
test("v403 : pas de zone élargie sur un bouton dont la position est annulée en ligne", () => {
  jest.useFakeTimers();
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, width: 40, height: 16, top: 0, left: 0, right: 40, bottom: 16 });
  function P() { useA11yFallback(); return <div><button data-testid="u" style={{ position: "unset" }}>SAV</button><button data-testid="n">Tests</button></div>; }
  const box = document.createElement("div"); document.body.appendChild(box); const root = createRoot(box);
  act(() => { root.render(<P />); });
  act(() => { jest.advanceTimersByTime(400); });
  expect(box.querySelector("[data-testid=u]").hasAttribute("data-hit")).toBe(false);
  expect(box.querySelector("[data-testid=n]").getAttribute("data-hit")).toBe("1");
  Element.prototype.getBoundingClientRect = rect;
  act(() => root.unmount()); box.remove(); jest.useRealTimers();
});
