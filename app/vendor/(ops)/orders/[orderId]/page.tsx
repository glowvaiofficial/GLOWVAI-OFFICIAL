import { VendorShell } from "@/components/vendor-web/Shell";
import { OfferScreen } from "@/components/vendor-web/ops/OfferScreen";

export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <VendorShell active="orders">
      <OfferScreen orderId={orderId} />
    </VendorShell>
  );
}
