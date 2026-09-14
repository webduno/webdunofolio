"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createControls } from "./controls";
import styles from "./page.module.css";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

const DRAG_THRESHOLD = 10;
const LOOK_SPEED = 0.0055;
const SIDE_ZONE = 0.24;
const TAP_MOVE_TIME = 0.42;

type KeyMap = Record<string, boolean>;

export default function WorldExperience() {
  const controls = useRef(createControls());
  const [ready, setReady] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const keys = useRef<KeyMap>({});
  const lookPointer = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
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

  const jump = useCallback(() => {
    controls.current.jumpId += 1;
    setHintVisible(false);
  }, []);

  const tapFly = useCallback(
    (clientX: number, target: HTMLDivElement) => {
      jump();
      const rect = target.getBoundingClientRect();
      const nx = (clientX - rect.left) / Math.max(rect.width, 1);
      const tapMove = controls.current.tapMove;
      tapMove.y = 1;
      tapMove.remaining = TAP_MOVE_TIME;
      if (nx < SIDE_ZONE) {
        tapMove.x = -1;
      } else if (nx > 1 - SIDE_ZONE) {
        tapMove.x = 1;
      } else {
        tapMove.x = 0;
      }
    },
    [jump],
  );

  const syncKeys = useCallback(() => {
    const k = keys.current;
    const x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const y = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    controls.current.move.x = x;
    controls.current.move.y = y;
    if (x !== 0 || y !== 0) {
      setHintVisible(false);
    }
  }, []);

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
  }, [jump, syncKeys]);

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

      <div
        className={styles.stage}
        onPointerDown={(event) => {
          if (lookPointer.current) {
            return;
          }

          event.preventDefault();
          lookPointer.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startX: event.clientX,
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
            return;
          }

          tapFly(look.startX, event.currentTarget);
        }}
        onPointerCancel={(event) => {
          if (lookPointer.current?.id === event.pointerId) {
            lookPointer.current = null;
          }
        }}
      >
        <div className={styles.canvasWrap}>
          <WorldCanvas controls={controls} onReady={() => setReady(true)} />
        </div>

        {!ready ? <div className={styles.loading}>Cargando restinga…</div> : null}

        {ready && hintVisible ? (
          <div className={styles.hint}>
            <span className={styles.hintTouch}>
              Toca para volar · Lados para girar · Arrastra para mirar
            </span>
            <span className={styles.hintDesktop}>
              Espacio o click para volar · WASD para moverte
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
