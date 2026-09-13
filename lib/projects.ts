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
    id: "openworld",
    title: "3D Open World",
    stack: "Three.js, Blockchain Game",
    glow: "blue",
    category: "games",
    image: "/images/opet.png",
    source: "https://github.com/webduno",
    live: "https://webduno.com/opet/test",
  },
  {
    id: "study",
    title: "Study Taxi",
    stack: "Next.js, Duolingo Style Quizzes",
    glow: "green",
    category: "apps",
    image: "/images/study.png",
    source: "https://github.com/webduno",
    live: "https://studytaxi.vercel.app",
  },
  {
    id: "wtrade",
    title: "WTrade",
    stack: "Trading Dashboard",
    glow: "blue",
    category: "apps",
    image: "/images/wtrade.gif",
    source: "https://github.com/webduno",
    live: "https://wtrade.vercel.app",
  },
  {
    id: "tech-landing",
    title: "Tech Landing",
    stack: "SPA Tech Landing Page",
    glow: "green",
    category: "apps",
    image: "/images/landing.png",
    source: "https://github.com/webduno",
    live: "https://irecovery.vercel.app/",
  },
  {
    id: "structurebuilder",
    title: "3D Structure Builder",
    stack: "Three.js, React",
    glow: "green",
    category: "apps",
    image: "/images/buildertool.png",
    source: "https://github.com/webduno",
    live: "https://duno.vercel.app/builder",
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
    id: "bodymaker",
    title: "BodyMaker",
    stack: "Virtual Model Posing Simulator App",
    glow: "orange",
    category: "apps",
    image: "/images/bodymaker.png",
    source: "https://github.com/webduno",
    live: "https://mylady.vercel.app/",
  },
  {
    id: "remoview",
    title: "Remove Viewing Training Tool",
    stack: "Next.js, React",
    glow: "blue",
    category: "apps",
    image: "/images/remoview.png",
    source: "https://github.com/webduno",
    live: "https://removeview.vercel.app/",
  },
];
