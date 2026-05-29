/**
 * Universal icon resolver for Orphix themes.
 *
 * OrphixIconName can be:
 *   - A lucide-react icon name: "terminal", "settings", "bot"
 *   - A public URL: "https://example.com/icon.svg"
 *   - A local file path: "/path/to/icon.png", "./icons/custom.svg"
 *   - A data URI: "data:image/svg+xml;base64,..."
 *
 * This component resolves the name and renders the appropriate element.
 */

import { useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";

interface OrphixIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

// Cache of resolved lucide components to avoid repeated lookups
const lucideCache = new Map<string, React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }> | null>();

function resolveLucideIcon(name: string) {
  if (lucideCache.has(name)) return lucideCache.get(name) ?? null;

  // Try direct match
  const direct = (LucideIcons as Record<string, unknown>)[name];
  if (typeof direct === "function" || (typeof direct === "object" && direct !== null && "$$typeof" in direct)) {
    lucideCache.set(name, direct as React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>);
    return direct as React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>;
  }

  // Try PascalCase
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  const pascalMatch = (LucideIcons as Record<string, unknown>)[pascal];
  if (typeof pascalMatch === "function" || (typeof pascalMatch === "object" && pascalMatch !== null && "$$typeof" in pascalMatch)) {
    lucideCache.set(name, pascalMatch as React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>);
    return pascalMatch as React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>;
  }

  // Try kebab-case to PascalCase: "chevron-right" -> "ChevronRight"
  const kebabToPascal = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const kebabMatch = (LucideIcons as Record<string, unknown>)[kebabToPascal];
  if (typeof kebabMatch === "function" || (typeof kebabMatch === "object" && kebabMatch !== null && "$$typeof" in kebabMatch)) {
    lucideCache.set(name, kebabMatch as React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>);
    return kebabMatch as React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>;
  }

  lucideCache.set(name, null);
  return null;
}

function isUrl(name: string): boolean {
  return name.startsWith("http://") || name.startsWith("https://") || name.startsWith("data:");
}

function isFilePath(name: string): boolean {
  return name.startsWith("/") || name.startsWith("./") || name.startsWith("../") || /^[A-Z]:\\/i.test(name);
}

export function OrphixIcon({ name, size = 16, className, color, strokeWidth = 1.5 }: OrphixIconProps) {
  const [imgError, setImgError] = useState(false);

  const iconType = useMemo(() => {
    if (isUrl(name)) return "url";
    if (isFilePath(name)) return "file";
    return "lucide";
  }, [name]);

  // URL or file path — render as <img>
  if (iconType === "url" || iconType === "file") {
    if (imgError) {
      // Fallback: render a small placeholder square
      return (
        <span
          className={className}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            height: size,
            borderRadius: "2px",
            background: "var(--orphix-color-base-surface-muted)",
            color: color ?? "var(--orphix-color-text-muted)",
            fontSize: size * 0.5,
            fontFamily: "monospace",
          }}
        >
          ?
        </span>
      );
    }

    return (
      <img
        src={name}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{
          display: "inline-block",
          objectFit: "contain",
          color,
          filter: color ? undefined : "currentColor",
        }}
        onError={() => setImgError(true)}
        draggable={false}
      />
    );
  }

  // Lucide icon
  const LucideComponent = resolveLucideIcon(name);
  if (LucideComponent) {
    return <LucideComponent size={size} className={className} color={color} strokeWidth={strokeWidth} />;
  }

  // Unknown lucide name — render a placeholder
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "2px",
        background: "var(--orphix-color-base-surface-muted)",
        color: color ?? "var(--orphix-color-text-muted)",
        fontSize: size * 0.5,
        fontFamily: "monospace",
      }}
      title={`Unknown icon: ${name}`}
    >
      ?
    </span>
  );
}
