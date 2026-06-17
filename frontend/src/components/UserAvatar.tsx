import { useEffect, useState, type CSSProperties } from "react";

export type UserAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;
export type UserAvatarShape = "circle" | "rounded";
export type UserAvatarStatusTone = "neutral" | "success" | "warn" | "accent";
export type UserAvatarFallbackMode = "initial" | "monogram";
export type UserAvatarRoleRing = "member" | "admin" | "super_admin";

interface UserAvatarProps {
  className?: string;
  fallbackMode?: UserAvatarFallbackMode;
  label: string;
  shape?: UserAvatarShape;
  size?: UserAvatarSize;
  src?: string | null;
  roleRing?: UserAvatarRoleRing;
  statusTone?: UserAvatarStatusTone;
  style?: CSSProperties;
}

function getAvatarFallback(label: string, fallbackMode: UserAvatarFallbackMode): string {
  const compact = Array.from((label || "").trim()).filter((char) => !/\s/.test(char));
  if (!compact.length) {
    return "R";
  }

  if (fallbackMode === "initial") {
    return compact[0]?.toUpperCase() || "R";
  }

  return compact.slice(0, 2).join("").toUpperCase();
}

function toSizeClass(size: UserAvatarSize): string | null {
  if (size === "xs" || size === "sm" || size === "md" || size === "lg" || size === "xl") {
    return `user-avatar--${size}`;
  }
  return null;
}

export default function UserAvatar({
  className,
  fallbackMode = "monogram",
  label,
  shape = "circle",
  size = "md",
  src,
  roleRing = "member",
  statusTone = "neutral",
  style,
}: UserAvatarProps) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const [isImageBroken, setIsImageBroken] = useState(false);
  const sizeClass = toSizeClass(size);
  const classes = [
    "user-avatar",
    `user-avatar--${shape}`,
    `user-avatar--tone-${statusTone}`,
    `user-avatar--ring-${roleRing}`,
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const resolvedStyle =
    typeof size === "number"
      ? ({
          ...style,
          "--user-avatar-size": `${size}px`,
        } as CSSProperties)
      : style;
  const showImage = Boolean(normalizedSrc) && !isImageBroken;

  useEffect(() => {
    setIsImageBroken(false);
  }, [normalizedSrc]);

  return (
    <span aria-label={`${label || "用户"} 头像`} className={classes} role="img" style={resolvedStyle}>
      {showImage ? (
        <img
          alt={`${label || "用户"} 头像`}
          src={normalizedSrc}
          loading="lazy"
          decoding="async"
          onError={() => setIsImageBroken(true)}
        />
      ) : (
        <span aria-hidden="true" className="user-avatar__fallback">
          {getAvatarFallback(label, fallbackMode)}
        </span>
      )}
    </span>
  );
}
