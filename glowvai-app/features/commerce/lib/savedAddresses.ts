import type { ApiResult } from '../../../core/services/customerSession';
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  updateAddress,
  type SavedAddressInput,
  type SavedAddressView,
} from '../../../core/services/shopApi';
import { useAddressStore } from './addressStore';

// Each change goes to the server first. The local copy changes only after the server has accepted it and sent back the
// full list, so the screens never show an address the server does not have.

type ListResult = ApiResult<{ addresses: SavedAddressView[] }>;

const applyList = (res: ListResult): ListResult => {
  if (res.ok && res.data) useAddressStore.getState().setAddresses(res.data.addresses);
  return res;
};

export async function refreshSavedAddresses(): Promise<ApiResult<unknown>> {
  const res = await fetchAddresses();
  return applyList(res as ListResult);
}

// Creates a saved address, or updates the one with this id.
export async function saveSavedAddress(id: string | null, input: SavedAddressInput): Promise<ListResult> {
  return applyList(id ? await updateAddress(id, input) : await createAddress(input));
}

export async function makeDefaultAddress(id: string): Promise<ListResult> {
  return applyList(await updateAddress(id, { makeDefault: true }));
}

export async function removeSavedAddress(id: string): Promise<ListResult> {
  return applyList(await deleteAddress(id));
}
