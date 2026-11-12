import { VendorShell } from "@/components/vendor-web/Shell";
import { ProductRequestsScreen } from "@/components/vendor-web/ops/ProductRequestsScreen";

export default function Page() {
  return (
    <VendorShell active="product-requests">
      <ProductRequestsScreen />
    </VendorShell>
  );
}
