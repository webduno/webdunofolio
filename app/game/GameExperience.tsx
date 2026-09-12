"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import styles from "./page.module.css";

const GameCanvas = dynamic(() => import("./GameCanvas"), { ssr: false });

type Status = "ready" | "playing" | "dead";

export default function GameExperience() {
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [flapId, setFlapId] = useState(0);
  const [sessionId, setSessionId] = useState(0);

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

  const handleDead = useCallback(() => {
    setStatus("dead");
  }, []);

  const flap = useCallback(() => {
    const current = statusRef.current;
    if (current === "dead") {
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
  }, []);

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
          />
        </div>

        {status === "playing" ? (
          <div className={styles.score}>{score}</div>
        ) : null}

        {status !== "playing" ? (
          <div className={styles.overlay}>
            <div className={styles.overlayTitle}>
              {status === "dead" ? "Game Over" : ""}
            </div>
            <div className={styles.overlayBottom}>
              {status === "dead" ? (
                <div className={styles.overlayHint}>Seeds {score}</div>
              ) : (
                <div className={styles.overlayHint}>
                  Tap to flap. Stay off the island and grab the seeds.
                </div>
              )}
              <div className={styles.best}>Best {best}</div>
              <div className={styles.overlayHint}>
                {status === "dead" ? "Tap to retry" : "Tap or press space"}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
