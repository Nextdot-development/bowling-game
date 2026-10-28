import { describe, expect, it } from "vitest";
import { soundForTarget } from "@/lib/uiSound";

const html = (markup: string) => {
  document.body.innerHTML = markup;
  return (sel: string) => document.querySelector(sel);
};

describe("interface sounds", () => {
  it("taps on buttons, ticks on keyboard keys, clacks when picking a ball", () => {
    const $ = html(`
      <button id="plain"><span id="inner">Continue</span></button>
      <div data-sound="key"><button id="key">A</button></div>
      <section data-sound="select"><button id="ball">Ball</button></section>
      <button id="roll" data-sound="none">Roll</button>
      <button id="off" disabled>Off</button>
      <p id="text">Text</p>`);
    expect(soundForTarget($("#plain"))).toBe("tap");
    expect(soundForTarget($("#inner"))).toBe("tap"); // a tap on the button's label
    expect(soundForTarget($("#key"))).toBe("key");
    expect(soundForTarget($("#ball"))).toBe("select");
    expect(soundForTarget($("#roll"))).toBeNull(); // the roll has its own sound
    expect(soundForTarget($("#off"))).toBeNull();
    expect(soundForTarget($("#text"))).toBeNull();
    expect(soundForTarget(null)).toBeNull();
  });
});
