// Whether this tab is in front. Polling and the heartbeat stop while the tab is in the background.
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};
const readVisible = () => document.visibilityState !== "hidden";
const serverVisible = () => true;

export function useTabVisible(): boolean {
  return useSyncExternalStore(subscribe, readVisible, serverVisible);
}
