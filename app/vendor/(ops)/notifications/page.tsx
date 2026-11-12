import { VendorShell } from "@/components/vendor-web/Shell";
import { NotificationsScreen } from "@/components/vendor-web/ops/NotificationsScreen";

export default function Page() {
  return (
    <VendorShell active="notifications">
      <NotificationsScreen />
    </VendorShell>
  );
}
