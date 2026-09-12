"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { MouseEvent } from "react";
import GlowOrb from "@/components/GlowOrb";
import glowStyles from "@/components/GlowOrb.module.css";
import PortfolioModal from "@/components/PortfolioModal";
import styles from "./page.module.css";

const IslandCanvas = dynamic(() => import("./IslandCanvas"), { ssr: false });

type OrbColor = "orange" | "green" | "blue";

type ExpandingOrb = {
  color: OrbColor;
  href: string;
  external?: boolean;
  top: number;
  left: number;
  size: number;
  scale: number;
};

function coverageScale(rect: DOMRect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const farthest = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(window.innerWidth - cx, cy),
    Math.hypot(cx, window.innerHeight - cy),
    Math.hypot(window.innerWidth - cx, window.innerHeight - cy),
  );
  const radius = Math.max(rect.width, rect.height) / 2;
  return (farthest / radius) * 1.2;
}

function coversViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return (
    rect.left <= 1 &&
    rect.top <= 1 &&
    rect.right >= window.innerWidth - 1 &&
    rect.bottom >= window.innerHeight - 1
  );
}

export default function LandingHero() {
  const router = useRouter();
  const [expanding, setExpanding] = useState<ExpandingOrb | null>(null);
  const [grown, setGrown] = useState(false);
  const [islandReady, setIslandReady] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const didRedirect = useRef(false);
  const handleIslandReady = useCallback(() => {
    setIslandReady(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  function redirect(target: ExpandingOrb) {
    if (didRedirect.current) {
      return;
    }

    didRedirect.current = true;

    if (target.external) {
      window.location.assign(target.href);
      return;
    }

    router.push(target.href);
  }

  function startExpand(
    event: MouseEvent<HTMLButtonElement>,
    href: string,
    color: OrbColor,
    external?: boolean,
  ) {
    if (expanding) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setExpanding({
      color,
      href,
      external,
      top: rect.top,
      left: rect.left,
      size: rect.width,
      scale: coverageScale(rect),
    });
  }

  useEffect(() => {
    if (!expanding) {
      return;
    }

    const growFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setGrown(true));
    });
    const fallback = window.setTimeout(() => redirect(expanding), 600);

    return () => {
      cancelAnimationFrame(growFrame);
      window.clearTimeout(fallback);
    };
  }, [expanding]);

  return (
    <section className={styles.hero}>
      <div className={styles.scene}>
        <div className={styles.name}>
          <div className={styles.first}>ABRAHAM</div>
          <div className={styles.last}>DUNO</div>
        </div>
        <div className={styles.glow} />
        <div className={styles.islandStage}>
          <Image
            src="/images/mainisland.png"
            alt="Low poly floating island"
            width={500}
            height={500}
            className={`${styles.island} ${islandReady ? styles.islandHidden : ""}`}
            priority
          />
          <div
            className={`${styles.islandCanvas} ${islandReady ? styles.islandCanvasReady : ""}`}
          >
            <IslandCanvas onReady={handleIslandReady} />
          </div>
        </div>

        <GlowOrb
          color="orange"
          size="lg"
          label={"Start\nGame"}
          className={styles.start}
          floatDelay={-0.2}
          floatDuration={3.4}
          floatPaused={Boolean(expanding)}
          onClick={(event) => startExpand(event, "/game", "orange")}
        />
        <GlowOrb
          color="green"
          size="md"
          label="Projects"
          className={styles.projects}
          floatDelay={-1.5}
          floatDuration={4.1}
          floatPaused={Boolean(expanding)}
          onClick={(event) => startExpand(event, "/projects", "green")}
        />
        <GlowOrb
          color="blue"
          size="sm"
          label="Contact"
          className={styles.contact}
          floatDelay={-2.7}
          floatDuration={3.7}
          floatPaused={Boolean(expanding)}
          onClick={(event) => startExpand(event, "/contact", "blue")}
        />

        <button
          type="button"
          className={styles.portfolio}
          onClick={() => setPortfolioOpen(true)}
        >
          Portfolio
          {/* <span className={styles.sparkle} aria-hidden="true" /> */}
        </button>
      </div>

      {portfolioOpen ? (
        <PortfolioModal onClose={() => setPortfolioOpen(false)} />
      ) : null}

      {expanding ? (
        <>
          <div className={styles.expandBlocker} />
          <div
            className={`${styles.expandOrb} ${grown ? styles.expandOrbGrown : ""}`}
            style={{
              top: expanding.top,
              left: expanding.left,
              width: expanding.size,
              height: expanding.size,
              ["--orb-scale" as string]: String(expanding.scale),
            }}
            onTransitionEnd={(event) => {
              if (event.propertyName !== "transform") {
                return;
              }

              if (!coversViewport(event.currentTarget)) {
                return;
              }

              redirect(expanding);
            }}
          >
            <div
              className={`${glowStyles[expanding.color]} ${styles.expandOrbColor}`}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
