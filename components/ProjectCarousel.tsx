import Image from "next/image";
import type { Project } from "@/lib/projects";
import styles from "./ProjectCarousel.module.css";

const viewClass = {
  green: styles.viewGreen,
  orange: styles.viewOrange,
  blue: styles.viewBlue,
};

type ProjectCarouselProps = {
  projects: Project[];
};

export default function ProjectCarousel({ projects }: ProjectCarouselProps) {
  if (projects.length === 0) {
    return <p className={styles.empty}>No projects in this filter yet.</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        {projects.map((project) => (
          <article
            key={project.id}
            className={`${styles.card} ${styles[project.glow]}`}
          >
            <h2 className={styles.title}>{project.title}</h2>
            <p className={styles.stack}>{project.stack}</p>
            <div className={styles.thumb}>
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes="(max-width: 899px) 74vw, 280px"
              />
            </div>
            <div className={styles.actions}>
              <a
                className={styles.source}
                href={project.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source Code
              </a>
              <a
                className={`${styles.view} ${viewClass[project.glow]}`}
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
              >
                Enter Project
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
