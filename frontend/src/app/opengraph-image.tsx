import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#f7f4ed",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#0a5c52",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#fffcf7",
              }}
            />
          </div>
          <span style={{ fontSize: 56, fontWeight: 600, color: "#12110e" }}>Synapse</span>
        </div>
        <p
          style={{
            fontSize: 36,
            lineHeight: 1.35,
            color: "#12110e",
            maxWidth: 900,
            margin: 0,
          }}
        >
          Health questions, answered from real published studies
        </p>
        <p style={{ fontSize: 22, color: "#5e5a52", marginTop: 24 }}>
          PubMed search, evidence ranking, quick summaries
        </p>
      </div>
    ),
    { ...size },
  );
}
