import { SOCIAL_IMAGE_ALT } from "@/lib/brand-metadata";

import { createSocialImage, socialImageSize } from "./social-image";

export const alt = SOCIAL_IMAGE_ALT;
export const size = socialImageSize;
export const contentType = "image/png";

export default function Image() {
  return createSocialImage();
}
