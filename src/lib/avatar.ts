export const DEFAULT_AVATAR_SRC = "/images/default-avatar.png";

export function avatarSrc(src?: string | null) {
  return src?.trim() || DEFAULT_AVATAR_SRC;
}
