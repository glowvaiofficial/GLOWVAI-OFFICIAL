import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/config/site";

export const dynamic = "force-static";
export const alt = "GLOW VAI: skincare that starts with a face scan";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          padding: "64px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
            <div
              style={{
                display: "flex",
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: "#1447E6",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: 22, backgroundColor: "#7CF5C8" }} />
            </div>
            <div style={{ marginLeft: 18, fontSize: 40, fontWeight: 800, color: "#1447E6", letterSpacing: "-0.02em" }}>
              {BRAND_NAME}
            </div>
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.04, color: "#0A1B4D", letterSpacing: "-0.03em" }}>
            Skincare that starts with a selfie.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#3A4668", lineHeight: 1.35 }}>
            Free 30-second face scan. Matched routine in about 15 minutes in Vijayawada.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: 270,
            height: 520,
            borderRadius: 44,
            border: "10px solid #0A1B4D",
            backgroundColor: "#0A1B4D",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 150,
              height: 200,
              borderRadius: 100,
              border: "5px solid #7CF5C8",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: 250,
              height: 5,
              borderRadius: 4,
              backgroundColor: "#7CF5C8",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
