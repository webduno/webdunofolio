"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PROJECTS } from "@/lib/projects";
import styles from "./PortfolioModal.module.css";

type PortfolioModalProps = {
  onClose: () => void;
};

export default function PortfolioModal({ onClose }: PortfolioModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKey);
    document.body.classList.add("portfolio-open");

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("portfolio-open");
    };
  }, [onClose]);

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-title"
    >
      <div
        className={styles.content}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="portfolio-title" className={styles.title}>
            Portfolio
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close portfolio"
          >
            ×
          </button>
        </div>
        <ul className={styles.list}>
          {PROJECTS.map((project) => (
            <li key={project.id} className={styles.item}>
              <a
                className={styles.name}
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.title}
              </a>
              <span className={styles.stack}>{project.stack}</span>
              <a
                className={styles.source}
                href={project.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
