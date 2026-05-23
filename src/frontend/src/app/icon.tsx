import { ImageResponse } from "next/og";

import { BRAND_COLORS, DOG_EMOJI } from "@/lib/brand-metadata";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          background: BRAND_COLORS.ink,
          color: "white",
          fontSize: 42,
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
