import type { ReactNode } from "react";
import { OrdersProvider } from "@/components/vendor-web/ops/OrdersProvider";

// Operations screens share one orders list and one poll loop, so navigating between them does not refetch.
export default function OpsLayout({ children }: { children: ReactNode }) {
  return <OrdersProvider>{children}</OrdersProvider>;
}
