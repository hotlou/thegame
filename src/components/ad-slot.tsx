import Image from "next/image";

type Partner = "combat" | "unbench" | "almanac";

type WordmarkConfig = {
  mode: "wordmark";
  src: string;
  alt: string;
  href: string;
  line: string;
  cta: string;
};

type BannerConfig = {
  mode: "banner";
  banner: string;
  bannerWidth: number;
  bannerHeight: number;
  icon: string;
  alt: string;
  href: string;
  line: string;
  cta: string;
};

const PARTNERS: Record<Partner, WordmarkConfig | BannerConfig> = {
  combat: {
    mode: "wordmark",
    src: "/brand/combat-candy-wordmark.png",
    alt: "Combat Candy",
    href: "https://combatcandies.com",
    line: "Fuel for the deep cut.",
    cta: "Shop Combat Candy",
  },
  unbench: {
    mode: "banner",
    banner: "/brand/unbenchable-banner.png",
    bannerWidth: 1200,
    bannerHeight: 630,
    icon: "/brand/unbenchable-icon.png",
    alt: "Unbenchable",
    href: "https://unbenchable.com",
    line: "Where UFA fantasy ultimate and card games collide.",
    cta: "Play Unbenchable",
  },
  almanac: {
    mode: "wordmark",
    src: "/brand/ufa-almanac-logo.png",
    alt: "UFA Almanac",
    href: "https://ufaalmanac.com",
    line: "Every UFA stat, ever.",
    cta: "Browse the Almanac",
  },
};

export function AdSlot({ partner }: { partner: Partner }) {
  const config = PARTNERS[partner];

  if (config.mode === "banner") {
    return (
      <a
        className="tg-ad-banner"
        href={config.href}
        target="_blank"
        rel="noopener sponsored"
        aria-label={`${config.alt} — ${config.line}`}
      >
        <span className="tg-ad-eyebrow tg-ad-banner__eyebrow">Sponsor</span>
        <Image
          src={config.banner}
          alt={config.alt}
          width={config.bannerWidth}
          height={config.bannerHeight}
          className="tg-ad-banner__img"
          sizes="(max-width: 1180px) 100vw, 1180px"
        />
        <span className="tg-ad-banner__cta">
          <Image src={config.icon} alt="" aria-hidden="true" width={22} height={22} />
          <span>{config.cta} &rarr;</span>
        </span>
      </a>
    );
  }

  return (
    <a className="tg-ad" href={config.href} target="_blank" rel="noopener sponsored">
      <div className="tg-ad-left">
        <Image src={config.src} alt={config.alt} width={220} height={56} style={{ height: 56, width: "auto" }} />
        <div>
          <div className="tg-ad-eyebrow">Sponsor</div>
          <div className="tg-ad-line">
            <strong>{config.line}</strong>
          </div>
        </div>
      </div>
      <span className="tg-ad-cta">{config.cta} &rarr;</span>
    </a>
  );
}

const TEXT_AD_COPY: Record<Partner, { brand: string; line: string; cta: string; href: string }> = {
  combat: {
    brand: "Combat Candy",
    line: "Fuel for the deep cut — sour-sweet chews engineered for the second half.",
    cta: "Shop",
    href: PARTNERS.combat.href,
  },
  unbench: {
    brand: "Unbenchable",
    line: "Where UFA fantasy ultimate and card games collide. Draft, trade, win bragging rights.",
    cta: "Play",
    href: PARTNERS.unbench.href,
  },
  almanac: {
    brand: "UFA Almanac",
    line: "Every UFA stat, every season. Box scores, ratings, and a deep historical archive.",
    cta: "Browse",
    href: PARTNERS.almanac.href,
  },
};

export function TextAd({ partner }: { partner: Partner }) {
  const copy = TEXT_AD_COPY[partner];
  return (
    <a className="tg-ad-text" href={copy.href} target="_blank" rel="noopener sponsored">
      <span className="tg-ad-text__label">Sponsored</span>
      <span className="tg-ad-text__body">
        <strong>{copy.brand}</strong> &mdash; {copy.line}
      </span>
      <span className="tg-ad-text__cta">{copy.cta} &rarr;</span>
    </a>
  );
}

export function AdRail() {
  return (
    <>
      <AdSlot partner="combat" />
      <AdSlot partner="unbench" />
      <AdSlot partner="almanac" />
    </>
  );
}
