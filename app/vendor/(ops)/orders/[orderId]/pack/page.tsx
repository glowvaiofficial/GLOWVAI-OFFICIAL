import { VendorShell } from "@/components/vendor-web/Shell";
import { PackScreen } from "@/components/vendor-web/ops/PackScreen";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <VendorShell active="orders">
      <PackScreen orderId={orderId} />
    </VendorShell>
  );
}
