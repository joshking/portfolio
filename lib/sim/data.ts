// Roster and universe seed data. Analyst identities are synthetic
// (clearly-invented handles); tickers are real US large caps, but every
// weight, move, and score is simulated and labeled as such in the UI.

export const ANALYST_SEED: Array<
  [handle: string, name: string, focus: string]
> = [
  ["macroharbor", "Dana Whitfield", "Macro & rates"],
  ["quietdelta", "R. Okafor", "Semis"],
  ["basispoints_", "Priya Raman", "Rates & FX"],
  ["capexwatch", "Tom Herrera", "Datacenter capex"],
  ["latelongs", "J. Kessler", "Momentum"],
  ["gammafarmer", "Nia Brooks", "Vol & flows"],
  ["printandhold", "Sam Aldous", "Earnings"],
  ["chipglut", "K. Watanabe", "Semis supply chain"],
  ["fadethenews", "Marta Silva", "Contrarian"],
  ["driftcatcher", "A. Petrov", "Quant screens"],
  ["yieldcurveghost", "L. Nguyen", "Macro"],
  ["fabtalk", "E. Osei", "Foundry & tools"],
  ["ladderedup", "C. Marchetti", "Industrials"],
  ["barbelled", "H. Lindqvist", "Portfolio construction"],
  ["teardownguy", "M. Farouk", "Hardware teardowns"],
  ["swordfishcap", "V. Ionescu", "Event-driven"],
  ["grossmarginhawk", "T. Ballard", "Software margins"],
  ["oatsandalpha", "F. Dubois", "Consumer"],
  ["halfturns", "G. Anand", "Semis pricing"],
  ["slowcompounder", "W. Achebe", "Quality"],
  ["tapeandcoffee", "S. Marlowe", "Tape reading"],
  ["hyperscalewatch", "I. Vargas", "Cloud infra"],
  ["dcfmonk", "P. Sorensen", "Valuation"],
  ["shortdatedhope", "B. Kaminski", "Options flow"],
  ["railcarcounts", "N. Duplessis", "Freight data"],
  ["benchtestbench", "O. Takahashi", "GPU benchmarks"],
  ["squeezedshorts", "D. McAllister", "Short interest"],
  ["gridpremium", "Y. Castellanos", "Power & grid"],
  ["pipelineprints", "Z. Haddad", "Pharma catalysts"],
  ["memorycycle", "Q. Bergström", "Memory"],
  ["torquefund", "U. Ferreira", "Autos & EV"],
  ["lithoprints", "X. Devereux", "Litho & EUV"],
  ["carrytrader", "K. Almasi", "FX carry"],
  ["deltahedged", "R. Vance", "Derivatives"],
  ["insiderfilings", "M. Osato", "Form 4 tracking"],
  ["cyclicalturns", "J. Brandt", "Cyclicals"],
  ["floatshrink", "T. Ellison", "Buybacks"],
  ["ruleoffourty", "A. Meyerson", "SaaS"],
  ["copperfrog", "L. Baptiste", "Commodities"],
  ["ecapratio", "S. Adeyemi", "Banks"],
  ["payloadfraction", "C. Novak", "Aerospace"],
  ["cloudcapexbot", "V. Rosales", "Hyperscaler capex"],
  ["opexdiet", "N. Sterling", "Cost discipline"],
  ["bidasknomad", "E. Marchand", "Liquidity"],
  ["turbinewatch", "H. Okonkwo", "Energy equipment"],
  ["stackedwafers", "F. Leclerc", "Advanced packaging"],
  ["mallrataltdata", "G. Whitaker", "Foot traffic alt-data"],
  ["freightwaves_k", "B. Santoro", "Logistics"],
  ["biobreakouts", "D. Ferreira", "Biotech"],
  ["ratechange", "P. Antonelli", "Fed watching"],
  ["silichead", "W. Nakagawa", "Chip design"],
  ["longduration", "R. Beaumont", "Growth duration"],
  ["earningswhisper", "K. Delacroix", "Earnings drift"],
  ["taxlossharvey", "J. Osment", "Seasonality"],
  ["breadthgauge", "M. Lindgren", "Market breadth"],
  ["capitalcycles", "T. Duarte", "Capital cycle"],
  ["arpuwatcher", "S. Kovac", "Telecom & media"],
  ["unitecon", "A. Ricci", "Unit economics"],
  ["drawdowndiary", "O. Hassan", "Risk"],
  ["skewtrader", "I. Novotna", "Skew & tails"],
  ["betabath", "C. Ambrose", "Factor rotation"],
  ["marginofsafety", "V. Duval", "Value"],
  ["gigafactorygaze", "E. Sandoval", "EV supply chain"],
  ["quietaccumulator", "L. Fontaine", "Accumulation patterns"],
];

export const ASSET_SEED: Array<
  [ticker: string, name: string, sector: string, baseWeight: number]
> = [
  ["NVDA", "NVIDIA", "Semiconductors", 0.118],
  ["MSFT", "Microsoft", "Software", 0.092],
  ["AVGO", "Broadcom", "Semiconductors", 0.071],
  ["TSM", "TSMC", "Semiconductors", 0.066],
  ["META", "Meta Platforms", "Internet", 0.061],
  ["AMZN", "Amazon", "Internet", 0.058],
  ["GOOGL", "Alphabet", "Internet", 0.054],
  ["AAPL", "Apple", "Hardware", 0.049],
  ["AMD", "AMD", "Semiconductors", 0.043],
  ["ASML", "ASML", "Semi equipment", 0.039],
  ["MU", "Micron", "Memory", 0.035],
  ["ORCL", "Oracle", "Software", 0.032],
  ["TSLA", "Tesla", "Autos", 0.03],
  ["NFLX", "Netflix", "Media", 0.027],
  ["CRM", "Salesforce", "Software", 0.025],
  ["NOW", "ServiceNow", "Software", 0.024],
  ["PLTR", "Palantir", "Software", 0.023],
  ["LLY", "Eli Lilly", "Pharma", 0.022],
  ["JPM", "JPMorgan", "Banks", 0.021],
  ["V", "Visa", "Payments", 0.02],
  ["COST", "Costco", "Retail", 0.019],
  ["CAT", "Caterpillar", "Industrials", 0.018],
  ["XOM", "Exxon Mobil", "Energy", 0.017],
  ["INTC", "Intel", "Semiconductors", 0.016],
  ["ARM", "Arm Holdings", "Semiconductors", 0.015],
  ["SMCI", "Supermicro", "Hardware", 0.005],
];

// Positions the basket has held and exited inside the 180-day record.
// Same disclaimer as above: real tickers, simulated history.
export const FORMER_ASSET_SEED: Array<
  [ticker: string, name: string, sector: string, baseWeight: number]
> = [
  ["SNOW", "Snowflake", "Software", 0.021],
  ["ADBE", "Adobe", "Software", 0.026],
  ["PYPL", "PayPal", "Payments", 0.014],
  ["DIS", "Disney", "Media", 0.017],
  ["NKE", "Nike", "Consumer", 0.011],
  ["SHOP", "Shopify", "Internet", 0.013],
  ["QCOM", "Qualcomm", "Semiconductors", 0.024],
  ["MRNA", "Moderna", "Pharma", 0.008],
];

// Post templates. {T} = ticker with $, {T2} = second ticker.
export const CALL_TEMPLATES: Array<
  [text: string, action: "BUY" | "SELL" | "TRIM"]
> = [
  ["{T} accelerating into the datacenter capex print. Adding here.", "BUY"],
  [
    "Started a position in {T} this morning. The setup finally makes sense.",
    "BUY",
  ],
  [
    "{T} guide was conservative and everyone knows it — the same management team has sandbagged four quarters straight. I'm long into the print.",
    "BUY",
  ],
  ["Adding to {T} on this dip. Thesis unchanged, price better.", "BUY"],
  ["{T} checks: orders firming through the channel. Size up.", "BUY"],
  ["New highs on volume for {T}. Momentum says stay long, so I am.", "BUY"],
  ["{T} is the cheapest way to own the buildout. Accumulating.", "BUY"],
  [
    "I keep coming back to {T}. Every bear case is a timing argument, not a thesis argument, and timing arguments get expensive. Initiated today.",
    "BUY",
  ],
  [
    "Supply checks say {T} pricing holds through Q3 and the order book is already spilling into Q4. Nobody models that. Long, adding on red days.",
    "BUY",
  ],
  ["{T} — the margin story is underrated. Bought more.", "BUY"],
  ["Out of {T} entirely. Risk/reward is gone above these levels.", "SELL"],
  [
    "Sold my {T} this morning. The second derivative on growth just turned negative and the sell side is still modeling reacceleration. Not for me.",
    "SELL",
  ],
  ["{T} channel checks got worse, not better. I'm out.", "SELL"],
  ["Cut {T} this morning. When the story needs a new narrative, exit.", "SELL"],
  [
    "{T} into earnings with this positioning, this multiple, and options pricing a 9% move? No thanks. Closed the whole thing at the open.",
    "SELL",
  ],
  [
    "Trimming {T} into strength. Still a core holding, but it ran 40% in six weeks and the easy part is behind us. Discipline over vibes.",
    "TRIM",
  ],
  ["Took some {T} off the table today. House money now.", "TRIM"],
  ["Reduced {T} by a third. Crowding is getting uncomfortable.", "TRIM"],
  ["{T} position was too big after this run. Right-sized it.", "TRIM"],
  [
    "Lightened up on {T} pre-print. Keeping the rest through the number.",
    "TRIM",
  ],
];

// Mixed-position posts: {T} gets the first action, {T2} the second.
export const MULTI_CALL_TEMPLATES: [string, "BUY" | "TRIM", "BUY" | "TRIM"][] =
  [
    [
      "Rotating out of {T2} and into {T}. One is priced for perfection with decelerating orders, the other is priced like the cycle already ended.",
      "BUY",
      "TRIM",
    ],
    [
      "{T} is the obvious winner here — {T2} is the one funding the trade.",
      "BUY",
      "TRIM",
    ],
    [
      "Adding {T}, trimming {T2}. Same thesis, opposite sides of it.",
      "BUY",
      "TRIM",
    ],
    ["Long {T}, lightening {T2}. The capex flows one way.", "BUY", "TRIM"],
    [
      "Barbell: {T} and {T2} both, but only one deserves the size.",
      "BUY",
      "BUY",
    ],
  ];

export const NO_CALL_TEMPLATES: string[] = [
  "Rates chatter this week is mostly noise. Watching, not trading.",
  "Breadth improving quietly under the surface. Interesting but no trade yet.",
  "This tape rewards patience more than ideas right now.",
  "CPI day. Coffee first, opinions later.",
  "The best trade some weeks is not trading. This is one of those weeks.",
  "Everyone has the same three longs, the same hedges, and the same stop levels. Crowding isn't a reason to sell — but it is a reason to size down.",
  "Earnings season vibe check: guides matter, beats don't.",
  "Reminder that position sizing is the whole game. The picks are secondary.",
  "Macro was a nothingburger, but watch how the market treats a nothingburger. Selling good news is information. Taking notes, not trades.",
  "Watching the dollar. If it breaks this level everything else is downstream.",
  "Half of fintwit is arguing about the same chart with different axes.",
  "No trades today. Journaling instead. Discipline is boring on purpose.",
  "Volume tells you what conviction looks like, and today had none of it — every rally on air, every dip bought lazily. Flat until something changes.",
  "The market can stay irrational etc etc. Flat into the weekend.",
  "Good thread below on capex cycles. Worth your ten minutes.",
];

export const DISCARDED_TEMPLATES: Array<[text: string, reason: string]> = [
  ["Imagine still not owning the obvious one here lol", "No ticker resolved"],
  [
    "This company is either a zero or a 10x and honestly both feel right",
    "Ambiguous direction",
  ],
  ["Great quarter guys 👏👏👏", "Sarcasm suspected"],
  [
    "He's back on the timeline posting charts again. Bullish (on entertainment)",
    "Off-topic",
  ],
  [
    "$NVDA $AMD $TSM $MU one of these is not like the others",
    "Multiple tickers, no stance",
  ],
  [
    "My dog walked past the ticker tape and barked twice. Signal?",
    "Non-actionable",
  ],
  ["Everything I said yesterday, but louder", "Duplicate of prior post"],
  ["Unpopular opinion: spreadsheets", "Off-topic"],
  ["Load up. You know the one. IYKYK", "No ticker resolved"],
  [
    "Selling everything or buying everything depending on the open",
    "Ambiguous direction",
  ],
];

export const ORACLE_SEED: Array<[name: string, role: string]> = [
  ["TICKER-RES", "Entity resolution — which security is this post about?"],
  ["STANCE", "Directional stance — long, short, trim, or none"],
  ["CONVICTION", "Position sizing intent and confidence weighting"],
  ["CONTEXT", "Sarcasm, hedging, and quote-context screening"],
  ["DEDUP", "Novelty — is this a new call or a repeat?"],
];
