import { NextResponse } from "next/server";
import { z } from "zod";

const reviewSubmitSchema = z.object({
  token: z.string().min(1),
  order_ref: z.string().min(1),
  product_sku: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(20, "Review must be at least 20 characters").max(1000),
  display_name: z.string().min(2).max(50),
  city: z.string().max(50).optional(),
  consent_to_publish: z.boolean().refine((val) => val === true, {
    message: "Consent to publish is required.",
  }),
  website: z.string().max(0, "Bot submission detected"), // Honeypot
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = reviewSubmitSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: validated.error.issues },
        { status: 400 }
      );
    }

    const reviewData = validated.data;

    // TODO: Save to Google Sheets "Reviews" tab via Apps Script webhook or database
    console.log("Verified Customer Review Received:", {
      created_at: new Date().toISOString(),
      order_ref: reviewData.order_ref,
      product_sku: reviewData.product_sku,
      rating: reviewData.rating,
      title: reviewData.title || "",
      body: reviewData.body,
      display_name: reviewData.display_name,
      city: reviewData.city || "",
      verified_purchase: true,
      consent_to_publish: reviewData.consent_to_publish,
      status: "new", // Requires manual moderation approval
    });

    return NextResponse.json({
      success: true,
      message: "Thank you for your review! It has been submitted for moderation.",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
