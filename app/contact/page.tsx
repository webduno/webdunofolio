import Header from "@/components/Header";
import ContactForm from "@/components/ContactForm";
import PageTitleBar from "@/components/PageTitleBar";
import Image from "next/image";
import styles from "./page.module.css";

function SocialIcons() {
  return (
    <span className={styles.social}>
      <a
        href="https://www.linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.44v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22 2H2C.9 2 0 2.9 0 4v16c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </a>
      <a
        href="https://github.com/webduno"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 10.39.6.11.82-.26.82-.58 0-.28-.01-1.02-.02-2-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.22.7.82.58A10.99 10.99 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
        </svg>
      </a>
    </span>
  );
}

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <Header />
      <PageTitleBar
        title="LET'S BUILD"
        backHref="/"
        backLabel="Back to home"
        right={<SocialIcons />}
      />

      <section className={styles.stage}>
        <Image
          src="/images/mainisland.png"
          alt="Floating island"
          width={500}
          height={500}
          className={styles.island}
          priority
        />
        <div className={styles.formWrap}>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
