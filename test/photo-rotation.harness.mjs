// Run: node test/photo-rotation.harness.mjs  (fake DOM + fake clock; reads the real index.html)
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { startPhotos, ROTATE_MS } from "../photos.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const photos = [...html.matchAll(/<figure ([^>]*class="photo[^"]*"[^>]*)>/g)].map(([, attrs]) => {
  const classes = new Set(attrs.match(/class="([^"]*)"/)[1].split(/\s+/));
  const listeners = {};
  return {
    dataset: { corner: attrs.match(/data-corner="(\w+)"/)?.[1] },
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    setAttribute() {},
    addEventListener: (t, f) => (listeners[t] = f),
    fire: (t, e = {}) => listeners[t]({ preventDefault() {}, ...e }),
    raised: () => classes.has("photo--raised"),
  };
});
const doc = { querySelectorAll: () => photos };

// Fake clock
let timers = [];
const setTimer = (fn, ms) => { timers.push({ fn, ms, due: ms }); return timers.length - 1; };
const clearTimer = (id) => { timers[id] = null; };
const advance = (ms) => {
  for (let t = 0; t < ms; t++) for (const x of timers) if (x && --x.due === 0) { x.due = x.ms; x.fn(); }
};

const rotation = startPhotos({ doc, setTimer, clearTimer });
assert.equal(timers.filter(Boolean).length, 1, "exactly one timer");
assert.equal(timers[0].ms, 5000, "interval is 5000 ms");
assert.equal(ROTATE_MS, 5000);

const corners = [...new Set(photos.map((p) => p.dataset.corner))];
assert.deepEqual(corners.sort(), ["bl", "br", "tl", "tr"], "four corner clusters, no photo unassigned");
const members = (c) => photos.filter((p) => p.dataset.corner === c);
const fg = (c) => members(c).filter((p) => p.raised());
assert.ok(corners.every((c) => fg(c).length === 0), "initial state: nothing raised, existing front photos untouched");

// Walk two full cycles of the largest cluster.
const seen = Object.fromEntries(corners.map((c) => [c, new Set()]));
let prev = Object.fromEntries(corners.map((c) => [c, null]));
const ticks = 2 * Math.max(...corners.map((c) => members(c).length));
for (let i = 1; i <= ticks; i++) {
  advance(ROTATE_MS - 1);
  assert.ok(corners.every((c) => fg(c).length === 0 || fg(c)[0] === prev[c]), "nothing changes before the interval elapses");
  advance(1);
  for (const c of corners) {
    assert.equal(fg(c).length, 1, `${c}: exactly one raised on tick ${i}`);
    assert.notEqual(fg(c)[0], prev[c], `${c}: foreground changed on tick ${i}`);
    prev[c] = fg(c)[0];
    seen[c].add(prev[c]);
    const n = members(c).length;
    if (i <= n) assert.equal(seen[c].size, Math.min(i, n), `${c}: no repeats before every member is reached`);
  }
}
for (const c of corners) assert.equal(seen[c].size, members(c).length, `${c}: every member reached`);

// Click / keyboard: immediate raise, timer keeps going from there.
const tr = members("tr");
const target = tr[tr.indexOf(prev.tr) === 3 ? 5 : 3];
target.fire("click");
assert.deepEqual(fg("tr"), [target], "click raises immediately, replacing the cluster's foreground");
assert.equal(fg("tl").length, 1, "other clusters untouched");
advance(ROTATE_MS);
assert.deepEqual(fg("tr"), [tr[(tr.indexOf(target) + 1) % tr.length]], "next tick continues after clicked photo");
const key = tr[0];
let prevented = false;
key.fire("keydown", { key: " ", preventDefault: () => (prevented = true) });
assert.ok(prevented && fg("tr")[0] === key, "Space raises immediately");
tr[2].fire("keydown", { key: "Enter" });
assert.deepEqual(fg("tr"), [tr[2]], "Enter raises immediately");
tr[4].fire("keydown", { key: "a" });
assert.deepEqual(fg("tr"), [tr[2]], "other keys ignored");
advance(ROTATE_MS);
assert.deepEqual(fg("tr"), [tr[3]], "rotation continues after keyboard raise");

// Evaluating again must not leave two timers.
rotation.stop();
assert.equal(timers.filter(Boolean).length, 0, "stop clears the timer");
console.log(`OK: ${corners.map((c) => `${c}=${members(c).length}`).join(" ")}, ${ticks} ticks`);
