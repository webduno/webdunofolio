"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SNAIL_GOAL, STARFISH_GOAL, type CollectKind } from "./collectibles";
import { createControls } from "./controls";
import styles from "./page.module.css";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

const DRAG_THRESHOLD = 10;
const LOOK_SPEED = 0.0055;
const JUMP_COL = 1 / 3;
const WALK_BAND = 0.67;
const TAP_MOVE_TIME = 0.42;

type KeyMap = Record<string, boolean>;
type Intro = "start" | "controls" | "play";
type BottleState = "none" | "held" | "done";

export default function WorldExperience() {
  const controls = useRef(createControls());
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState<Intro>("start");
  const [infoOpen, setInfoOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [snails, setSnails] = useState(0);
  const [bottle, setBottle] = useState<BottleState>("none");
  const introRef = useRef<Intro>("start");
  introRef.current = intro;
  const infoOpenRef = useRef(false);
  infoOpenRef.current = infoOpen;
  const skipTapRef = useRef(false);
  const keys = useRef<KeyMap>({});
  const lookPointer = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    const prevHtmlTap = html.style.getPropertyValue("-webkit-tap-highlight-color");
    const prevBodyTap = body.style.getPropertyValue("-webkit-tap-highlight-color");
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.setProperty("-webkit-tap-highlight-color", "transparent");
    body.style.setProperty("-webkit-tap-highlight-color", "transparent");

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      html.style.setProperty("-webkit-tap-highlight-color", prevHtmlTap);
      body.style.setProperty("-webkit-tap-highlight-color", prevBodyTap);
    };
  }, []);

  const dismissHint = useCallback(() => {
    if (introRef.current === "controls") {
      setIntro("play");
    }
  }, []);

  const beginPlay = useCallback(() => {
    if (introRef.current === "start") {
      setIntro("controls");
    }
  }, []);

  const jump = useCallback(() => {
    if (infoOpenRef.current || introRef.current === "start") {
      return;
    }
    controls.current.jumpId += 1;
    dismissHint();
  }, [dismissHint]);

  const onCollect = useCallback((kind: CollectKind) => {
    if (kind === "starfish") {
      setStars((n) => n + 1);
      return;
    }
    if (kind === "snail") {
      setSnails((n) => n + 1);
      return;
    }
    if (kind === "bottle") {
      setBottle("held");
      return;
    }
    setBottle("done");
  }, []);

  const tapZone = useCallback(
    (clientX: number, clientY: number, target: HTMLDivElement) => {
      if (infoOpenRef.current || introRef.current === "start") {
        return;
      }

      const rect = target.getBoundingClientRect();
      const nx = (clientX - rect.left) / Math.max(rect.width, 1);
      const ny = (clientY - rect.top) / Math.max(rect.height, 1);
      const tapMove = controls.current.tapMove;
      tapMove.y = 1;
      tapMove.remaining = TAP_MOVE_TIME;
      dismissHint();

      if (ny >= WALK_BAND) {
        tapMove.x = 0;
        return;
      }

      jump();
      if (nx < JUMP_COL) {
        tapMove.x = -1;
      } else if (nx > 1 - JUMP_COL) {
        tapMove.x = 1;
      } else {
        tapMove.x = 0;
      }
    },
    [dismissHint, jump],
  );

  const syncKeys = useCallback(() => {
    const k = keys.current;
    const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const y = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    controls.current.move.x = x;
    controls.current.move.y = y;
    if (x !== 0 || y !== 0) {
      dismissHint();
    }
  }, [dismissHint]);

  useEffect(() => {
    const tracked = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];

    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "Escape") {
        setInfoOpen(false);
        return;
      }

      if (infoOpenRef.current) {
        return;
      }

      if (introRef.current === "start") {
        event.preventDefault();
        if (!event.repeat) {
          beginPlay();
        }
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) {
          jump();
        }
        return;
      }

      if (!tracked.includes(event.code)) {
        return;
      }

      event.preventDefault();
      keys.current[event.code] = true;
      syncKeys();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (!tracked.includes(event.code)) {
        return;
      }

      keys.current[event.code] = false;
      syncKeys();
    }

    function onBlur() {
      keys.current = {};
      syncKeys();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [beginPlay, jump, syncKeys]);

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

      {ready && intro === "play" ? (
        <div className={styles.hud} aria-label="Recogidos">
          <span>⭐ {stars}/{STARFISH_GOAL}</span>
          <span>🐌 {snails}/{SNAIL_GOAL}</span>
          <span>
            {bottle === "held" ? "🍾 → 🏠" : bottle === "done" ? "🍾 ✓" : "🍾 0/1"}
          </span>
        </div>
      ) : null}

      <div
        className={styles.stage}
        onPointerDown={(event) => {
          if (infoOpenRef.current || lookPointer.current) {
            return;
          }

          event.preventDefault();
          if (introRef.current === "start") {
            beginPlay();
            skipTapRef.current = true;
          } else {
            dismissHint();
          }
          lookPointer.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
            startY: event.clientY,
            dragging: false,
          };
        }}
        onPointerMove={(event) => {
          const look = lookPointer.current;
          if (!look || look.id !== event.pointerId) {
            return;
          }

          const dx = event.clientX - look.x;
          const dy = event.clientY - look.y;
          if (!look.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
          }

          look.dragging = true;
          controls.current.yawDelta -= dx * LOOK_SPEED;
          look.x = event.clientX;
          look.y = event.clientY;
        }}
        onPointerUp={(event) => {
          const look = lookPointer.current;
          if (!look || look.id !== event.pointerId) {
            return;
          }

          lookPointer.current = null;
          if (look.dragging) {
            skipTapRef.current = false;
            return;
          }

          if (skipTapRef.current) {
            skipTapRef.current = false;
            return;
          }

          tapZone(look.startX, look.startY, event.currentTarget);
        }}
        onPointerCancel={(event) => {
          if (lookPointer.current?.id === event.pointerId) {
            lookPointer.current = null;
          }
        }}
      >
        <div className={styles.canvasWrap}>
          <WorldCanvas
            controls={controls}
            onReady={() => setReady(true)}
            onCollect={onCollect}
            canCollect={intro !== "start" && !infoOpen}
          />
        </div>

        {!ready ? <div className={styles.loading}>Cargando restinga…</div> : null}

        {ready && intro === "start" ? (
          <div className={`${styles.overlay} ${infoOpen ? styles.overlayHidden : ""}`}>
            <div className={styles.overlayHintMute}>
              Clickea la pantalla
              <br />
              para jugar
            </div>
            <div className={styles.overlayBottom}>
              <div className={styles.overlayHint}>
                <div>Recoge ⭐ y 🐌</div>
                <div className={styles.overlayHintGoal}>Lleva 🍾 a 🏠</div>
              </div>
            </div>
          </div>
        ) : null}

        {ready && intro === "controls" && !infoOpen ? (
          <div className={styles.zones} aria-hidden="true">
            <div className={styles.zonesJump}>
              <div className={`${styles.zone} ${styles.zoneLeft}`}>
                <span>
                  jump
                  <br />
                  left
                </span>
              </div>
              <div className={`${styles.zone} ${styles.zoneCenter}`}>
                <span>
                  jump
                  <br />
                  forward
                </span>
              </div>
              <div className={`${styles.zone} ${styles.zoneRight}`}>
                <span>
                  jump
                  <br />
                  right
                </span>
              </div>
            </div>
            <div className={`${styles.zone} ${styles.zoneWalk}`}>
              <span>
                walk
                <br />
                forward
              </span>
            </div>
          </div>
        ) : null}

        {ready && intro === "controls" && !infoOpen ? (
          <div className={styles.hint}>
            <span className={styles.hintDesktop}>
              Espacio o click para volar · WASD para moverte
            </span>
          </div>
        ) : null}
      </div>

      {infoOpen ? (
        <div className={styles.infoOverlay}>
          <div className={styles.infoCard}>
            <div className={styles.infoTitle}>Cómo jugar</div>
            <div className={styles.infoLead}>
              Clickea la pantalla o presiona espacio para volar. Arrastra para mirar.
              WASD para moverte.
            </div>

            <div className={styles.infoRow}>
              <span>⭐</span>
              <span>
                <b>Estrella</b> recógela
              </span>
            </div>
            <div className={styles.infoRow}>
              <span>🐌</span>
              <span>
                <b>Caracol</b> recógelo
              </span>
            </div>
            <div className={styles.infoRow}>
              <span>🍾</span>
              <span>
                <b>Botella</b> un toque, llévala a 🏠
              </span>
            </div>
            <hr className={styles.infoRule} />
            <div className={styles.infoLabel}>Importante</div>
            <div className={styles.infoLead}>
              <b>La botella hay que devolverla a la cabaña del muelle.</b>
            </div>

            <button
              type="button"
              className={styles.infoDone}
              onClick={() => setInfoOpen(false)}
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
