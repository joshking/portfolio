"use client";

import { useState } from "react";

/**
 * Company mark for a ticker, served by Parqet's logo CDN.
 * Decorative: hides itself if the CDN has no mark or the request fails,
 * so layouts must read correctly without it.
 */
export function StockLogo({
  ticker,
  size = 16,
  className,
}: {
  ticker: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny remote mark; next/image gains nothing here
    <img
      src={`https://assets.parqet.com/logos/symbol/${encodeURIComponent(ticker)}?format=png&size=64`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      className={`shrink-0 rounded-[2px] ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}
