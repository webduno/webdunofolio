"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { PROJECTS, type ProjectCategory } from "@/lib/projects";
import PageTitleBar from "@/components/PageTitleBar";
import ProjectCarousel from "@/components/ProjectCarousel";
import styles from "./ProjectsExperience.module.css";

type Filter = "all" | ProjectCategory;

export default function ProjectsExperience() {
  const [filter, setFilter] = useState<Filter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const projects = useMemo(() => {
    if (filter === "all") {
      return PROJECTS;
    }

    return PROJECTS.filter((project) => project.category === filter);
  }, [filter]);

  return (
    <div className={styles.page}>
      <span className={`${styles.spark} ${styles.spark1}`} />
      <span className={`${styles.spark} ${styles.spark2}`} />
      <span className={`${styles.spark} ${styles.spark3}`} />

      <PageTitleBar
        title="PROJECTS"
        backHref="/"
        backLabel="Back to home"
        right={
          <>
            <button
              className={styles.filterBtn}
              onClick={() => setShowFilters((open) => !open)}
              type="button"
            >
              Filters
            </button>
            {showFilters ? (
              <div className={styles.panel}>
                <button
                  className={`${styles.chip} ${filter === "all" ? styles.chipActive : ""}`}
                  onClick={() => setFilter("all")}
                  type="button"
                >
                  All
                </button>
                <button
                  className={`${styles.chip} ${filter === "games" ? styles.chipActive : ""}`}
                  onClick={() => setFilter("games")}
                  type="button"
                >
                  Games
                </button>
                <button
                  className={`${styles.chip} ${filter === "apps" ? styles.chipActive : ""}`}
                  onClick={() => setFilter("apps")}
                  type="button"
                >
                  Apps
                </button>
              </div>
            ) : null}
          </>
        }
      />

      <div className={styles.scene}>
        <ProjectCarousel projects={projects} />
      </div>

      <Image
        src="/images/mainislanddark.png"
        alt=""
        width={500}
        height={500}
        className={styles.island}
      />
    </div>
  );
}
