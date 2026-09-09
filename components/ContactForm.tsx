"use client";

import { FormEvent, useState } from "react";
import styles from "./ContactForm.module.css";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <p className={styles.thanks}>
        Message captured for this prototype. Backend wiring comes next.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input className={styles.field} name="name" placeholder="Name" required />
      <input
        className={styles.field}
        name="email"
        type="email"
        placeholder="Email"
        required
      />
      <textarea
        className={styles.message}
        name="message"
        placeholder="Message"
        required
      />
      <button className={styles.submit} type="submit">
        Send Message
      </button>
    </form>
  );
}
