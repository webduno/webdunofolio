import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./PageTitleBar.module.css";

type PageTitleBarProps = {
  title: string;
  backHref: string;
  backLabel: string;
  right?: ReactNode;
};

export default function PageTitleBar({
  title,
  backHref,
  backLabel,
  right,
}: PageTitleBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <Link href={backHref} className={styles.back} aria-label={backLabel}>
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
        <h1 className={styles.title}>{title}</h1>
      </div>
      {right ? <div className={styles.right}>{right}</div> : null}
    </div>
  );
}
