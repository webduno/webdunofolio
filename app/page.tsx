import Header from "@/components/Header";
import LandingHero from "./LandingHero";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <Header />
      <LandingHero />
    </main>
  );
}
