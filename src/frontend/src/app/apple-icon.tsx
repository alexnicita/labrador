import { ImageResponse } from "next/og";

import { BRAND_COLORS, DOG_EMOJI } from "@/lib/brand-metadata";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 42,
          background: BRAND_COLORS.ink,
          color: "white",
          fontSize: 116,
        }}
      >
        {DOG_EMOJI}
      </div>
    ),
    {
      ...size,
      emoji: "twemoji",
    },
  );
}
