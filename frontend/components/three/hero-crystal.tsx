"use client";

import dynamic from "next/dynamic";

const CrystalScene = dynamic(() => import("./crystal-scene"), {
  ssr: false,
  loading: () => null,
});

export function HeroCrystal() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden sm:block" aria-hidden="true">
      <div className="absolute right-0 top-0 h-full w-full max-w-xl opacity-90">
        <CrystalScene />
      </div>
    </div>
  );
}
