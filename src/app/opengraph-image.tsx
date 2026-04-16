import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Geothority — Dominate Local Search & AI for Insurance Agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0F1117 0%, #161822 50%, #1E2030 100%)",
          fontFamily: "Inter, system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#3B82F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontSize: "28px", fontWeight: "bold" }}>G</span>
          </div>
          <span style={{ color: "#E5E7EB", fontSize: "32px", fontWeight: "600" }}>Geothority</span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "800",
            color: "white",
            textAlign: "center",
            lineHeight: "1.1",
            maxWidth: "900px",
            marginBottom: "20px",
          }}
        >
          Dominate Local Search{" "}
          <span style={{ color: "#3B82F6" }}>&amp; AI</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#9CA3AF",
            textAlign: "center",
            maxWidth: "700px",
            marginBottom: "40px",
          }}
        >
          The local SEO platform built for insurance agents. Free 90-second audit.
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "48px" }}>
          {[
            { value: "500+", label: "Agents" },
            { value: "90s", label: "Scan Time" },
            { value: "18", label: "Directories" },
            { value: "Free", label: "To Start" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <span style={{ color: "#3B82F6", fontSize: "28px", fontWeight: "700" }}>
                {stat.value}
              </span>
              <span style={{ color: "#6B7280", fontSize: "14px" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
