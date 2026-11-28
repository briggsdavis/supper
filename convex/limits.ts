const MB = 1024 * 1024

export const MEDIA_LIMITS = {
  image: {
    bytes: 10 * MB,
    types: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
  },
  video: { bytes: 50 * MB, types: ["video/mp4", "video/webm", "video/quicktime"] },
} as const

export const MAX_MEDIA_PER_TITLE = 24

export type MediaKind = keyof typeof MEDIA_LIMITS

export function mediaKind(contentType: string | undefined): MediaKind | null {
  for (const kind of ["image", "video"] as const) {
    if ((MEDIA_LIMITS[kind].types as readonly string[]).includes(contentType ?? "")) return kind
  }
  return null
}

export function mediaProblem(contentType: string | undefined, size: number) {
  const kind = mediaKind(contentType)
  if (!kind) return "Use a JPEG, PNG, WebP, AVIF or GIF image, or an MP4, WebM or MOV video."
  const { bytes } = MEDIA_LIMITS[kind]
  if (size > bytes)
    return `${kind === "image" ? "Images" : "Videos"} can be up to ${bytes / MB} MB.`
  return null
}
