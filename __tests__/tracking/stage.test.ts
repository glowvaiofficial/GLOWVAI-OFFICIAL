import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { deriveStage, haversineKm, outForDeliveryStage, stageToNotify, STAGE_NOTIFICATION, CLOSE_KM, DROP_POINT_KM, NEAR_KM } from "../../lib/shop/tracking";

const CUSTOMER = { lat: 16.5, lng: 80.6 };
// A point north of the customer, the given number of km away (1 degree of latitude is about 111.195 km).
const northOf = (km: number) => ({ lat: CUSTOMER.lat + km / 111.195, lng: CUSTOMER.lng });

describe("deriveStage: status mapping", () => {
  const cases: [string, number | null, boolean][] = [
    ["PLACED", 1, false],
    ["PAYMENT_PENDING", 1, false],
    ["VENDOR_ACCEPTED", 2, false],
    ["PACKED", 4, false],
    ["READY_FOR_PICKUP", 4, false],
    ["DELIVERED", 9, false],
    ["CANCELLED", null, true],
    ["VENDOR_REJECTED", null, true],
    ["SOMETHING_NEW", null, false],
  ];
  for (const [status, stage, cancelled] of cases) {
    test(`${status} -> stage ${stage} (cancelled ${cancelled})`, () => {
      const r = deriveStage({ status, rider: null, customer: null });
      assert.equal(r.stage, stage);
      assert.equal(r.cancelled, cancelled);
    });
  }

  test("VENDOR_ACCEPTED with a picking record is stage 3", () => {
    assert.equal(deriveStage({ status: "VENDOR_ACCEPTED", pickingAt: 1_700_000_000_000, rider: null, customer: null }).stage, 3);
  });

  test("VENDOR_ACCEPTED without a picking record stays at stage 2 (no picking signal exists yet)", () => {
    assert.equal(deriveStage({ status: "VENDOR_ACCEPTED", pickingAt: null, rider: null, customer: null }).stage, 2);
  });

  test("status is case-insensitive", () => {
    assert.equal(deriveStage({ status: "packed", rider: null, customer: null }).stage, 4);
  });

  test("OUT_FOR_DELIVERY with no rider point is stage 5", () => {
    assert.equal(deriveStage({ status: "OUT_FOR_DELIVERY", rider: null, customer: CUSTOMER }).stage, 5);
  });

  test("OUT_FOR_DELIVERY with a rider point but no customer coordinates is stage 5, and no distance is reported", () => {
    const r = deriveStage({ status: "OUT_FOR_DELIVERY", rider: northOf(0.2), customer: null });
    assert.equal(r.stage, 5);
    assert.equal(r.distanceKm, null);
  });

  test("the rider marked arrived in the rider flow is stage 8, whatever the distance", () => {
    assert.equal(deriveStage({ status: "OUT_FOR_DELIVERY", riderArrived: true, rider: northOf(2), customer: CUSTOMER }).stage, 8);
  });
});

describe("outForDeliveryStage: distance bands and boundaries", () => {
  const table: [number | null, number][] = [
    [null, 5],
    [3.5, 5],
    [3.0001, 5],
    [3, 6],
    [2.5, 6],
    [1.2, 6],
    [0.5001, 6],
    [0.5, 7],
    [0.3, 7],
    [0.0501, 7],
    [0.05, 8],
    [0.01, 8],
    [0, 8],
  ];
  for (const [km, stage] of table) {
    test(`${km === null ? "no distance" : `${km} km`} -> stage ${stage}`, () => {
      assert.equal(outForDeliveryStage(km), stage);
    });
  }

  test("the boundary constants are 3 km, 500 m and 50 m", () => {
    assert.equal(NEAR_KM, 3);
    assert.equal(CLOSE_KM, 0.5);
    assert.equal(DROP_POINT_KM, 0.05);
  });
});

describe("deriveStage: distance from coordinates", () => {
  test("2.0 km away is stage 6 with that distance", () => {
    const r = deriveStage({ status: "OUT_FOR_DELIVERY", rider: northOf(2), customer: CUSTOMER });
    assert.equal(r.stage, 6);
    assert.ok(Math.abs((r.distanceKm ?? 0) - 2) < 0.001);
  });

  test("4 km away is stage 5", () => {
    assert.equal(deriveStage({ status: "OUT_FOR_DELIVERY", rider: northOf(4), customer: CUSTOMER }).stage, 5);
  });

  test("300 m away is stage 7", () => {
    assert.equal(deriveStage({ status: "OUT_FOR_DELIVERY", rider: northOf(0.3), customer: CUSTOMER }).stage, 7);
  });

  test("20 m away is stage 8", () => {
    assert.equal(deriveStage({ status: "OUT_FOR_DELIVERY", rider: northOf(0.02), customer: CUSTOMER }).stage, 8);
  });

  test("haversine: 1 degree of latitude is about 111.2 km", () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    assert.ok(Math.abs(d - 111.19) < 0.05, `got ${d}`);
  });

  test("haversine: the same point is 0 km", () => {
    assert.equal(haversineKm(CUSTOMER, CUSTOMER), 0);
  });
});

describe("stage notifications: one per stage", () => {
  test("only stages 2, 5, 6, 7 and 8 have a notification type", () => {
    assert.deepEqual(Object.keys(STAGE_NOTIFICATION).map(Number).sort((a, b) => a - b), [2, 5, 6, 7, 8]);
  });

  test("a stage is notified the first time it is reached", () => {
    assert.equal(stageToNotify(undefined, 2), 2);
    assert.equal(stageToNotify(0, 5), 5);
  });

  test("the same stage is not notified twice", () => {
    assert.equal(stageToNotify(5, 5), null);
    assert.equal(stageToNotify(8, 8), null);
  });

  test("stages never notify backwards", () => {
    assert.equal(stageToNotify(6, 5), null);
    assert.equal(stageToNotify(8, 2), null);
  });

  test("a jump notifies the new stage only", () => {
    assert.equal(stageToNotify(2, 6), 6);
  });

  test("stages without a notification send nothing", () => {
    assert.equal(stageToNotify(undefined, 1), null);
    assert.equal(stageToNotify(undefined, 4), null);
    assert.equal(stageToNotify(undefined, 9), null);
    assert.equal(stageToNotify(undefined, null), null);
  });

  test("a full walk through the stages, polled repeatedly, notifies five times", () => {
    let last: number | undefined;
    const sent: number[] = [];
    const walk = [1, 1, 2, 2, 2, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 9];
    for (const s of walk) {
      const next = stageToNotify(last, s);
      if (next !== null) {
        sent.push(next);
        last = next;
      }
    }
    assert.deepEqual(sent, [2, 5, 6, 7, 8]);
  });
});
