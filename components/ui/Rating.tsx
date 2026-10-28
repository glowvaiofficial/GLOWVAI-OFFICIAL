import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  rating: number;
  maxStars?: number;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function Rating({
  rating,
  maxStars = 5,
  reviewCount,
  size = "md",
  className,
  showText = true,
}: RatingProps) {
  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (!reviewCount) return null;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, i) => {
          const isFull = i < Math.floor(rating);
          const isHalf = i === Math.floor(rating) && rating % 1 >= 0.5;

          return (
            <Star
              key={i}
              className={cn(
                iconSizes[size],
                isFull || isHalf
                  ? "fill-yellow text-yellow-hover"
                  : "fill-ink/10 text-ink/20"
              )}
            />
          );
        })}
      </div>
      {showText && (
        <span className="text-xs font-bold text-ink tracking-tight ml-0.5">
          {rating.toFixed(1)}
          {reviewCount !== undefined && (
            <span className="text-ink-muted font-normal ml-1">
              ({reviewCount})
            </span>
          )}
        </span>
      )}
    </div>
  );
}
