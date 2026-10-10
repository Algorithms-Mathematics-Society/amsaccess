"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "./Contact.module.css";

const topics = [
  {
    value: "Sales",
    label: "Plan an assessment",
    detail: "New teams & partnerships",
    icon: Users,
    title: "Tell us about your assessment.",
    intro:
      "Describe the round you want to run and any questions about pricing, setup, or review.",
    hint: "What kind of assessment are you planning? Include your timeline or any questions, if you know them.",
    email: "sales@amsaccess.com",
  },
  {
    value: "Support",
    label: "Get product help",
    detail: "Existing teams & users",
    icon: MessageSquare,
    title: "Describe the problem.",
    intro:
      "Include what you were trying to do, what happened, and any error message you saw.",
    hint: "What were you trying to do, and what happened instead? You can include your device and any visible error message.",
    email: "support@amsaccess.com",
  },
  {
    value: "Security",
    label: "Security & privacy",
    detail: "Questions & concerns",
    icon: ShieldCheck,
    title: "Send your question or concern.",
    intro:
      "Ask about permissions, data handling, or a security concern. Include a brief description without private information.",
    hint: "What would you like to understand or report? Leave out passwords, access tokens, and private assessment material.",
    email: "security@amsaccess.com",
  },
] as const;
type Topic = (typeof topics)[number]["value"];

export function ContactForm() {
  const [category, setCategory] = useState<Topic>("Sales");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const busy = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const topic = topics.find((item) => item.value === category)!;

  useEffect(() => {
    if (status === "sent" || error) feedback.current?.focus();
  }, [status, error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !message) {
      setError(
        "Please add your name and a short message. Your details are still here.",
      );
      return;
    }
    busy.current = true;
    setError("");
    setStatus("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name,
          email,
          message,
          category,
          organization: String(data.get("organization") || "").trim(),
          expectedRoundVolume:
            category === "Sales"
              ? String(data.get("expectedRoundVolume") || "Not sure yet")
              : "Not sure yet",
          _hp: String(data.get("_hp") || ""),
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Please wait a moment before trying again. Your message is still here, or you can email us directly."
            : "We couldn’t confirm your message was sent. Your details are still here. Try again or email us directly.",
        );
        setStatus("idle");
        return;
      }
      const result = await response.json();
      if (result?.ok !== true || result?.data?.delivered !== true)
        throw new Error("Unconfirmed submission");
      setSentEmail(email);
      form.reset();
      setStatus("sent");
    } catch {
      setError(
        "We couldn’t confirm your message was sent. Your details are still here. Check your connection, try again, or email us directly.",
      );
      setStatus("idle");
    } finally {
      window.clearTimeout(timeout);
      busy.current = false;
    }
  }

  return (
    <div className={styles.contactArea}>
      <form
        ref={formRef}
        onSubmit={submit}
        className={styles.contactForm}
        aria-label="Contact Access"
        aria-busy={status === "sending"}
      >
        <fieldset
          className={styles.topics}
          disabled={status === "sending" || status === "sent"}
        >
          <legend>How can we help?</legend>
          <div className={styles.topicGrid}>
            {topics.map(({ value, label, detail, icon: Icon }) => (
              <label className={styles.topic} key={value}>
                <input
                  type="radio"
                  name="category"
                  value={value}
                  checked={category === value}
                  onChange={() => {
                    setCategory(value);
                    setError("");
                  }}
                />
                <span className={styles.topicContent}>
                  <span className={styles.topicTop}>
                    <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
                    <span className={styles.radioMark} />
                  </span>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.conversation}>
          <aside
            className={styles.context}
            aria-labelledby="contact-context-title"
          >
            <p className={styles.eyebrow}>Your enquiry</p>
            <h2 id="contact-context-title">{topic.title}</h2>
            <p>{topic.intro}</p>
            {category === "Support" && (
              <div className={styles.contextNote}>
                In a live assessment? Contact your organizer for round-specific
                help. This form is not a live support channel.
              </div>
            )}
            {category === "Security" && (
              <Link className={styles.inlineLink} href="/security">
                Explore security & privacy{" "}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            )}
            <div className={styles.nextSteps}>
              <h3>What happens next</h3>
              <ol>
                <li>
                  <span>01</span>
                  <p>Your message is sent to the Access team.</p>
                </li>
                <li>
                  <span>02</span>
                  <p>Any follow-up will go to the email address you share.</p>
                </li>
              </ol>
            </div>
            <div className={styles.direct}>
              <p>Prefer email?</p>
              <a href={"mailto:" + topic.email}>
                {topic.email}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </aside>

          <div className={styles.formPanel}>
            {status === "sent" ? (
              <div
                className={styles.success}
                ref={feedback}
                tabIndex={-1}
                role="status"
              >
                <span className={styles.successIcon}>
                  <Check size={24} aria-hidden="true" />
                </span>
                <p className={styles.eyebrow}>Message sent</p>
                <h2>Thank you for your message.</h2>
                <p>
                  Your enquiry is on its way to the team. Any follow-up will go
                  to <strong>{sentEmail}</strong>.
                </p>
                <p>There’s no need to send it again.</p>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setStatus("idle");
                    setSentEmail("");
                    requestAnimationFrame(() =>
                      formRef.current
                        ?.querySelector<HTMLInputElement>("[name=name]")
                        ?.focus(),
                    );
                  }}
                >
                  Send another message{" "}
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <>
                <div className={styles.formHeading}>
                  <h2>Your message</h2>
                  <span>Only three required fields.</span>
                </div>
                <fieldset
                  className={styles.fields}
                  disabled={status === "sending"}
                >
                  <legend className={styles.srOnly}>
                    Your contact details and message
                  </legend>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="contact-name">Name</label>
                      <input
                        id="contact-name"
                        name="name"
                        autoComplete="name"
                        maxLength={120}
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="contact-email">Email</label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={180}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="contact-organization">
                        Organization <span>Optional</span>
                      </label>
                      <input
                        id="contact-organization"
                        name="organization"
                        autoComplete="organization"
                        maxLength={160}
                      />
                    </div>
                    <div className={styles.field} hidden={category !== "Sales"}>
                      <label htmlFor="contact-volume">
                        Candidates per round <span>Optional</span>
                      </label>
                      <select
                        id="contact-volume"
                        name="expectedRoundVolume"
                        defaultValue="Not sure yet"
                      >
                        <option>Not sure yet</option>
                        <option value="< 100">Fewer than 100</option>
                        <option value="100-1,000">100–1,000</option>
                        <option value="1,000+">More than 1,000</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="contact-message">Message</label>
                    <p id="message-hint" className={styles.fieldHint}>
                      {topic.hint}
                    </p>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      maxLength={4000}
                      required
                      aria-describedby="message-hint message-safety"
                    />
                    <p id="message-safety" className={styles.safety}>
                      Please don’t include passwords, candidate records, or
                      confidential assessment content.
                    </p>
                  </div>
                  <div className={styles.honeypot} aria-hidden="true">
                    <label htmlFor="contact-website">
                      Leave this field empty
                    </label>
                    <input
                      id="contact-website"
                      name="_hp"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                </fieldset>
                {error && (
                  <div
                    className={styles.error}
                    role="alert"
                    ref={feedback}
                    tabIndex={-1}
                  >
                    <p>{error}</p>
                    <a href={"mailto:" + topic.email}>
                      Email {topic.email}{" "}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </a>
                  </div>
                )}
                <div className={styles.submitRow}>
                  <button
                    className={styles.primaryButton}
                    type="submit"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? (
                      <>
                        Sending…{" "}
                        <Loader2
                          className={styles.spinner}
                          size={16}
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      <>
                        Send message <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p>
                    Your details help us handle your enquiry and reply by email.
                    <br />
                    <Link href="/privacy#information">
                      Read the privacy draft
                    </Link>
                  </p>
                </div>
                <span className={styles.srOnly} role="status">
                  {status === "sending"
                    ? "Sending your message. Please wait."
                    : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
