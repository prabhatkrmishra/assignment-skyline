/**
 * @fileoverview Instant image previews for the shared next/image usage.
 *
 * @project Skyline Luxury Residences
 * @type {FrontendEngineeringTask}
 * @framework Next.js (App Router) + TypeScript
 *
 * @description
 * Every photo is requested through the image optimizer, which needs a few hundred milliseconds to
 * encode a size it has not seen before. Spreading `imagePlaceholder(src)` into an <Image> paints a
 * 8 px preview of that same photo inline with the HTML, so the space reads as the finished image
 * immediately instead of as an empty box while the real bytes arrive.
 *
 * @scope
 * - Presentation of image loading state only.
 *
 * Do not refactor unrelated routes or APIs.
 *
 * @module media/image-placeholder
 */
import type { ComponentProps } from "react";
import type Image from "next/image";
import { IMAGE_PLACEHOLDERS } from "@/lib/media/image-placeholders";

/** The next/image props that carry a preview, typed against the installed component. */
export type ImagePlaceholderProps = Pick<ComponentProps<typeof Image>, "placeholder" | "blurDataURL">;

/**
 * Blur preview for `src`, or no props when the path has no generated preview.
 * Unknown paths fall back to the container's flat background rather than failing the render.
 */
export function imagePlaceholder(src: string): ImagePlaceholderProps {
  const blurDataURL = IMAGE_PLACEHOLDERS[src];
  return blurDataURL === undefined ? {} : { placeholder: "blur", blurDataURL };
}
