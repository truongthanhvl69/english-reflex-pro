import React, { useState } from "react";

export interface UserAvatarProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  size?: number;
}

function getInitials(name?: string | null, email?: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || "?";
  }
  if (email && email.trim()) {
    return email[0]?.toUpperCase() || "?";
  }
  return "?";
}

export function UserAvatar({ avatarUrl, fullName, email, size = 40 }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(fullName, email);

  const wrapperStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "#f1f5f9"
  };

  const imgStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "9999px",
    objectFit: "cover" as const,
    display: "block",
  };

  if (avatarUrl && avatarUrl.trim() && !imageError) {
    return (
      <div style={wrapperStyle}>
        <img 
          src={avatarUrl} 
          alt={fullName || "User Avatar"} 
          style={imgStyle} 
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Fallback to initials with premium brand green gradient
  return (
    <div 
      style={{
        ...wrapperStyle,
        background: "linear-gradient(135deg, #20b486, #189870)",
        color: "white",
        fontSize: `${Math.max(12, Math.round(size * 0.38))}px`,
        fontWeight: "bold",
        textTransform: "uppercase",
        userSelect: "none"
      }}
    >
      {initials}
    </div>
  );
}
export default UserAvatar;
