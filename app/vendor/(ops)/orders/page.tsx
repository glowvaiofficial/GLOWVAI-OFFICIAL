import { VendorShell } from "@/components/vendor-web/Shell";
import { OrdersScreen } from "@/components/vendor-web/ops/OrdersScreen";

export default function Page() {
  return (
    <VendorShell active="orders">
      <OrdersScreen />
    </VendorShell>
  );
}
