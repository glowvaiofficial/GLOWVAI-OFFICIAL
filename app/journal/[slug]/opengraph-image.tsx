import { ImageResponse } from "next/og";
import { journalArticles } from "@/config/journal";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return journalArticles.filter((a) => a.status === "published").map((a) => ({ slug: a.slug }));
}

// The picture shown when an article is shared (WhatsApp, Google Discover, social). Drawn from the article title and
// category only, so there is no photo to license.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = journalArticles.find((a) => a.slug === slug);
  const title = article?.title ?? "GLOW VAI Journal";
  const category = article?.category ?? "Journal";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1447E6 0%, #0B2F9E 62%, #0A1F66 100%)",
          padding: "64px 80px",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, letterSpacing: 4, textTransform: "uppercase" }}>
          <div style={{ width: 18, height: 18, borderRadius: 18, backgroundColor: "#7CF5C8", marginRight: 16 }} />
          {category}
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 58 : 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 5, textTransform: "uppercase", opacity: 0.75 }}>GLOW VAI Journal</div>
      </div>
    ),
    { ...size },
  );
}
