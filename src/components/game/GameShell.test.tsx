import { act, fireEvent, render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISCLAIMER } from "@/data/gameData";
import { RACK_RESET_MS, ROLL_TOTAL_MS, STRIKE_RESULT_MS } from "@/lib/timing";
import { mediaState } from "@/test/setup";
import { GameShell } from "./GameShell";

beforeEach(() => {
  mediaState.reducedMotion = false;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

const click = (el: HTMLElement) => fireEvent.click(el);
const button = (name: RegExp) => screen.getByRole("button", { name });
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms + 10));

const AZI = /^Amoxi-Clav \+ Azithromycin$/;
const CLARI = /^Amoxi-Clav \+ Clarithromycin$/;

/** Closes the greeting pop-up, then taps the therapy's ball on the lane. */
function chooseTherapy(therapy: RegExp) {
  click(button(/^Choose your therapy/));
  const rack = screen.getByRole("region", { name: "Choose your therapy" });
  click(within(rack).getByRole("button", { name: new RegExp(therapy.source.slice(0, -1)) }));
}

/** Types the doctor's name and continues. */
function enterName(name = "Asha Rao") {
  fireEvent.change(screen.getByPlaceholderText("Enter your name"), { target: { value: name } });
  click(button(/^Continue/));
}

/** Welcome → name → therapy → Frame 1 ready. */
function startBowling(therapy: RegExp = AZI, name?: string) {
  render(<GameShell />);
  click(button(/start game/i));
  enterName(name);
  chooseTherapy(therapy);
}

/** A throw from the lane (the keyboard / screen-reader control on the ball). */
const throwFromLane = () => fireEvent.click(button(/^Roll the ball/), { detail: 0 });

/** Frame 1: both throws, up to the transition. */
function frame1() {
  throwFromLane();
  wait(ROLL_TOTAL_MS);
  click(button(/^2nd attempt/i));
  throwFromLane();
  wait(ROLL_TOTAL_MS);
}

/** Transition → Frame 2 → strike → scorecard. */
function frame2() {
  wait(RACK_RESET_MS);
  click(button(/^Now, let's check with novel therapy/i));
  throwFromLane();
  wait(ROLL_TOTAL_MS);
}

const laneTags = () => screen.queryAllByRole("button", { name: /^Pin \d+, / }).map((b) => b.getAttribute("aria-label")?.match(/^Pin (\d+)/)?.[1]);

/** The footer: the disclaimer only (client request). */
const disclaimer = () => {
  expect(screen.queryByText(/^For scientific discussion among healthcare professionals/)).not.toBeInTheDocument();
  return screen.getByText(DISCLAIMER);
};

describe("GameShell", () => {
  it("shows the disclaimer on every screen", () => {
    render(<GameShell />);
    expect(disclaimer()).toBeVisible(); // welcome
    click(button(/start game/i));
    expect(disclaimer()).toBeVisible(); // name
    enterName();
    expect(disclaimer()).toBeVisible(); // therapy
    chooseTherapy(AZI);
    expect(disclaimer()).toBeVisible(); // Frame 1 ready
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    expect(disclaimer()).toBeVisible(); // Frame 1 result
    click(button(/^2nd attempt/i));
    expect(disclaimer()).toBeVisible(); // second throw ready
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    expect(disclaimer()).toBeVisible(); // transition
    frame2();
    expect(disclaimer()).toBeVisible(); // strike
    click(button(/^See results/i));
    expect(disclaimer()).toBeVisible(); // scorecard
    click(button(/^Continue/));
    expect(disclaimer()).toBeVisible(); // closing
  });

  it("welcome screen shows the title, subtitle and tagline", () => {
    render(<GameShell />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/CABP\s*Challenge/);
    expect(screen.getByText("Conventional Therapy vs Novel Therapy")).toBeInTheDocument();
    expect(screen.getByText(/Knock down the barriers/)).toBeInTheDocument();
  });

  it("requires a name, then greets the doctor by it (as text) with exactly two therapies", () => {
    render(<GameShell />);
    click(button(/start game/i));
    click(button(/^Continue/));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter your name to continue.");
    enterName('<img src=x onerror="alert(1)"> Rao');
    expect(screen.getByRole("heading", { name: 'Hi Dr. <img src=x onerror="alert(1)"> Rao,' })).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
    expect(screen.getByText(/Every CABP patient presents multiple treatment challenges/)).toBeInTheDocument();
    expect(screen.getAllByText(/Tap a ball to choose your conventional therapy/).length).toBeGreaterThan(0); // in the header, behind the pop-up
    // The ten barrier pins, by number and full name.
    const barriers = within(screen.getByRole("dialog")).getByRole("list");
    expect(within(barriers).getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      "1Susceptibility Vs CABP Pathogens",
      "2Bactericidal Activity",
      "3Patient Compliance (Dose Frequency)",
      "4High Lung Concentration",
      "5QT Prolongation",
      "6Atypical Coverage",
      "7Anti-Inflammatory / Immunomodulatory Activity",
      "8Managing AMR",
      "9Low Drug-Drug Interaction",
      "10Post Antibiotic Effect",
    ]);
    // The therapy is chosen on the lane after the pop-up, from exactly two balls.
    expect(within(screen.getByRole("dialog")).queryByText(AZI)).not.toBeInTheDocument();
    click(button(/^Choose your therapy/));
    const rack = screen.getByRole("region", { name: "Choose your therapy" });
    expect(within(rack).getAllByRole("button").map((b) => b.getAttribute("aria-label")?.split(",")[0])).toEqual([
      "Amoxi-Clav + Azithromycin",
      "Amoxi-Clav + Clarithromycin",
    ]);
    expect(button(/^Roll the ball/)).toBeDisabled(); // no throw before a therapy is chosen
  });

  it("lets the doctor type their name on the on-screen keyboard (no physical keyboard)", () => {
    render(<GameShell />);
    click(button(/start game/i));
    const keys = screen.getByRole("group", { name: "On-screen keyboard" });
    const key = (name: string) => click(within(keys).getByRole("button", { name }));
    for (const k of ["A", "s", "h", "a"]) key(k); // a capital starts the word by itself
    key("Space");
    for (const k of ["R", "a", "o", "o"]) key(k);
    key("Delete");
    expect(screen.getByPlaceholderText("Enter your name")).toHaveValue("Asha Rao");
    click(button(/^Continue/));
    expect(screen.getByRole("heading", { name: "Hi Dr. Asha Rao," })).toBeInTheDocument();
  });

  it("puts exactly ten numbered pins on the lane, all accessible", () => {
    startBowling();
    expect(screen.getByTestId("lane-2d")).toBeInTheDocument();
    expect(laneTags()).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    expect(screen.getAllByRole("button", { name: /^Card for pin \d+/ })).toHaveLength(10);
    click(button(/^Card for pin 7,/));
    expect(within(screen.getByRole("dialog")).getByRole("heading")).toHaveTextContent("Anti-Inflammatory / Immunomodulatory Activity");
  });

  it("Scenario A: first throw 4/10, the same ball again, then 6/10 on the transition", () => {
    startBowling(AZI);
    expect(screen.queryByText("Frame 1 of 2")).not.toBeInTheDocument(); // no frame badge
    const rack = screen.getByRole("region", { name: "Your therapy" });
    expect(within(rack).getByRole("button", { name: /^Amoxi-Clav \+ Azithromycin/ })).toBeDisabled(); // locked
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    const r = screen.getByRole("dialog", { name: "Good attempt!" });
    expect(r).toHaveTextContent("4/10");
    expect(within(r).queryByRole("list", { name: "Down" })).not.toBeInTheDocument(); // the pins that fell are not listed
    expect(r).not.toHaveTextContent("Bactericidal Activity");
    expect(within(r).queryByRole("list", { name: "Shaking" })).not.toBeInTheDocument();
    const standing = within(r).getByRole("list", { name: "Still standing" });
    expect(standing).toHaveTextContent("Susceptibility Vs CABP Pathogens"); // the shaking pin, with the rest
    expect(within(standing).getAllByRole("listitem")).toHaveLength(6); // 1, 3, 4, 5, 8 and 10
    expect(r).toHaveTextContent("However, several treatment barriers remain standing.");
    expect(r).not.toHaveTextContent("Would you like another chance?");

    click(within(r).getByRole("button", { name: /^2nd attempt/i }));
    // The ball is handed back: nothing rolls until the doctor throws it.
    expect(screen.getByRole("heading", { name: "Second Throw" })).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(/rolling/);
    expect(button(/^Roll the ball/)).toBeEnabled();
    throwFromLane();
    expect(screen.getByRole("status")).toHaveTextContent("Frame 1, second throw: rolling Amoxi-Clav + Azithromycin.");
    wait(ROLL_TOTAL_MS);
    expect(laneTags()).toEqual([]); // tags step aside while the rack is reset
    const t = screen.getByRole("region", { name: "Good Try" });
    expect(t).toHaveTextContent("Despite two attempts, several CABP treatment barriers are still standing.");
    expect(t).toHaveTextContent("6/10");
    expect(t).toHaveTextContent("A fresh rack of treatment challenges is now set.");
    expect(t).toHaveTextContent("Let's see how a novel therapy performs.");
  });

  it("offers only the second throw: no way to skip it", () => {
    startBowling(AZI);
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    const r = screen.getByRole("dialog", { name: "Good attempt!" });
    expect(within(r).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["2nd attempt"]);
  });

  it("Scenario B: 5/10 on the first throw, then 7/10 with two more down and none shaking", () => {
    startBowling(CLARI);
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    const r = screen.getByRole("dialog", { name: "Good attempt!" });
    expect(r).toHaveTextContent("5/10");
    expect(r).not.toHaveTextContent("High Lung Concentration"); // down, so not listed
    expect(r).not.toHaveTextContent("Susceptibility Vs CABP Pathogens"); // down now too
    const standing = within(r).getByRole("list", { name: "Still standing" });
    expect(within(standing).getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      "3Patient Compliance (Dose Frequency)",
      "5QT Prolongation",
      "6Atypical Coverage",
      "8Managing AMR",
      "10Post Antibiotic Effect",
    ]);
    // The second throw knocks down pins 6 and 10.
    click(within(r).getByRole("button", { name: /^2nd attempt/i }));
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    expect(screen.getByRole("region", { name: "Good Try" })).toHaveTextContent("7/10");
  });

  it("Frame 2 presents MIQNAF® automatically, strikes, then the scorecard and the closing screen", () => {
    startBowling(AZI, "Asha Rao");
    frame1();
    wait(RACK_RESET_MS);
    click(button(/^Now, let's check with novel therapy/i));
    expect(screen.getByRole("heading", { name: "Novel Therapy Challenge" })).toBeInTheDocument();
    expect(screen.getAllByText("Nafithromycin").length).toBeGreaterThan(0);
    const rack = screen.getByRole("region", { name: "Novel therapy" });
    expect(within(rack).getByRole("button", { name: /^Nafithromycin/ })).toBeDisabled(); // presented, not chosen
    expect(laneTags()).toHaveLength(10); // a fresh rack of ten
    throwFromLane();
    wait(STRIKE_RESULT_MS); // the strike shows as soon as the pins are down

    const s = screen.getByRole("dialog", { name: "100% Success" });
    expect(s).toHaveTextContent("All 10 Pins Down");
    expect(s).toHaveTextContent("10/10");
    expect(within(s).queryByRole("list")).not.toBeInTheDocument(); // no pin numbers listed

    click(button(/^See results/i));
    const card = screen.getByRole("dialog", { name: "CABP Challenge Results" });
    expect(card).toHaveTextContent("Dr. Asha Rao");
    const rows = within(within(card).getByRole("table")).getAllByRole("row").map((r) => r.textContent);
    expect(rows[1]).toMatch(/^Amoxi-Clav \+ Azithromycin.*6\/10/);
    expect(rows[2]).toMatch(/^Nafithromycin.*10\/10/);
    expect(card).not.toHaveTextContent(/Frame [12]/);
    const why = within(card).getByRole("region", { name: "Why Nafithromycin Changes the Game" });
    expect(within(why).getAllByRole("listitem").map((l) => l.textContent)).toEqual([
      "SafetyNO QT Prolongation",
      "ComplianceShort Course Monotherapy",
      "Efficacy97% - 100% SensitivityVs CABP Pathogens",
    ]);
    // The QR code and its link, on their own row below the three points.
    expect(within(why).getByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(within(why).getByRole("link", { name: "qrco.de/bfXXNu" })).toBeInTheDocument();

    click(within(card).getByRole("button", { name: /^Continue/ }));
    expect(screen.getByRole("heading", { name: "Dear Dr. Asha Rao," })).toBeInTheDocument();
    expect(screen.getByText("Thank you for participating in the CABP Challenge!")).toBeInTheDocument();
    // The references page, last, and back again.
    click(within(screen.getByRole("dialog", { name: "Dear Dr. Asha Rao," })).getByRole("button", { name: /^References/ }));
    const refs = screen.getByRole("dialog", { name: "References" });
    expect(within(refs).getAllByRole("listitem")).toHaveLength(25);
    expect(refs).toHaveTextContent("MIQNAF Prescribing Information.");
    click(within(refs).getByRole("button", { name: /^Back/ }));
    click(within(screen.getByRole("dialog", { name: "Dear Dr. Asha Rao," })).getByRole("button", { name: /^New Game/ }));
    expect(button(/start game/i)).toBeInTheDocument(); // back to the welcome screen
  });

  it("does not allow a third throw or a change of therapy", () => {
    startBowling(AZI);
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    expect(screen.queryByRole("region", { name: "Choose your therapy" })).not.toBeInTheDocument();
    click(button(/^2nd attempt/i));
    throwFromLane();
    wait(ROLL_TOTAL_MS);
    // A third throw is refused, even from a pop-up still fading out.
    const leftover = screen.queryByRole("button", { name: /^2nd attempt/i });
    if (leftover) click(leftover);
    expect(screen.getByRole("region", { name: "Good Try" })).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(/rolling/);
    expect(button(/^Roll the ball/)).toBeDisabled();
  });

  it("starts with sound on (client request), and the switch turns it off", () => {
    startBowling();
    const toggle = screen.getByRole("switch", { name: /sound/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("reduced motion shows each result at once, with the same results", () => {
    mediaState.reducedMotion = true;
    startBowling(CLARI);
    throwFromLane();
    expect(screen.getByRole("status")).toHaveTextContent("Frame 1, Amoxi-Clav + Clarithromycin: 5 of 10 pins down.");
    click(button(/^2nd attempt/i));
    throwFromLane();
    wait(0);
    click(button(/^Now, let's check with novel therapy/i));
    throwFromLane();
    expect(screen.getByRole("status")).toHaveTextContent("Frame 2, Nafithromycin: 10 of 10 pins down. No pins are standing.");
  });

  it("New game asks first, then clears the name", () => {
    startBowling(AZI, "Asha Rao");
    click(button(/^New game$/));
    click(within(screen.getByRole("dialog", { name: "Start a new game?" })).getByRole("button", { name: "Keep playing" }));
    expect(screen.getByRole("heading", { name: "Conventional Therapy" })).toBeInTheDocument(); // no accidental reset
    click(button(/^New game$/));
    click(within(screen.getByRole("dialog", { name: "Start a new game?" })).getByRole("button", { name: "Start new game" }));
    click(button(/start game/i));
    expect(screen.getByPlaceholderText("Enter your name")).toHaveValue("");
  });

  it("is operable from the keyboard", async () => {
    vi.useRealTimers();
    mediaState.reducedMotion = true;
    const user = userEvent.setup();
    render(<GameShell />);
    screen.getByRole("button", { name: /start game/i }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("Asha{Enter}");
    await user.click(screen.getByRole("button", { name: /^Choose your therapy/ }));
    await user.click(screen.getByRole("button", { name: /^Amoxi-Clav \+ Clarithromycin/ }));
    screen.getByRole("button", { name: /^Roll the ball/ }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("Frame 1, Amoxi-Clav + Clarithromycin: 5 of 10 pins down.");
  });

  it("pin card closes on Escape", async () => {
    vi.useRealTimers();
    startBowling();
    click(button(/^Pin 1, /));
    expect(within(screen.getByRole("dialog")).getByRole("heading")).toHaveTextContent("Susceptibility Vs CABP Pathogens");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
  });
});
