import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export interface AvatarProps {
  initials: string;
  imageUrl?: string | null;
  className?: string;
  textClassName?: string;
}

export function Avatar({ initials, imageUrl, className, textClassName }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const [prevImageUrl, setPrevImageUrl] = React.useState(imageUrl);

  if (imageUrl !== prevImageUrl) {
    setPrevImageUrl(imageUrl);
    setImageError(false);
  }
  return (
    <div className={cn("rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden relative bg-orange-50", className)}>
      {imageUrl && !imageError ? (
        <Image
          src={imageUrl}
          alt={initials}
          fill
          sizes="(max-width: 640px) 40px, 56px"
          unoptimized
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className={cn("font-semibold text-orange-600", textClassName)}>{initials}</span>
      )}
    </div>
  );
}
