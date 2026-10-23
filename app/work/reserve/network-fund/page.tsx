import type { Metadata } from "next";
import Link from "@/components/motion-link";
import { CaseStudyShell } from "@/components/case-study-shell";

const signalStates = [
  {
    name: "Buy call",
    description: "Adds or refreshes support for a company.",
    effect: "Support increases",
  },
  {
    name: "Sell call",
    description: "Reduces or removes that support.",
    effect: "Support falls",
  },
  {
    name: "No call",
    description: "Kept in the record, with no clear company and direction.",
    effect: "The basket does not change",
  },
] as const;

const methodology = [
  {
    title: "Watch the analysts",
    body: "Independent oracle operators collect posts from the selected list as they are published. Analysts do not submit trades or coordinate with the fund.",
  },
  {
    title: "Find the signal",
    body: "Each post is checked for a company and a clear direction. Jokes, questions, and general commentary are ignored.",
  },
  {
    title: "Rebuild each portfolio",
    body: "A buy refreshes support. A sell removes it. If an analyst stops mentioning a company, that position fades over 42 days.",
  },
  {
    title: "Weight the records",
    body: "Analysts with stronger past results have more influence. Posting more often does not make a voice count more.",
  },
  {
    title: "Agree on one basket",
    body: "Several independent operators calculate the target. The middle result is used; if their answers do not agree, the fund does not move.",
  },
  {
    title: "Rebalance tomorrow",
    body: "Today’s agreed basket is reviewed, published, and scheduled for the next day. The fund changes once, not every time a post appears.",
  },
] as const;

export const metadata: Metadata = {
  title: "Network Fund — Reserve — Josh King",
  description:
    "A Reserve product-design case study connecting analyst signals, portfolio construction, and implementation.",
};

export default function NetworkFundCaseStudy() {
  return (
    <CaseStudyShell backHref="/work/reserve" backLabel="Back to Reserve">
      <header className="reserve-project-hero">
        <h1>Network Fund</h1>
        <div className="reserve-project-hero-summary">
          <p>
            The Network Fund turns the public research of 1,000 ranked analysts on X into one proposed basket, updated
            through the day and rebalanced once daily.
          </p>
          <dl>
            <div>
              <dt>Product</dt>
              <dd>Public research → one basket</dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>1,000 ranked analysts</dd>
            </div>
            <div>
              <dt>Cadence</dt>
              <dd>Rebalanced once daily</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="reserve-site-entrance" aria-labelledby="network-site-title">
        <div>
          <h2 id="network-site-title">Explore the working site</h2>
          <p>
            Enter a self-contained edition of Network Fund and follow analyst signals through the fund, its scoring
            model, and rebalance history.
          </p>
        </div>
        <Link href="/work/reserve/network-fund/site">
          Enter the site
          <svg aria-hidden viewBox="0 0 16 16">
            <path d="M3 13 13 3M6 3h7v7" />
          </svg>
        </Link>
      </section>

      <section className="reserve-case-section network-story-section" aria-labelledby="network-origin-title">
        <h2 id="network-origin-title">Where it began</h2>
        <div>
          <p>
            In 2020 and 2021, millions of people spent more time online and many began trading from home. The same
            feeds that fuelled speculation also became an unlikely public research floor.
          </p>
          <p>
            Among the noise, people compared filings, supply chains, products, and prices in public. Individually,
            those observations were fragments. Together, they showed something more valuable: a crowd can notice
            change before any one person can see the whole picture.
          </p>
        </div>
      </section>

      <section className="reserve-case-section network-story-section" aria-labelledby="network-change-title">
        <h2 id="network-change-title">What changed</h2>
        <div>
          <p>
            The insight was public, but following it was a full-time job. The conversation on X moved faster than any
            person could read. Valuable research disappeared into the same stream as jokes, repetition, and noise.
          </p>
          <p className="network-story-pull">Large language models have changed that.</p>
        </div>
      </section>

      <section className="reserve-case-section network-story-section" aria-labelledby="network-system-title">
        <h2 id="network-system-title">The system</h2>
        <div>
          <p>
            The Network Fund is a way to turn that public research into a portfolio. It follows a selected group of
            analysts on X, reads what they publish, and looks for a clear view on a company.
          </p>
          <p>
            Each analyst is judged by the results of their past calls, not by popularity or posting frequency. Better
            records carry more weight. Their public calls keep shaping a proposed basket throughout the day.
          </p>
          <p>
            The starting list contains 1,000 analysts. It can change as new records are built and older ones lose
            relevance.
          </p>
        </div>
      </section>

      <section className="reserve-case-section network-story-section" aria-labelledby="network-reading-title">
        <h2 id="network-reading-title">Reading the stream</h2>
        <div>
          <p>
            Every public post from the tracked analysts enters the same stream. The system asks three simple
            questions: is there a company, a direction, and enough conviction to count it as a position?
          </p>
          <div className="network-story-states">
            {signalStates.map((state) => (
              <article key={state.name}>
                <h3>{state.name}</h3>
                <p>{state.description}</p>
                <span>{state.effect}</span>
              </article>
            ))}
          </div>
          <p>
            The clear positions become a working portfolio for each analyst. Company size helps set the starting
            weight, while the analyst’s past results determine how much their view counts.
          </p>
          <p>
            Those individual portfolios continuously reshape a proposed basket. Once a day, independent operators
            agree on the target used for the following day’s rebalance.
          </p>
        </div>
      </section>

      <section className="reserve-case-section network-story-section" aria-labelledby="network-method-title">
        <h2 id="network-method-title">From posts to portfolio</h2>
        <div>
          <ol className="network-story-method">
            {methodology.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="reserve-case-section network-story-section" aria-labelledby="network-result-title">
        <h2 id="network-result-title">The result</h2>
        <div>
          <p className="network-story-pull">One decision. A portfolio that keeps listening.</p>
          <p>You hold one fund. Behind it, the list, the readings, and the weights are refreshed every day.</p>
        </div>
      </section>

      <section className="reserve-case-section network-story-next" aria-labelledby="network-next-title">
        <h2 id="network-next-title">The next layer</h2>
        <div>
          <article>
            <h3>My involvement</h3>
            <p>
              Reserved for the next pass: the decisions I owned, the collaborators involved, and where design shaped
              the product.
            </p>
          </article>
          <article>
            <h3>The regulatory constraint</h3>
            <p>
              Reserved for the next pass: how the product’s path was affected when the Clarity Act did not pass, and
              what that meant for the work.
            </p>
          </article>
        </div>
      </section>

      <aside className="reserve-case-close">
        <p>The story is in place. The next pass will make the design work and constraints visible.</p>
        <div>
          <Link href="/work/stormforge">Next: StormForge</Link>
        </div>
      </aside>
    </CaseStudyShell>
  );
}
