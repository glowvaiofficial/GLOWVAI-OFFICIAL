import { VendorShell } from "@/components/vendor-web/Shell";
import { EarningsScreen } from "@/components/vendor-web/ops/EarningsScreen";

export default function Page() {
  return (
    <VendorShell active="earnings">
      <EarningsScreen />
    </VendorShell>
  );
}
