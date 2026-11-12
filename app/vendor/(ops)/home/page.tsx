import { VendorShell } from "@/components/vendor-web/Shell";
import { HomeScreen } from "@/components/vendor-web/ops/HomeScreen";

export default function Page() {
  return (
    <VendorShell active="home">
      <HomeScreen />
    </VendorShell>
  );
}
