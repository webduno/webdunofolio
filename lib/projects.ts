export type ProjectGlow = "orange" | "green" | "blue";
export type ProjectCategory = "games" | "apps";

export type Project = {
  id: string;
  title: string;
  stack: string;
  glow: ProjectGlow;
  category: ProjectCategory;
  image: string;
  source: string;
  live: string;
};

export const PROJECTS: Project[] = [
  {
    id: "taskflow",
    title: "TaskFlow API",
    stack: "GoLang, PostgreSQL, Docker",
    glow: "green",
    category: "apps",
    image: "/images/mainisland.png",
    source: "https://github.com/webduno",
    live: "https://wtrade.vercel.app",
  },
  {
    id: "dunoverse",
    title: "DunoVerse 3D",
    stack: "Three.js, React, Node.js",
    glow: "orange",
    category: "games",
    image: "/images/mainisland.png",
    source: "https://github.com/webduno",
    live: "https://margaritar.vercel.app/",
  },
  {
    id: "cloudmetrics",
    title: "CloudMetrics Dashboard",
    stack: "Vue.js, AWS, D3.js",
    glow: "blue",
    category: "apps",
    image: "/images/mainisland.png",
    source: "https://github.com/webduno",
    live: "https://studytaxi.vercel.app",
  },
  {
    id: "marina",
    title: "Marina Run",
    stack: "Three.js, React",
    glow: "orange",
    category: "games",
    image: "/images/marina.png",
    source: "https://github.com/webduno",
    live: "https://margaritar.vercel.app/",
  },
  {
    id: "study",
    title: "Study Taxi",
    stack: "Next.js, Quizzes",
    glow: "green",
    category: "apps",
    image: "/images/study.png",
    source: "https://github.com/webduno",
    live: "https://studytaxi.vercel.app",
  },
  {
    id: "openworld",
    title: "3D Open World",
    stack: "Three.js, Blockchain",
    glow: "blue",
    category: "games",
    image: "/images/opet.png",
    source: "https://github.com/webduno",
    live: "https://webduno.com/opet/test",
  },
];
