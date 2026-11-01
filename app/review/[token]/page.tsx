import React from "react";
import { ReviewFormClient } from "./ReviewFormClient";
import { SITE_URL } from "@/lib/site-url";

export async function generateStaticParams() {
  return [{ token: "sample" }];
}

export const metadata = {
  title: "Leave a Verified Product Review",
  description: "Submit your verified customer review for GLOW VAI skincare products.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE_URL}/review/sample`,
  },
};

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ReviewFormClient token={token} />;
}
