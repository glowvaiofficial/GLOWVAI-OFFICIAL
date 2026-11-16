import { VendorShell } from "@/components/vendor-web/Shell";
import { PayoutsScreen } from "@/components/vendor-web/ops/PayoutsScreen";

export default function Page() {
  return (
    <VendorShell active="payouts">
      <PayoutsScreen />
    </VendorShell>
  );
}
