"use client";

import { FormEvent, useState } from "react";
import styles from "./ContactForm.module.css";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!name || !message) {
      setError("Please fill in your name and a message.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/supabase/dev_issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: name,
          content: message,
          player_id: email,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError("Something went wrong sending your message. Try again.");
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("Error sending contact message:", err);
      setError("Something went wrong sending your message. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className={styles.thanks}>
        Mensaje enviado. Gracias por contactarme — me pondré en contacto contigo pronto.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input className={styles.field} name="name" placeholder="Nombre" required />
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
        placeholder="Mensaje"
        required
      />
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
