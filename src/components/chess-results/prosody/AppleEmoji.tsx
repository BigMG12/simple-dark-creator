/**
 * AppleEmoji — renders emoji as Apple-style image via emojicdn.
 * Falls back to native rendering if the image fails to load.
 */
import { useState } from "react";

interface AppleEmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

export function AppleEmoji({ emoji, size = 16, className = "" }: AppleEmojiProps) {
  const [failed, setFailed] = useState(false);

  if (!emoji) return null;
  if (failed) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={`https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple`}
      alt={emoji}
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`inline-block align-[-0.15em] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
