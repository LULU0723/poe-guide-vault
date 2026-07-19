import { test } from "node:test";
import assert from "node:assert/strict";
import { stripPobColors, inferStageId, inflatePob, base64ToBytes } from "../app/lib/pob-core.mjs";

// Round-trip helper: build a real PoB-style export code from an XML string.
async function encodePob(xml) {
  const bytes = new TextEncoder().encode(xml);
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_");
}

test("stripPobColors removes palette and custom colour markup", () => {
  assert.equal(stripPobColors("^1Note: ^4hello"), "Note: hello");
  assert.equal(stripPobColors("^xE05030Perfect Forest warrior"), "Perfect Forest warrior");
  assert.equal(stripPobColors(""), "");
  assert.equal(stripPobColors("plain text"), "plain text");
});

test("inferStageId maps PoB set titles to the seven stages", () => {
  assert.equal(inferStageId("^6Summary"), "overview");
  assert.equal(inferStageId("^6Act 1"), "campaign");
  assert.equal(inferStageId("^2LvLing Tree lvl 12"), "campaign");
  assert.equal(inferStageId("^2Early 6L Rare {1}"), "maps");
  assert.equal(inferStageId("^1Mid lvl 96 {5}"), "mid");
  assert.equal(inferStageId("^6Late lvl 98 {7}"), "end");
  assert.equal(inferStageId("^6Late upgraded Option 1 {9}"), "end");
  assert.equal(inferStageId("empty"), "");
});

test("inflatePob round-trips a PoB export code", async () => {
  const xml = '<?xml version="1.0"?>\n<PathOfBuilding><Build className="Witch"/></PathOfBuilding>';
  const code = await encodePob(xml);
  const out = await inflatePob(code);
  assert.equal(out, xml);
  assert.ok(out.includes("<PathOfBuilding"));
});

test("inflatePob rejects empty and non-PoB input", async () => {
  await assert.rejects(() => inflatePob(""), /EMPTY/);
  const notPob = await encodePob("<Something>else</Something>");
  await assert.rejects(() => inflatePob(notPob), /NOT_POB/);
});

test("base64ToBytes handles url-safe and whitespace", () => {
  // "PoB" -> standard base64 "UG9C"
  assert.deepEqual([...base64ToBytes("UG9C")], [80, 111, 66]);
  assert.deepEqual([...base64ToBytes("UG 9C\n")], [80, 111, 66]);
});
