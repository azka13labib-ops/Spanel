import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = "w-9 h-9",
  size = 36,
  priority = false,
}) => {
  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-indigo-600 shadow-xs group-hover:scale-105 transition-transform duration-200 ${className}`}
    >
      <Image
        src="/logo/01_monogram_sp_large.png"
        alt="sPanel Logo"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
