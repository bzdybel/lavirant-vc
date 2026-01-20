import React, { memo } from "react";

export type ImageCardProps = {
  src: string;
  alt: string;
  badge?: string;
};

const ImageCard = memo(function ImageCard({ src, alt, badge }: ImageCardProps) {
  return (
    <div className="relative">
      <img src={src} alt={alt} className="w-full h-auto rounded-xl shadow-2xl z-10 relative border-2 border-[#c9a24d]/30" />

      <div className="absolute -inset-0.5 bg-[#c9a24d] opacity-20 blur-lg rounded-xl" />
      <div className="absolute -inset-1 bg-gradient-to-r from-[#2d4a5e] via-[#c9a24d] to-[#2d4a5e] opacity-30 blur-xl rounded-xl" />

      {badge && (
        <div className="absolute -bottom-5 -right-5 bg-[#c9a24d] text-[#0f2433] font-bold py-3 px-6 rounded-full shadow-lg transform -rotate-3">
          {badge}
        </div>
      )}
    </div>
  );
});

export default ImageCard;
