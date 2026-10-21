"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSim } from "@/lib/sim/store";
import { fmtSigned } from "@/lib/format";

// The invest strip: the hero's financial baseline. This is a fund, so the
// strip leads with the fund's numbers — current token price (indexed NAV
// read as dollars), its 24h move, and a 30-day trend line — beside the
// single conversion point. The editorial line stays one quiet clause. The
// strip is its own dark surface in every world, so its colors are literal,
// never tokens.
//
// Two placements: the default band sits in normal flow (full-bleed, border-t);
// `floating` renders it as an elevated capsule that rests in its flow slot
// (beneath the hero) and, once scrolled to 48px from the viewport top, sticks
// there and follows the reader down the rest of the page.
//
// In the floating placement the Invest button opens the swap panel: the
// surface grows downward from the capsule (the strip row holds its top edge),
// overlaying the content below rather than pushing the layout — and opening
// scrolls the capsule to its stuck position first, so the whole panel is on
// screen. The panel is a white swap card (order size in USDC, projected NFUND
// proceeds at the shown NAV, slippage, Market Buy) beside the fee schedule
// and disclosures.

const SPARK_W = 128;
const SPARK_H = 34;
const SPARK_DAYS = 30;
const STRIP_H = 56;
// The open surface: tall enough for the swap card, capped so it stays inside
// the viewport below the capsule's stuck position (48px + breathing room).
const PANEL_H = "min(568px, calc(100dvh - 96px))";

export function InvestCta({ floating = false }: { floating?: boolean } = {}) {
  const sim = useSim();
  const [open, setOpen] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Opening scrolls the capsule to its stuck position first, so the panel
  // that grows beneath it lands fully on screen.
  const toggleOpen = () => {
    setOpen((v) => {
      if (!v) {
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        stickyRef.current?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      }
      return !v;
    });
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const fin = useMemo(() => {
    const nav = sim.nav;
    if (nav.length < 2) return null;
    const last = nav[nav.length - 1].value;
    const prev = nav[nav.length - 2].value;
    const change24h = ((last - prev) / prev) * 100;
    const tail = nav.slice(-SPARK_DAYS);
    const lo = Math.min(...tail.map((p) => p.value));
    const hi = Math.max(...tail.map((p) => p.value));
    const span = Math.max(hi - lo, 1e-6);
    const points = tail
      .map((p, i) => {
        const x = (i / (tail.length - 1)) * SPARK_W;
        const y = SPARK_H - 2 - ((p.value - lo) / span) * (SPARK_H - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { price: last / 100, change24h, points };
  }, [sim.nav]);

  const up = (fin?.change24h ?? 0) >= 0;
  const trendColor = up ? "#3FDFA0" : "#FF9C88";

  const rowCore = (
    <>
      <p
        className="hidden max-w-[38ch] min-w-0 truncate text-[0.9375rem] lg:block"
        style={{ color: "#D9E4F6" }}
      >
        One token that holds the whole basket.
      </p>

      {/* The fund's numbers: price, 24h move, 30-day trend. */}
      {fin && (
        <div className="flex shrink-0 items-center gap-4">
          <svg
            width={SPARK_W}
            height={SPARK_H}
            viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
            aria-hidden
            className="shrink-0"
          >
            <polyline
              points={fin.points}
              fill="none"
              stroke={trendColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="flex items-baseline gap-3 whitespace-nowrap">
            <span
              className="text-[1.6rem] leading-none font-extrabold tracking-tight tabular-nums"
              style={{ color: "#FFFFFF" }}
              suppressHydrationWarning
            >
              ${fin.price.toFixed(3)}
            </span>
            <span
              className="text-[1.05rem] font-bold tabular-nums"
              style={{ color: trendColor }}
              suppressHydrationWarning
            >
              {fmtSigned(fin.change24h)}
              <span
                className="ml-1.5 text-[0.7rem] font-semibold tracking-[0.06em]"
                style={{ color: "#AECAF0" }}
              >
                24H
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );

  const btnCls =
    "inline-flex h-10 shrink-0 items-center rounded-full bg-white px-6 text-[0.875rem] font-semibold tracking-[0.01em] text-[#0036BC] transition-colors duration-150 ease-out hover:bg-[#CFE0F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  if (floating) {
    return (
      <div
        ref={stickyRef}
        className="sticky top-12 z-40 mt-2 mb-4 scroll-mt-12 px-5"
      >
        <div className="relative mx-auto h-14 max-w-[1040px]">
          {/* The surface: anchored to the capsule's slot, growing downward
              over the content beneath. Radius 28px equals the closed
              capsule's rounded-full. */}
          <div
            className="bg-midnight absolute inset-x-0 top-0 flex flex-col overflow-hidden rounded-[28px] border shadow-[0_18px_44px_rgba(1,18,44,0.35)] transition-[height] duration-500 ease-out motion-reduce:transition-none"
            style={{
              height: open ? PANEL_H : STRIP_H,
              borderColor: "rgba(255,255,255,0.24)",
            }}
          >
            {/* The row fills the surface inside its 1px border (56 − 2), so
                the 40px button sits 8px from every edge, border included. */}
            <div className="flex h-[54px] shrink-0 items-center justify-between gap-5 pr-[7px] pl-6">
              {rowCore}
              <button
                className={btnCls}
                type="button"
                aria-expanded={open}
                onClick={toggleOpen}
              >
                {open ? "Close" : "Invest in the Network Fund"}
              </button>
            </div>
            <div
              className={`min-h-0 flex-1 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                open ? "opacity-100 delay-150" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!open}
            >
              {fin && <SwapPanel price={fin.price} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-midnight border-t"
      style={{ borderColor: "rgba(255,255,255,0.24)" }}
    >
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-5 px-5">
        {rowCore}
        <button className={btnCls} type="button">
          Invest in the Network Fund
        </button>
      </div>
    </div>
  );
}

// The swap: order size in USDC on the left, the fee schedule and disclosures
// on the right. The card is an inverted plate — white paper, cobalt ink —
// against the panel's deep-cobalt ground.
const SWAP = {
  ink: "#0036BC",
  muted: "rgba(0,54,188,0.6)",
  hairline: "rgba(0,54,188,0.25)",
  field: "#EEF3FB",
  usdc: "#2775CA",
  buy: "#068F62",
};

function SwapPanel({ price }: { price: number }) {
  const [amount, setAmount] = useState("");
  const amt = Number(amount);
  const valid = Number.isFinite(amt) && amt > 0;
  const proceeds = valid ? amt / price : 0;
  const fmtUsd = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtTok = (n: number) =>
    n.toLocaleString("en-US", { maximumFractionDigits: 4 });

  return (
    <div className="flex h-full gap-10 overflow-y-auto px-6 pt-2 pb-6">
      {/* The order card. Both columns centre in the open surface (my-auto,
          which yields to the scroll when a short viewport makes them taller
          than the panel) so the card never leaves a band of empty ground
          beneath it. */}
      <div className="rounded-card my-auto w-[440px] shrink-0 bg-white p-4">
        <div className="rounded-2xl p-4" style={{ background: SWAP.field }}>
          <label
            htmlFor="invest-order-size"
            className="text-[0.9375rem] font-semibold"
            style={{ color: SWAP.ink }}
          >
            Order size
          </label>
          <div className="mt-1 flex items-center justify-between gap-4">
            <input
              id="invest-order-size"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*\.?\d*$/.test(v)) setAmount(v);
              }}
              className="min-w-0 flex-1 bg-transparent text-[2rem] leading-none font-bold tracking-tight tabular-nums outline-none"
              style={{ color: SWAP.ink }}
            />
            <span
              className="flex shrink-0 items-center gap-2 text-[1.35rem] font-bold"
              style={{ color: "#0f1419" }}
            >
              <UsdcMark />
              USDC
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <span className="text-[0.9375rem]" style={{ color: SWAP.muted }}>
              ${fmtUsd(valid ? amt : 0)}
            </span>
            <span className="text-[0.9375rem]" style={{ color: SWAP.muted }}>
              Balance <strong style={{ color: "#0f1419" }}>0.00</strong>
            </span>
          </div>
        </div>

        {/* The turn: order flows down into proceeds. */}
        <div className="relative -my-3 flex justify-center">
          <span
            className="z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white"
            style={{ borderColor: SWAP.hairline }}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="#0f1419"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 4v12m0 0-3-3m3 3 3-3" />
              <path d="M16 20V8m0 0 3 3m-3-3-3 3" />
            </svg>
          </span>
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: SWAP.hairline }}
        >
          <p
            className="text-[0.9375rem] font-semibold"
            style={{ color: "#0f1419" }}
          >
            Projected proceeds
          </p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <span
              className="text-[2rem] leading-none font-bold tracking-tight tabular-nums"
              style={{ color: "#0f1419" }}
              suppressHydrationWarning
            >
              {fmtTok(proceeds)}
            </span>
            <span
              className="flex shrink-0 items-center gap-2 text-[1.35rem] font-bold"
              style={{ color: "#0f1419" }}
            >
              <Image
                src="/nf-logo.png"
                alt=""
                width={26}
                height={26}
                className="shrink-0 rounded-full"
              />
              NFUND
            </span>
          </div>
          <p
            className="mt-2 text-[0.9375rem]"
            style={{ color: SWAP.muted }}
            suppressHydrationWarning
          >
            ${fmtUsd(valid ? amt : 0)}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 px-1">
          <span
            className="text-[0.9375rem] font-medium"
            style={{ color: SWAP.muted }}
          >
            Slippage tolerance
          </span>
          <span
            className="rounded-full border px-3 py-1 text-[0.875rem] font-semibold"
            style={{ borderColor: SWAP.hairline, color: SWAP.ink }}
          >
            0.5%
          </span>
        </div>

        <button
          type="button"
          disabled={!valid}
          className="mt-4 w-full rounded-full py-3.5 text-[1rem] font-semibold text-white transition-opacity duration-150 ease-out disabled:opacity-60"
          style={{ background: SWAP.buy }}
        >
          Market Buy
        </button>
      </div>

      {/* Fees and disclosures beside the order. */}
      <div className="my-auto flex min-w-0 flex-1 flex-col gap-8">
        <div>
          <p
            className="text-[0.8125rem] font-semibold"
            style={{ color: "#AECAF0" }}
          >
            Fees
          </p>
          <dl className="mt-2 max-w-[44ch]">
            {[
              ["Mint fee", "0.25%"],
              ["Annualized TVL fee", "1.00%"],
              ["Slippage tolerance", "0.5% max"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-6 border-b py-2.5"
                style={{ borderColor: "rgba(255,255,255,0.24)" }}
              >
                <dt className="text-[0.9375rem]" style={{ color: "#D9E4F6" }}>
                  {label}
                </dt>
                <dd
                  className="text-[0.9375rem] font-semibold tabular-nums"
                  style={{ color: "#FFFFFF" }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p
            className="text-[0.8125rem] font-semibold"
            style={{ color: "#AECAF0" }}
          >
            Disclosures
          </p>
          <div
            className="mt-2 flex max-w-[52ch] flex-col gap-3 text-[0.9375rem] leading-relaxed"
            style={{ color: "#D9E4F6" }}
          >
            <p>
              Market orders mint NFUND against the live basket at the indexed
              NAV shown in the strip. The mint fee is charged in USDC at
              execution.
            </p>
            <p>
              Slippage tolerance caps how far the executed price may move from
              the quote; an order that would exceed it does not execute.
            </p>
            <p>
              The annualized TVL fee accrues inside the token price. There is no
              separate charge, and redemptions settle against the same basket on
              Reserve rails.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// USDC's dollar roundel, drawn to the token's silhouette.
function UsdcMark() {
  return (
    <span
      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
      style={{ background: SWAP.usdc }}
      aria-hidden
    >
      $
    </span>
  );
}
