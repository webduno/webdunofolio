"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import JSConfetti from "js-confetti";
import { GUACAMAYA_FACTS } from "@/lib/guacamayaFacts";
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [fact, setFact] = useState<string>(GUACAMAYA_FACTS[0]);
  const lastFactRef = useRef(0);
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
    let next = Math.floor(Math.random() * GUACAMAYA_FACTS.length);
    if (next === lastFactRef.current && GUACAMAYA_FACTS.length > 1) {
      next = (next + 1) % GUACAMAYA_FACTS.length;
    }
    lastFactRef.current = next;
    setFact(GUACAMAYA_FACTS[next]);
    setStatus("dead");
    setRetryLocked(true);
  }, []);

  const handleSpecial = useCallback(() => {
    confettiRef.current?.addConfetti({
      confettiColors: [
        "#3ddc84",
        "#3dff00",
        // "#f0c14a",
        // "#ff6b6b",
        // "#ffe066",
        // "#74c0fc",
        // "#ffffff",
      ],
      confettiNumber: 120,
    });
  }, []);

  const handleGold = useCallback(() => {
    confettiRef.current?.addConfetti({
      confettiColors: ["#ffd27a", "#f5920e", "#ffe066"],
      confettiNumber: 1,
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
    if (infoOpen) {
      return;
    }

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
  }, [infoOpen, retryLocked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === "Escape") {
        setInfoOpen(false);
        return;
      }

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
      <Link href="/" className={styles.back} aria-label="Volver al inicio">
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

      <button
        type="button"
        className={styles.info}
          aria-label="Cómo jugar"
        onClick={() => setInfoOpen(true)}
      >
        ?
      </button>

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
            paused={infoOpen}
            flapId={flapId}
            sessionId={sessionId}
            onScore={setScore}
            onDead={handleDead}
            onSpecial={handleSpecial}
            onGold={handleGold}
          />
        </div>

        {status === "playing" ? (
          <div className={styles.score}>{score}</div>
        ) : null}

        {status === "ready" ? (
          <div className={`${styles.overlay} ${infoOpen ? styles.overlayHidden : ""}`}>
            <div className={styles.overlayTitle} />
            <div className={styles.overlayBottom}>
              <div className={styles.overlayHint}>
                <div>Atrapa las</div> <div style={{ paddingTop: "5px", whiteSpace: "nowrap", fontWeight: "bold", color: "", letterSpacing: "1px", textShadow: "1px 1px 3px #ff9900" }}>
                  semillas doradas 🟡 </div>
                    <div style={{ paddingTop: "5px", whiteSpace: "nowrap", display:"flex", justifyContent: "center", alignItems: "center", gap: "5px", letterSpacing: "1px", color: "#ff3333", textShadow: "1px 1px 1px #550000" }}>
                    y evita las rojas <div style={{transform: "rotate(45deg)"}}>🟥</div> </div>
              </div>
              {best > 0 ? (
                <div className={styles.best}>Récord {best}</div>
              ) : null}
              <div className={styles.overlayHintMute}>Clickea la pantalla <br /> para jugar</div>
            </div>
          </div>
        ) : null}

        {status === "dead" ? (
          <div
            className={`${styles.overlay} ${styles.overlayDead} ${
              infoOpen ? styles.overlayHidden : ""
            }`}
          >
            <div className={styles.overCard}>
              <div className={`${styles.overlayTitle} ${styles.overPulse}`}>
                ¡Perdiste!
              </div>
              <div className={`${styles.overScore} ${styles.revealOne}`}>
                {score}
              </div>
              <div className={`${styles.overScoreLabel} ${styles.revealOne}`}>
                Semillas
              </div>
              <div className={`${styles.best} ${styles.revealOne}`}>
                Récord {best}
              </div>
              <div className={`${styles.overFact} ${styles.revealTwo}`}>
                <div className={styles.overFactLabel}>Dato Curioso Guacamayístico</div>
                {fact}
              </div>
              <button
                type="button"
                className={`${styles.playAgain} ${styles.revealThree}`}
                disabled={retryLocked}
                onClick={(event) => {
                  event.stopPropagation();
                  flap();
                }}
              >
                Jugar de nuevo
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {infoOpen ? (
        <div className={styles.infoOverlay}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>Cómo jugar</div>
            <div className={styles.infoLead}>
              Clickea la pantalla o presiona espacio para volar. Agarra semillas sin tocar la
              isla.
            </div>

            <div className={styles.infoRow}>
              <span className={`${styles.seedDot} ${styles.seedGold}`} />
              <span>
                <b>Amarilla</b> +1 semilla, ++velocidad
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={`${styles.seedDot} ${styles.seedGreen}`} />
              <span>
                <b>Verde</b> +10 semillas, --velocidad
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={`${styles.seedBypiramid} ${styles.seedRed}`} />
              <span>
                <b>Roja</b> fin de juego
              </span>
            </div>
<hr style={{width: "100%", border: "1px solid #ffffff55", margin: "20px 0 0 0"}} />
            <div className={styles.infoLabel}>Importante</div>
            <div className={styles.infoLead}>
              <b>Evita caer en la isla o perderás el juego.</b>
            </div>

            <button
              type="button"
              className={styles.playAgain}
              onClick={() => setInfoOpen(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}

      <canvas ref={confettiCanvasRef} className={styles.confetti} />
    </div>
  );
}
