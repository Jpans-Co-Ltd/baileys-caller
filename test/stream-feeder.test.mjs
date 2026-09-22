import { test } from "node:test";
import assert from "node:assert/strict";
import { StreamFeeder } from "../dist/stream-feeder.mjs";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("re-chunks arbitrary pushes into frame-sized chunks", () => {
  const f = new StreamFeeder();
  f.push(new Float32Array(500));
  f.push(new Float32Array(300));
  assert.equal(f.queuedChunks, 2); // 800 samples = 2 x 320 + 160 partial
  f.flush();
  assert.equal(f.queuedChunks, 3);
});

test("keeps audio pushed before start and sends it first, then silence", async () => {
  const f = new StreamFeeder();
  f.push(new Float32Array(320).fill(0.5));
  const chunks = [];
  f.start(16000, 1, 320, (c) => chunks.push(c));
  await wait(70);
  f.stop();
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0][0], 0.5);
  assert.equal(chunks[1][0], 0);
  assert.ok(f.underflowChunks >= 1);
});

test("clear drops queued audio for barge-in", () => {
  const f = new StreamFeeder();
  f.push(new Float32Array(3200));
  assert.equal(f.queuedChunks, 10);
  f.clear();
  assert.equal(f.queuedChunks, 0);
});

test("re-chunks buffered audio if the negotiated frame size differs", async () => {
  const f = new StreamFeeder();
  f.push(new Float32Array(640).fill(0.25)); // 2 x 320
  f.start(16000, 1, 160, () => {});
  assert.equal(f.queuedChunks, 4); // same 640 samples, now 4 x 160
  f.stop();
});
