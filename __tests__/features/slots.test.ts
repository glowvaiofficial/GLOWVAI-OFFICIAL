import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SLOT_CONFIG, findOfferedSlot, isShopOpen, istClock, offeredSlots } from "../../lib/shop/slots";

// IST wall-clock time on 6 Nov 2026 as an epoch instant (IST is UTC+05:30).
const ist = (hour: number, minute = 0, day = 6) => Date.UTC(2026, 10, day, hour, minute) - 5.5 * 3600_000;

describe("shop hours (IST)", () => {
  test("open from 09:00 up to, not including, 22:00", () => {
    assert.equal(isShopOpen(ist(8, 59)), false);
    assert.equal(isShopOpen(ist(9, 0)), true);
    assert.equal(isShopOpen(ist(21, 59)), true);
    assert.equal(isShopOpen(ist(22, 0)), false);
  });
  test("the clock is read in IST, not UTC", () => {
    // 03:30 UTC is 09:00 IST: open.
    assert.equal(isShopOpen(Date.UTC(2026, 10, 6, 3, 30)), true);
    assert.equal(istClock(Date.UTC(2026, 10, 6, 3, 30)).hour, 9);
  });
});

describe("offered slots", () => {
  test("before opening: no Now slot, and only windows at least an hour away today", () => {
    const slots = offeredSlots(ist(8, 0));
    assert.equal(slots.some((s) => s.kind === "express"), false);
    const today = slots.filter((s) => s.day === "today").map((s) => s.id);
    assert.deepEqual(today, ["today-morning", "today-afternoon", "today-evening", "today-night"]);
  });

  test("while open: Now is offered and a window that starts too soon is not", () => {
    const slots = offeredSlots(ist(10, 30));
    assert.equal(slots[0].id, SLOT_CONFIG.express.id);
    assert.equal(slots[0].label, "Now (express, 10–20 min)");
    assert.equal(slots[0].startsAt, ist(10, 30));
    const today = slots.filter((s) => s.day === "today").map((s) => s.id);
    assert.ok(!today.includes("today-morning"));
    assert.ok(today.includes("today-afternoon"), "12:00 is 90 minutes away, so it is offered");
  });

  test("a window starting exactly one hour away is offered; one minute later it is not", () => {
    assert.ok(offeredSlots(ist(11, 0)).some((s) => s.id === "today-afternoon"));
    assert.equal(offeredSlots(ist(11, 1)).some((s) => s.id === "today-afternoon"), false);
  });

  test("late evening: Now is still offered while open, and the day's windows have passed", () => {
    const slots = offeredSlots(ist(21, 30));
    assert.ok(slots.some((s) => s.id === "express-now"));
    assert.equal(slots.some((s) => s.id === "today-night"), false);
    assert.equal(slots.filter((s) => s.day === "tomorrow").length, 4);
  });

  test("after closing: no Now and no windows today, but all of tomorrow", () => {
    const slots = offeredSlots(ist(23, 0));
    assert.equal(slots.some((s) => s.day === "today"), false);
    assert.equal(slots.length, 4);
  });

  test("tomorrow's windows fall on the next IST day at the configured hours", () => {
    const tomorrowMorning = offeredSlots(ist(23, 0)).find((s) => s.id === "tomorrow-morning")!;
    const c = istClock(tomorrowMorning.startsAt);
    assert.equal(c.day, 7);
    assert.equal(c.hour, 9);
    assert.equal(istClock(tomorrowMorning.endsAt).hour, 12);
  });

  test("every window is labelled as an estimate, never as a promise", () => {
    for (const s of offeredSlots(ist(10, 0))) {
      if (s.kind === "window") assert.match(s.estimate, /^Estimated /);
    }
    const express = offeredSlots(ist(10, 0))[0];
    assert.equal(express.estimate, "Estimated 10–20 minutes");
  });
});

describe("choosing a slot", () => {
  test("an offered slot is found; an unknown id is not", () => {
    assert.ok(findOfferedSlot("tomorrow-evening", ist(10, 0)));
    assert.equal(findOfferedSlot("tomorrow-brunch", ist(10, 0)), null);
    assert.equal(findOfferedSlot("", ist(10, 0)), null);
  });
  test("Now is refused once the shop has closed", () => {
    assert.ok(findOfferedSlot("express-now", ist(21, 59)));
    assert.equal(findOfferedSlot("express-now", ist(22, 0)), null);
  });
  test("a same-day window is refused once it is too soon", () => {
    assert.ok(findOfferedSlot("today-afternoon", ist(10, 0)));
    assert.equal(findOfferedSlot("today-afternoon", ist(11, 30)), null);
  });
  test("a same-day window that already started is refused", () => {
    assert.equal(findOfferedSlot("today-morning", ist(10, 30)), null);
  });
});
