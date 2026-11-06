// Runs the address rules against a customer's stored addresses. The storage is behind AddressRepo so the rules and the
// ownership checks can be tested with a stub store. Production uses the Firestore repo (addressRepo.ts), which only
// ever touches users/{uid}/addresses, with the uid taken from the verified ID token.
import { applyAddressOp, sortAddresses, type AddressOp, type AddressOutcome, type StoredAddress } from "./addressRules";

export interface AddressRepo {
  // Every saved address of one customer (at most MAX_ADDRESSES).
  list(uid: string): Promise<StoredAddress[]>;
  // Runs `work` on the current addresses inside one transaction and writes its changes only when it succeeds.
  transact(uid: string, work: (current: StoredAddress[]) => AddressOutcome): Promise<AddressOutcome>;
}

export async function listAddresses(repo: AddressRepo, uid: string): Promise<StoredAddress[]> {
  return sortAddresses(await repo.list(uid));
}

export function runAddressOp(repo: AddressRepo, uid: string, op: AddressOp, now: number, newId: string): Promise<AddressOutcome> {
  return repo.transact(uid, (current) => applyAddressOp(current, op, now, newId));
}
