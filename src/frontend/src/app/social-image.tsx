import { ImageResponse } from "next/og";

import {
  BRAND_COLORS,
  DOG_EMOJI,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/brand-metadata";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

function WorkSurfacePreview() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: 410,
        width: 470,
        overflow: "hidden",
        border: `1px solid ${BRAND_COLORS.border}`,
        borderRadius: 24,
        background: BRAND_COLORS.surface,
        boxShadow: "0 28px 70px rgba(17, 19, 24, 0.16)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 78,
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 26,
          background: "#f1f5f9",
          borderRight: `1px solid ${BRAND_COLORS.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            height: 34,
            width: 34,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: BRAND_COLORS.ink,
            color: "white",
            fontSize: 22,
          }}
        >
          {DOG_EMOJI}
        </div>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            style={{
              marginTop: item === 0 ? 32 : 18,
              height: 24,
              width: 24,
              borderRadius: 7,
              background: item === 0 ? BRAND_COLORS.ink : "#d8e1ea",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                height: 14,
                width: 192,
                borderRadius: 7,
                background: BRAND_COLORS.ink,
              }}
            />
            <div
              style={{
                marginTop: 9,
                height: 10,
                width: 126,
                borderRadius: 5,
                background: "#c8d4df",
              }}
            />
          </div>
          <div style={{ display: "flex" }}>
            {["#2563eb", "#16a34a", "#f97316"].map((color, index) => (
              <div
                key={color}
                style={{
                  height: 28,
                  width: 28,
                  marginLeft: index === 0 ? 0 : -7,
                  border: "2px solid white",
                  borderRadius: 999,
                  background: color,
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            borderRadius: 18,
            background: "#f8fafc",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 18,
              fontWeight: 700,
              color: BRAND_COLORS.ink,
            }}
          >
            Live team brief
          </div>
          <div
            style={{
              marginTop: 14,
              height: 11,
              width: 276,
              borderRadius: 6,
              background: "#aebdca",
            }}
          />
          <div
            style={{
              marginTop: 9,
              height: 11,
              width: 226,
              borderRadius: 6,
              background: "#c7d2dc",
            }}
          />
          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              borderRadius: 14,
              background: BRAND_COLORS.surface,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                height: 12,
                width: 12,
                borderRadius: 999,
                background: BRAND_COLORS.success,
              }}
            />
            <div
              style={{
                marginLeft: 10,
                fontSize: 15,
                fontWeight: 700,
                color: BRAND_COLORS.ink,
              }}
            >
              Agent run streaming
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex" }}>
          {["Comments", "Versions", "Branches"].map((label, index) => (
            <div
              key={label}
              style={{
                marginLeft: index === 0 ? 0 : 10,
                borderRadius: 999,
                border: `1px solid ${BRAND_COLORS.border}`,
                background: index === 0 ? BRAND_COLORS.accentSoft : "white",
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                color: index === 0 ? BRAND_COLORS.accent : BRAND_COLORS.muted,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          background: BRAND_COLORS.background,
          color: BRAND_COLORS.ink,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 10,
            background: BRAND_COLORS.ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
            width: 320,
            background: "#e8eef5",
          }}
        />
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "58px 68px 54px",
          }}
        >
          <div style={{ display: "flex", width: 540, flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 36,
                fontWeight: 800,
              }}
            >
              <div
                style={{
                  display: "flex",
                  height: 58,
                  width: 58,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  background: BRAND_COLORS.ink,
                  color: "white",
                  fontSize: 38,
                }}
              >
                {DOG_EMOJI}
              </div>
              <div style={{ marginLeft: 18 }}>{SITE_NAME}</div>
            </div>

            <div
              style={{
                marginTop: 56,
                display: "flex",
                flexDirection: "column",
                fontSize: 70,
                fontWeight: 900,
                lineHeight: 0.98,
                letterSpacing: 0,
              }}
            >
              <div>Shared AI</div>
              <div>work sessions.</div>
            </div>

            <div
              style={{
                marginTop: 28,
                width: 500,
                fontSize: 25,
                fontWeight: 500,
                lineHeight: 1.32,
                color: BRAND_COLORS.muted,
              }}
            >
              {SITE_DESCRIPTION}
            </div>

            <div style={{ marginTop: 34, display: "flex" }}>
              {["Prompt together", "Watch runs", "Share links"].map(
                (label, index) => (
                  <div
                    key={label}
                    style={{
                      marginLeft: index === 0 ? 0 : 12,
                      borderRadius: 999,
                      background: index === 0 ? BRAND_COLORS.ink : "#e7edf3",
                      padding: "10px 16px",
                      fontSize: 16,
                      fontWeight: 800,
                      color: index === 0 ? "white" : BRAND_COLORS.ink,
                    }}
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>

          <WorkSurfacePreview />
        </div>
      </div>
    ),
    {
      ...socialImageSize,
      emoji: "twemoji",
    },
  );
}
