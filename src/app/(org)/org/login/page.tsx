"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Field } from "@astryxdesign/core/Field";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading, Text } from "@astryxdesign/core/Text";
import { List, ListItem } from "@astryxdesign/core/List";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { OrgAstryxTheme } from "@/components/org/OrgAstryxTheme";
import { ACCESS_DOWNLOAD_URL } from "@/lib/product-links";
import { apiFetch } from "@/lib/client/apiClient";
import styles from "./login.module.css";

const workspaceSteps = [
  { title: "Prepare the round", description: "Set up questions, instructions and the assessment schedule." },
  { title: "Manage participants", description: "Organize your roster and share candidate access details." },
  { title: "Review submissions", description: "Open results and examine individual attempts." },
];

export default function OrgLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      await apiFetch<{ user: unknown }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // `next` lets a redirect-to-login return you where you were.
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") ? next : "/org/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page} data-access-marketing data-access-theme>
      <MarketingHeader />
      <OrgAstryxTheme>
        <main id="org-login-content" className={styles.content} tabIndex={-1} data-org-login>
          <VStack as="section" gap={6} className={styles.formRegion} aria-labelledby="org-login-title">
            <VStack gap={3}>
              <Text type="supporting" className={styles.eyebrow}>Organization workspace</Text>
              <Heading level={1} id="org-login-title" className={styles.title}>Organizer sign in</Heading>
              <Text color="secondary">
                Use your organization email and password to open your workspace.
              </Text>
            </VStack>

            <form onSubmit={handleLogin} aria-busy={loading} data-org-login-form>
              <VStack gap={5}>
                <Field label="Email" inputID="org-email" width="100%">
                  <HStack className={styles.fieldControl} align="center" gap={0}>
                    <input
                      id="org-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@organization.com"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-describedby={error ? "org-login-error" : undefined}
                      className={styles.fieldInput}
                    />
                  </HStack>
                </Field>

                <Field label="Password" inputID="org-password" width="100%">
                  <HStack className={styles.fieldControl} align="center" gap={0}>
                    <input
                      id="org-password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-describedby={error ? "org-login-error" : undefined}
                      className={styles.fieldInput}
                    />
                    <Button
                      type="button"
                      label={showPwd ? "Hide" : "Show"}
                      aria-label={showPwd ? "Hide password" : "Show password"}
                      aria-controls="org-password"
                      aria-pressed={showPwd}
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPwd((value) => !value)}
                      className={styles.passwordToggle}
                    />
                  </HStack>
                </Field>

                {error && (
                  <Banner id="org-login-error" status="error" role="alert" title={error} className={styles.error} />
                )}

                <Button
                  type="submit"
                  label={loading ? "Signing in..." : "Sign in"}
                  variant="primary"
                  size="lg"
                  width="100%"
                  isDisabled={loading}
                  isLoading={loading}
                  className={styles.submit}
                />
              </VStack>
            </form>

            <VStack gap={3}>
              <Divider />
              <Text type="supporting" color="secondary">Need help accessing your organization?</Text>
              <Link href="/contact" className={styles.textLink}>
                Contact the team <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </VStack>
          </VStack>

          <VStack as="aside" gap={6} className={styles.guidance} aria-labelledby="workspace-title">
            <VStack gap={2}>
              <Heading level={2} id="workspace-title" className={styles.guidanceTitle}>Your assessment workspace</Heading>
              <Text color="secondary">From preparing a round to reviewing the work.</Text>
            </VStack>
            <List hasDividers density="spacious" listStyle="decimal" aria-label="Organizer workflow">
              {workspaceSteps.map((step) => (
                <ListItem key={step.title} label={step.title}
                  description={<Text type="supporting">{step.description}</Text>}
                  className={styles.step} />
              ))}
            </List>
            <VStack gap={2} className={styles.candidateHelp}>
              <Text weight="medium">Taking an assessment?</Text>
              <Text type="supporting" color="secondary">
                Candidates sign in inside the Access desktop app using their organizer’s instructions.
              </Text>
              <a href={ACCESS_DOWNLOAD_URL} className={styles.textLink}>
                Download Access <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </VStack>
          </VStack>
        </main>
      </OrgAstryxTheme>
      <MarketingFooter />
    </div>
  );
}
