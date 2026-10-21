"use client";

import { FormEvent, useState } from "react";
import styles from "./contact.module.css";

export function ContactForm() {
  const [status, setStatus] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);

    setStatus("Your email app should open with a draft ready to review and send.");
    window.location.href = `mailto:me@joshking.me?subject=${subject}&body=${body}`;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="contact-name">Name</label>
        <input autoComplete="name" id="contact-name" name="name" placeholder="Your name" required type="text" />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-email">Email</label>
        <input
          autoComplete="email"
          id="contact-email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          maxLength={3000}
          name="message"
          placeholder="What are you hoping to make or improve?"
          required
          rows={6}
        />
      </div>

      <div className={styles.formFooter}>
        <p className={styles.formNote}>This prepares a draft in your email app.</p>
        <button type="submit">
          Send message
          <svg aria-hidden="true" viewBox="0 0 18 18">
            <path d="M3 9h12M10 4l5 5-5 5" />
          </svg>
        </button>
      </div>
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </form>
  );
}
