"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import JSConfetti from "js-confetti";
import styles from "./page.module.css";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

type Status = "ready" | "playing" | "dead";

export default function GameExperience() {
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [flapId, setFlapId] = useState(0);
  const [sessionId, setSessionId] = useState(0);
  const [retryLocked, setRetryLocked] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<JSConfetti | null>(null);

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

  useEffect(() => {
    const stored = Number(window.localStorage.getItem("guaca-best") || 0);
    if (Number.isFinite(stored)) {
      setBest(stored);
    }
  }, []);

  useEffect(() => {
    if (score <= best) {
      return;
    }

    setBest(score);
    window.localStorage.setItem("guaca-best", String(score));
  }, [best, score]);

  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) {
      return;
    }

    const confetti = new JSConfetti({ canvas });
    confettiRef.current = confetti;
    return () => {
      confetti.clearCanvas();
      confettiRef.current = null;
    };
  }, []);

  const handleDead = useCallback(() => {
    setStatus("dead");
    setRetryLocked(true);
  }, []);

  const handleSpecial = useCallback(() => {
    confettiRef.current?.addConfetti({
      confettiColors: [
        "#3ddc84",
        "#f0c14a",
        "#ff6b6b",
        "#ffe066",
        "#74c0fc",
        "#ffffff",
      ],
      confettiNumber: 120,
    });
  }, []);

  useEffect(() => {
    if (status !== "dead" || !retryLocked) {
      return;
    }

    const id = window.setTimeout(() => {
      setRetryLocked(false);
    }, 3000);

    return () => window.clearTimeout(id);
  }, [retryLocked, status]);

  const flap = useCallback(() => {
    const current = statusRef.current;
    if (current === "dead") {
      if (retryLocked) {
        return;
      }

      setScore(0);
      setSessionId((value) => value + 1);
      setFlapId((value) => value + 1);
      setStatus("playing");
      return;
    }

    if (current === "ready") {
      setStatus("playing");
    }

    setFlapId((value) => value + 1);
  }, [retryLocked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();
      flap();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back} aria-label="Back to home">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 5L8 12L15 19"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      <div
        className={styles.stage}
        onPointerDown={(event) => {
          event.preventDefault();
          if (status === "dead") {
            return;
          }
          flap();
        }}
      >
        <div className={styles.canvasWrap}>
          <GameCanvas
            status={status}
            flapId={flapId}
            sessionId={sessionId}
            onScore={setScore}
            onDead={handleDead}
            onSpecial={handleSpecial}
          />
        </div>

        {status === "playing" ? (
          <div className={styles.score}>{score}</div>
        ) : null}

        {status === "ready" ? (
          <div className={styles.overlay}>
            <div className={styles.overlayTitle} />
            <div className={styles.overlayBottom}>
              <div className={styles.overlayHint}>
                Tap to flap. Stay off the island and grab the seeds.
              </div>
              <div className={styles.best}>Best {best}</div>
              <div className={styles.overlayHint}>Tap or press space</div>
            </div>
          </div>
        ) : null}

        {status === "dead" ? (
          <div className={`${styles.overlay} ${styles.overlayDead}`}>
            <div className={styles.overCard}>
              <div className={styles.overlayTitle}>Game Over</div>
              <div className={styles.overScore}>{score}</div>
              <div className={styles.overScoreLabel}>Seeds</div>
              <div className={styles.best}>Best {best}</div>
              <button
                type="button"
                className={styles.playAgain}
                disabled={retryLocked}
                onClick={(event) => {
                  event.stopPropagation();
                  flap();
                }}
              >
                Play Again
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <canvas ref={confettiCanvasRef} className={styles.confetti} />
    </div>
  );
}
