import { MurmurCube } from "./MurmurCube";

export function ClosingCta() {
  return (
    <section
      aria-labelledby="close-h"
      className="mx-auto w-full max-w-[1280px] px-5"
    >
      <div className="grid items-center gap-x-14 md:grid-cols-[minmax(240px,400px)_minmax(0,1fr)]">
        {/* The DTF as particles: the murmur cube on its ivory exhibit plate —
            noise that has converged into one folio. */}
        <div className="hidden md:block">
          <MurmurCube />
        </div>

        <div className="py-16 md:py-24">
          <h2
            id="close-h"
            className="text-ink max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)] leading-[1.02] font-black tracking-[-0.02em] text-balance"
          >
            Built as a DTF, on Reserve.
          </h2>
          <p className="text-ink-secondary mt-5 max-w-[56ch]">
            A DTF — Decentralized Token Folio — is a basket of assets that lives
            onchain and trades as a single token. Mint it against the assets
            inside, redeem it for them at any time, and watch every rebalance
            execute in the open.
          </p>
          <p className="text-ink-secondary mt-4 max-w-[56ch]">
            DTFs are built by Reserve, the project behind onchain index funds
            and asset-backed currencies — the rails this fund runs on.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="https://app.reserve.org"
              target="_blank"
              rel="noreferrer"
              className="bg-ink text-paper hover:bg-white-dim focus-visible:outline-cobalt rounded-[3px] px-8 py-4 text-[0.9375rem] font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Explore DTFs on Reserve
            </a>
            <a
              href="https://reserve.org"
              target="_blank"
              rel="noreferrer"
              className="text-ink focus-visible:outline-cobalt rounded-[3px] px-5 py-4 text-[0.9375rem] font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              About the project — reserve.org
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
