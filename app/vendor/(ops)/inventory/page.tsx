import { VendorShell } from "@/components/vendor-web/Shell";
import { InventoryScreen } from "@/components/vendor-web/ops/InventoryScreen";

export default function Page() {
  return (
    <VendorShell active="inventory">
      <InventoryScreen />
    </VendorShell>
  );
}
