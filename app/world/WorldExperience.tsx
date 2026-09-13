"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createControls } from "./controls";
import styles from "./page.module.css";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

const JOYSTICK_RADIUS = 44;
const DRAG_THRESHOLD = 10;
const LOOK_SPEED = 0.0055;

type KeyMap = Record<string, boolean>;

export default function WorldExperience() {
  const controls = useRef(createControls());
  const [ready, setReady] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const keys = useRef<KeyMap>({});
  const joystickPointer = useRef<number | null>(null);
  const lookPointer = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(
    null,
  );

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

  const jump = useCallback(() => {
    controls.current.jumpId += 1;
    setHintVisible(false);
  }, []);

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

  const updateJoystick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }

    controls.current.move.x = dx / JOYSTICK_RADIUS;
    controls.current.move.y = -dy / JOYSTICK_RADIUS;
    setKnob({ x: dx, y: dy, active: true });
    setHintVisible(false);
  }, []);

  const releaseJoystick = useCallback(() => {
    joystickPointer.current = null;
    controls.current.move.x = 0;
    controls.current.move.y = 0;
    setKnob({ x: 0, y: 0, active: false });
  }, []);

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

          jump();
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
            <span className={styles.hintTouch}>Toca para volar · Arrastra para mirar</span>
            <span className={styles.hintDesktop}>
              Espacio o click para volar · WASD para moverte
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`${styles.joystick} ${knob.active ? styles.joystickActive : ""}`}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          if (joystickPointer.current !== null) {
            return;
          }

          joystickPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateJoystick(event);
        }}
        onPointerMove={(event) => {
          if (joystickPointer.current !== event.pointerId) {
            return;
          }

          updateJoystick(event);
        }}
        onPointerUp={(event) => {
          if (joystickPointer.current !== event.pointerId) {
            return;
          }

          releaseJoystick();
        }}
        onPointerCancel={(event) => {
          if (joystickPointer.current !== event.pointerId) {
            return;
          }

          releaseJoystick();
        }}
      >
        <div
          className={styles.knob}
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
    </div>
  );
}
