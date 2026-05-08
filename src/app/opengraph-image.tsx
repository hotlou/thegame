import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const alt = "TheGame — Ultiworld's free college pick'em game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function loadDataUrl(relPath: string) {
  const buffer = fs.readFileSync(path.join(process.cwd(), relPath));
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export default async function OpengraphImage() {
  return renderTheGameOg({
    eyebrow: "Presented by Ultiworld",
    headline: "TheGame",
    subhead: "Free college pick'em for the USAU Championships.",
  });
}

export function renderTheGameOg({
  eyebrow,
  headline,
  subhead,
}: {
  eyebrow: string;
  headline: string;
  subhead: string;
}) {
  const ultiworld = loadDataUrl("public/brand/ultiworld-logo.png");
  const combat = loadDataUrl("public/brand/combat-candy-wordmark.png");

  const isWordmark = headline === "TheGame";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f7f4ed",
          padding: 72,
          position: "relative",
          fontFamily: "sans-serif",
          color: "#16181d",
        }}
      >
        {/* Top utility bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#6b7280",
            paddingBottom: 18,
            borderBottomWidth: 1,
            borderBottomStyle: "solid",
            borderBottomColor: "#d7d0c2",
          }}
        >
          <span>tips@thegame.ultiworld.com</span>
          <span>thegame.ultiworld.com</span>
        </div>

        {/* Lockup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            marginTop: 64,
            flex: 1,
          }}
        >
          <img
            src={ultiworld}
            alt=""
            width={220}
            height={220}
            style={{ display: "block" }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: "#c8242b",
              }}
            >
              {eyebrow}
            </div>
            {isWordmark ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 168,
                  fontWeight: 900,
                  letterSpacing: -6,
                  lineHeight: 1,
                }}
              >
                <span>The</span>
                <span style={{ color: "#c8242b" }}>Game</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 96,
                  fontWeight: 900,
                  letterSpacing: -3,
                  lineHeight: 1.05,
                  maxWidth: 760,
                }}
              >
                {headline}
              </div>
            )}
            <div
              style={{
                fontSize: 28,
                color: "#16181d",
                fontWeight: 500,
                lineHeight: 1.35,
                maxWidth: 760,
              }}
            >
              {subhead}
            </div>
          </div>
        </div>

        {/* Bottom — double-rule + sponsor */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTopWidth: 3,
            borderTopStyle: "double",
            borderTopColor: "#d7d0c2",
            paddingTop: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              fontSize: 18,
              color: "#6b7280",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#c8242b",
              }}
            >
              Sponsored by
            </span>
            <img
              src={combat}
              alt=""
              height={40}
              style={{
                display: "block",
                opacity: 0.85,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#066d6c",
            }}
          >
            College &amp; Club Championships · 2026
          </div>
        </div>
      </div>
    ),
    size,
  );
}
