import Image from "next/image";
import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Image
          src="/favicon-32x32.png"
          alt="webduno island logo"
          width={32}
          height={32}
          className={styles.logo}
          priority
        />
        <span>webduno.com</span>
      </Link>
    </header>
  );
}
