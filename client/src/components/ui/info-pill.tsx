import React, { memo } from "react";

export type InfoPillProps = {
  icon?: React.ReactNode;
  children: React.ReactNode;
};

const InfoPill = memo(function InfoPill({ icon, children }: InfoPillProps) {
  return (
    <div className="flex items-center bg-[#2d4a5e]/60 px-5 py-3 rounded-full border border-[#c9a24d]/20">
      {icon && <span className="mr-2 text-[#c9a24d]">{icon}</span>}
      <span className="text-white">{children}</span>
    </div>
  );
});

export default InfoPill;
