// ---------------------------------------------------------------------------
// Curated symbol metadata for the operator basket's tickers. Accuracy over
// coverage: a ticker we cannot confidently name STAYS OUT of the map (it
// renders as its raw ticker with an empty sector — honest, never guessed).
// Currently unmapped from the live 50-ticker basket: HG, SPCX, LOVFF, SKHY,
// STRC — each is ambiguous or unidentifiable with confidence.
// ---------------------------------------------------------------------------

export interface SymbolMeta {
  name: string;
  sector: string;
}

export const SYMBOL_META: Record<string, SymbolMeta> = {
  // Equities & ETFs (operator basket, verified 2026-08)
  AAPL: { name: "Apple", sector: "Consumer Electronics" },
  ABVX: { name: "Abivax", sector: "Biotechnology" },
  AKAM: { name: "Akamai Technologies", sector: "Cloud Services" },
  AMAT: { name: "Applied Materials", sector: "Semiconductor Equipment" },
  APP: { name: "AppLovin", sector: "Software" },
  ASTS: { name: "AST SpaceMobile", sector: "Satellite Communications" },
  AVGO: { name: "Broadcom", sector: "Semiconductors" },
  BE: { name: "Bloom Energy", sector: "Energy" },
  CCCC: { name: "C4 Therapeutics", sector: "Biotechnology" },
  COHR: { name: "Coherent", sector: "Photonics" },
  CRWV: { name: "CoreWeave", sector: "AI Infrastructure" },
  DELL: { name: "Dell Technologies", sector: "Computer Hardware" },
  ERAS: { name: "Erasca", sector: "Biotechnology" },
  GLW: { name: "Corning", sector: "Electronic Components" },
  GOOG: { name: "Alphabet", sector: "Internet & Media" },
  GOOGL: { name: "Alphabet", sector: "Internet & Media" },
  IFNNY: { name: "Infineon Technologies", sector: "Semiconductors" },
  INTC: { name: "Intel", sector: "Semiconductors" },
  IREN: { name: "IREN", sector: "Data Centers" },
  IVA: { name: "Inventiva", sector: "Biotechnology" },
  KOD: { name: "Kodiak Sciences", sector: "Biotechnology" },
  KRKNF: { name: "Kraken Robotics", sector: "Marine Robotics" },
  LITE: { name: "Lumentum", sector: "Photonics" },
  META: { name: "Meta Platforms", sector: "Internet & Media" },
  MRVL: { name: "Marvell Technology", sector: "Semiconductors" },
  MSFT: { name: "Microsoft", sector: "Software" },
  NBIS: { name: "Nebius Group", sector: "AI Infrastructure" },
  NKTR: { name: "Nektar Therapeutics", sector: "Biotechnology" },
  NVDA: { name: "NVIDIA", sector: "Semiconductors" },
  OKLO: { name: "Oklo", sector: "Nuclear Energy" },
  ORCL: { name: "Oracle", sector: "Software" },
  QCOM: { name: "Qualcomm", sector: "Semiconductors" },
  RKLB: { name: "Rocket Lab", sector: "Aerospace" },
  SONY: { name: "Sony Group", sector: "Consumer Electronics" },
  SPY: { name: "SPDR S&P 500 ETF Trust", sector: "ETF" },
  STM: { name: "STMicroelectronics", sector: "Semiconductors" },
  STX: { name: "Seagate Technology", sector: "Data Storage" },
  TENX: { name: "Tenax Therapeutics", sector: "Biotechnology" },
  TSEM: { name: "Tower Semiconductor", sector: "Semiconductors" },
  TSLA: { name: "Tesla", sector: "Automotive" },
  VERA: { name: "Vera Therapeutics", sector: "Biotechnology" },
  WDC: { name: "Western Digital", sector: "Data Storage" },
  XBI: { name: "SPDR S&P Biotech ETF", sector: "ETF" },
  // Crypto
  BNB: { name: "BNB", sector: "Crypto" },
  BTC: { name: "Bitcoin", sector: "Crypto" },
  DOGE: { name: "Dogecoin", sector: "Crypto" },
  ETH: { name: "Ethereum", sector: "Crypto" },
  GRASS: { name: "Grass", sector: "Crypto" },
  LINK: { name: "Chainlink", sector: "Crypto" },
  RENDER: { name: "Render", sector: "Crypto" },
  SOL: { name: "Solana", sector: "Crypto" },
  SUI: { name: "Sui", sector: "Crypto" },
  TAO: { name: "Bittensor", sector: "Crypto" },
  USDC: { name: "USD Coin", sector: "Crypto" },
  XRP: { name: "XRP", sector: "Crypto" },
  ZEC: { name: "Zcash", sector: "Crypto" },
};

// Symbol → CoinGecko id, for the quotes route. Anything not listed here is
// treated as an equity (Yahoo); a miss on both sides yields a null quote.
export const CRYPTO_IDS: Record<string, string> = {
  BNB: "binancecoin",
  BTC: "bitcoin",
  DOGE: "dogecoin",
  ETH: "ethereum",
  GRASS: "grass",
  LINK: "chainlink",
  RENDER: "render-token",
  SOL: "solana",
  SUI: "sui",
  TAO: "bittensor",
  USDC: "usd-coin",
  XRP: "ripple",
  ZEC: "zcash",
};
