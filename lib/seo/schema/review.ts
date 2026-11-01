import { MIN_REVIEWS_FOR_SCHEMA } from "@/config/seo";

export interface StoredReview {
  review_id: string;
  created_at: string;
  rating: number; // 1 to 5
  title?: string;
  body: string;
  display_name: string;
  verified_purchase: boolean;
  status: "approved" | "new" | "rejected";
}

export function buildReviewSchema(reviews: StoredReview[] = []): {
  aggregateRating?: Record<string, any>;
  reviews?: Record<string, any>[];
} {
  const approved = reviews.filter(
    (r) => r.status === "approved" && r.verified_purchase
  );

  if (approved.length < MIN_REVIEWS_FOR_SCHEMA) {
    return {};
  }

  const sum = approved.reduce((acc, r) => acc + r.rating, 0);
  const avg = (sum / approved.length).toFixed(1);

  const aggregateRating = {
    "@type": "AggregateRating",
    "ratingValue": avg,
    "reviewCount": approved.length,
    "bestRating": 5,
    "worstRating": 1,
  };

  const reviewList = approved.slice(0, 10).map((r) => ({
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": r.display_name,
    },
    "datePublished": r.created_at.split("T")[0],
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": String(r.rating),
      "bestRating": 5,
      "worstRating": 1,
    },
    "name": r.title || `Review by ${r.display_name}`,
    "reviewBody": r.body,
  }));

  return {
    aggregateRating,
    reviews: reviewList,
  };
}
