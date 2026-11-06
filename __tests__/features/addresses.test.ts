import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MAX_ADDRESSES, applyAddressOp, countDefaults, userAddressOf, validateAddressFields, type StoredAddress } from "../../lib/shop/addressRules";
import { listAddresses, runAddressOp, type AddressRepo } from "../../lib/shop/addressService";

const valid = {
  label: "Home",
  recipientName: "Asha Rao",
  phone: "9876543210",
  fullAddress: "Flat 4B, Ramesh Towers, Benz Circle",
  city: "Vijayawada",
  pincode: "520010",
  landmark: "Near the bus stop",
};

// A stub store with the same transaction semantics as the Firestore repo: writes happen only when work succeeds.
function stubRepo(): AddressRepo & { rows: Map<string, Map<string, StoredAddress>> } {
  const rows = new Map<string, Map<string, StoredAddress>>();
  const bucket = (uid: string) => {
    if (!rows.has(uid)) rows.set(uid, new Map());
    return rows.get(uid)!;
  };
  const list = async (uid: string) => [...bucket(uid).values()].map((a) => ({ ...a }));
  return {
    rows,
    list,
    async transact(uid, work) {
      const out = work(await list(uid));
      if (!out.ok) return out;
      for (const c of out.changes) {
        if (c.kind === "upsert") bucket(uid).set(c.address.id, { ...c.address });
        else bucket(uid).delete(c.id);
      }
      return out;
    },
  };
}

let counter = 0;
const newId = () => `adr_${(++counter).toString(16).padStart(16, "0")}`;
const T0 = 1_700_000_000_000;

function mustOk<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
}

describe("address validation", () => {
  test("accepts a complete address and trims text", () => {
    const r = validateAddressFields({ ...valid, recipientName: "  Asha Rao  " });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.recipientName, "Asha Rao");
  });
  test("pincode must be exactly six digits", () => {
    assert.equal(validateAddressFields({ ...valid, pincode: "52001" }).ok, false);
    assert.equal(validateAddressFields({ ...valid, pincode: "52001A" }).ok, false);
    assert.equal(validateAddressFields({ ...valid, pincode: "5200101" }).ok, false);
  });
  test("full address must be 8 to 300 characters; longer text is cut to 300", () => {
    assert.equal(validateAddressFields({ ...valid, fullAddress: "1234567" }).ok, false);
    const long = validateAddressFields({ ...valid, fullAddress: "a".repeat(400) });
    assert.equal(long.ok, true);
    if (long.ok) assert.equal(long.value.fullAddress.length, 300);
  });
  test("name, phone, city and label are required and checked", () => {
    assert.equal(validateAddressFields({ ...valid, recipientName: "A" }).ok, false);
    assert.equal(validateAddressFields({ ...valid, phone: "1234567890" }).ok, false);
    assert.equal(validateAddressFields({ ...valid, city: "" }).ok, false);
    assert.equal(validateAddressFields({ ...valid, label: "Gym" }).ok, false);
  });
  test("landmark is optional and cut to 120 characters", () => {
    const r = validateAddressFields({ ...valid, landmark: "" });
    assert.equal(r.ok, true);
    const long = validateAddressFields({ ...valid, landmark: "x".repeat(200) });
    if (long.ok) assert.equal(long.value.landmark.length, 120);
  });
});

describe("default address rule", () => {
  test("the first address is the default; later ones are not unless asked", () => {
    const a = mustOk(applyAddressOp([], { kind: "create", input: valid }, T0, newId()));
    assert.equal(a.addresses[0].isDefault, true);
    const b = mustOk(applyAddressOp(a.addresses, { kind: "create", input: valid }, T0 + 1, newId()));
    assert.equal(countDefaults(b.addresses), 1);
    assert.equal(b.addresses.find((x) => x.id !== a.addresses[0].id)?.isDefault, false);
  });

  test("random sequences of operations always leave exactly one default when addresses exist", () => {
    let seed = 42;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    let list: StoredAddress[] = [];
    for (let step = 0; step < 400; step += 1) {
      const ids = list.map((a) => a.id);
      const pick = ids.length ? ids[rnd(ids.length)] : "adr_0000000000000000";
      const kinds = [
        () => ({ kind: "create" as const, input: valid, makeDefault: rnd(2) === 0 }),
        () => ({ kind: "setDefault" as const, id: pick }),
        () => ({ kind: "delete" as const, id: pick }),
        () => ({ kind: "update" as const, id: pick, input: { city: `City ${step}` }, makeDefault: rnd(2) === 0 }),
      ];
      const out = applyAddressOp(list, kinds[rnd(kinds.length)](), T0 + step, newId());
      if (!out.ok) continue;
      list = out.addresses;
      assert.ok(list.length <= MAX_ADDRESSES);
      if (list.length > 0) assert.equal(countDefaults(list), 1, `step ${step}`);
    }
  });

  test("the default cannot be unset directly", () => {
    const a = mustOk(applyAddressOp([], { kind: "create", input: valid }, T0, newId()));
    const r = applyAddressOp(a.addresses, { kind: "update", id: a.addresses[0].id, input: {}, makeDefault: false }, T0 + 1, newId());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 409);
  });

  test("making another address the default clears the old one in the same change set", () => {
    const a = mustOk(applyAddressOp([], { kind: "create", input: valid }, T0, newId()));
    const b = mustOk(applyAddressOp(a.addresses, { kind: "create", input: valid }, T0 + 1, newId()));
    const other = b.addresses.find((x) => !x.isDefault)!;
    const c = mustOk(applyAddressOp(b.addresses, { kind: "setDefault", id: other.id }, T0 + 2, newId()));
    assert.equal(countDefaults(c.addresses), 1);
    assert.equal(c.addresses.find((x) => x.id === other.id)?.isDefault, true);
    assert.equal(c.changes.length, 2);
    assert.deepEqual(c.userAddress, userAddressOf(c.addresses));
  });

  test("deleting the default promotes the most recently changed address", () => {
    let list: StoredAddress[] = [];
    list = mustOk(applyAddressOp(list, { kind: "create", input: valid }, T0, newId())).addresses;
    list = mustOk(applyAddressOp(list, { kind: "create", input: valid }, T0 + 1, newId())).addresses;
    list = mustOk(applyAddressOp(list, { kind: "create", input: valid }, T0 + 2, newId())).addresses;
    const defaultId = list.find((a) => a.isDefault)!.id;
    const recent = [...list].filter((a) => !a.isDefault).sort((a, b) => b.createdAt - a.createdAt)[0];
    const out = mustOk(applyAddressOp(list, { kind: "delete", id: defaultId }, T0 + 5, newId()));
    assert.equal(out.addresses.length, 2);
    assert.equal(countDefaults(out.addresses), 1);
    assert.equal(out.addresses.find((a) => a.isDefault)?.id, recent.id);
  });

  test("deleting the last address leaves no default and no users.address", () => {
    const a = mustOk(applyAddressOp([], { kind: "create", input: valid }, T0, newId()));
    const out = mustOk(applyAddressOp(a.addresses, { kind: "delete", id: a.addresses[0].id }, T0 + 1, newId()));
    assert.deepEqual(out.addresses, []);
    assert.equal(out.userAddress, null);
    assert.deepEqual(out.changes, [{ kind: "delete", id: a.addresses[0].id }]);
  });

  test("a stored list with no default gets its oldest address as the default", () => {
    const base: StoredAddress = { id: "adr_aaaaaaaaaaaaaaaa", ...valid, label: "Home", isDefault: false, createdAt: 1, updatedAt: 1 };
    const other: StoredAddress = { ...base, id: "adr_bbbbbbbbbbbbbbbb", createdAt: 2, updatedAt: 2 };
    const out = mustOk(applyAddressOp([other, base], { kind: "setDefault", id: other.id }, T0, newId()));
    assert.equal(countDefaults(out.addresses), 1);
    assert.equal(out.addresses.find((a) => a.isDefault)?.id, other.id);
  });
});

describe("maximum of five addresses", () => {
  test("the sixth address is refused with a clear message", () => {
    let list: StoredAddress[] = [];
    for (let i = 0; i < MAX_ADDRESSES; i += 1) list = mustOk(applyAddressOp(list, { kind: "create", input: valid }, T0 + i, newId())).addresses;
    assert.equal(list.length, 5);
    const r = applyAddressOp(list, { kind: "create", input: valid }, T0 + 10, newId());
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 409);
      assert.match(r.error, /up to 5/);
    }
  });
  test("deleting one makes room again", () => {
    let list: StoredAddress[] = [];
    for (let i = 0; i < MAX_ADDRESSES; i += 1) list = mustOk(applyAddressOp(list, { kind: "create", input: valid }, T0 + i, newId())).addresses;
    list = mustOk(applyAddressOp(list, { kind: "delete", id: list[4].id }, T0 + 20, newId())).addresses;
    assert.equal(mustOk(applyAddressOp(list, { kind: "create", input: valid }, T0 + 21, newId())).addresses.length, 5);
  });
});

describe("user address mirror", () => {
  test("users.address carries only the default address's four admin fields", () => {
    const a = mustOk(applyAddressOp([], { kind: "create", input: valid }, T0, newId()));
    assert.deepEqual(userAddressOf(a.addresses), {
      fullAddress: valid.fullAddress,
      city: valid.city,
      pincode: valid.pincode,
      landmark: valid.landmark,
    });
    assert.equal(userAddressOf([]), null);
  });
});

describe("ownership with a stub store", () => {
  test("a customer's addresses are listed only for that customer", async () => {
    const repo = stubRepo();
    await runAddressOp(repo, "uid-a", { kind: "create", input: valid }, T0, newId());
    assert.equal((await listAddresses(repo, "uid-a")).length, 1);
    assert.deepEqual(await listAddresses(repo, "uid-b"), []);
  });

  test("another customer cannot update, make default or delete an address they do not own", async () => {
    const repo = stubRepo();
    const made = mustOk(await runAddressOp(repo, "uid-a", { kind: "create", input: valid }, T0, newId()));
    const id = made.addresses[0].id;
    const before = JSON.stringify(await listAddresses(repo, "uid-a"));

    for (const op of [
      { kind: "update" as const, id, input: { city: "Hacked" } },
      { kind: "setDefault" as const, id },
      { kind: "delete" as const, id },
    ]) {
      const r = await runAddressOp(repo, "uid-b", op, T0 + 1, newId());
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 404);
    }
    assert.equal(JSON.stringify(await listAddresses(repo, "uid-a")), before);
  });

  test("a refused operation writes nothing", async () => {
    const repo = stubRepo();
    await runAddressOp(repo, "uid-a", { kind: "create", input: valid }, T0, newId());
    const r = await runAddressOp(repo, "uid-a", { kind: "create", input: { ...valid, pincode: "1" } }, T0 + 1, newId());
    assert.equal(r.ok, false);
    assert.equal((await listAddresses(repo, "uid-a")).length, 1);
  });

  test("the sixth address is refused through the store as well", async () => {
    const repo = stubRepo();
    for (let i = 0; i < 5; i += 1) await runAddressOp(repo, "uid-a", { kind: "create", input: valid }, T0 + i, newId());
    const r = await runAddressOp(repo, "uid-a", { kind: "create", input: valid }, T0 + 9, newId());
    assert.equal(r.ok, false);
    assert.equal((await listAddresses(repo, "uid-a")).length, 5);
  });
});
