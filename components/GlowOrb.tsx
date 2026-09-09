import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import styles from "./GlowOrb.module.css";

type GlowOrbProps = {
  href?: string;
  label?: string;
  color: "orange" | "green" | "blue";
  size?: "sm" | "md" | "lg";
  external?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  className?: string;
  floatDelay?: number;
  floatDuration?: number;
  floatPaused?: boolean;
};

export default function GlowOrb({
  href,
  label,
  color,
  size = "md",
  external,
  onClick,
  children,
  className,
  floatDelay = 0,
  floatDuration = 3.6,
  floatPaused = false,
}: GlowOrbProps) {
  const orbClass = [styles.orb, styles[color], styles[size]]
    .filter(Boolean)
    .join(" ");
  const wrapClass = [styles.floatWrap, floatPaused ? styles.paused : "", className]
    .filter(Boolean)
    .join(" ");
  const content = children ?? label;

  let inner: ReactNode;

  if (onClick) {
    inner = (
      <button type="button" className={orbClass} onClick={onClick}>
        {content}
      </button>
    );
  } else if (!href) {
    inner = <div className={orbClass}>{content}</div>;
  } else if (external) {
    inner = (
      <a
        href={href}
        className={orbClass}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  } else {
    inner = (
      <Link href={href} className={orbClass}>
        {content}
      </Link>
    );
  }

  return (
    <div
      className={wrapClass}
      style={{
        animationDelay: `${floatDelay}s`,
        animationDuration: `${floatDuration}s`,
      }}
    >
      {inner}
    </div>
  );
}
