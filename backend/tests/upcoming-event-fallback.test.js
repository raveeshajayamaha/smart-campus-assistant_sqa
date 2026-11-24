const test = require("node:test");
const assert = require("node:assert/strict");
const { upcomingEventFallback } = require("../lib/upcomingEventFallback");

test("TDD-01 empty event catalogue gives an honest upcoming-events reply", () => {
  assert.equal(upcomingEventFallback([]), "Events:\nThere are no upcoming events at the moment.");
});

test("TDD-02 historical event details retain their order and format", () => {
  const events = [
    { title: "Robotics Fair", date: new Date("2025-01-02"), time: "10:00", location: "Hall A", description: "Robotics demos" },
    { title: "Study Workshop", date: new Date("2025-01-01"), time: "09:00", location: "Room B", description: "Study tips" },
  ];
  assert.equal(upcomingEventFallback(events), [
    "Events:",
    "There are no upcoming events at the moment, but here are the latest campus events available:",
    "Robotics Fair - 02/01/2025, 10:00, Hall A. Robotics demos",
    "Study Workshop - 01/01/2025, 09:00, Room B. Study tips",
  ].join("\n"));
});
