import { VendorShell } from "@/components/vendor-web/Shell";
import { AnalyticsScreen } from "@/components/vendor-web/ops/AnalyticsScreen";

export default function Page() {
  return (
    <VendorShell active="analytics">
      <AnalyticsScreen />
    </VendorShell>
  );
}
