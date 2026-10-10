import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Info,
} from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { productMedia } from "../../product/product-media";
import { ACCESS_APP_URL } from "@/lib/product-links";
import { guides, getGuide, audienceLabels } from "../guides";
import styles from "../docs.module.css";

function GuideText({ text }: { text: string }) {
  return text.split("app.amsaccess.com").map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <a href={ACCESS_APP_URL}>app.amsaccess.com</a>}
      {part}
    </Fragment>
  ));
}

export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide
    ? { title: guide.title + " — Access docs", description: guide.description }
    : { title: "Guide not found — Access docs" };
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const next = getGuide(guide.next)!;
  const contents = (
    <ol>
      {guide.sections.map((section) => (
        <li key={section.id}>
          <a href={"#" + section.id}>{section.title}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className={styles.articleLayout} data-docs-guide={guide.slug}>
      <article className={styles.article}>
        <Link href="/docs" className={styles.backLink}>
          <ArrowLeft size={14} aria-hidden="true" />
          All guides
        </Link>
        <header className={styles.articleHeader}>
          <p className={styles.eyebrow}>
            {audienceLabels[guide.audience]} / Guide
          </p>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
        </header>
        <details className={styles.mobileContents}>
          <summary>
            On this page <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <nav aria-label="On this page for mobile">{contents}</nav>
        </details>
        <aside className={styles.beforeNote}>
          <Info size={18} aria-hidden="true" />
          <div>
            <h2>Before you begin</h2>
            <p>{guide.before}</p>
          </div>
        </aside>
        {guide.sections.map((section) => (
          <section
            className={styles.articleSection}
            id={section.id}
            key={section.id}
            aria-labelledby={section.id + "-title"}
          >
            <h2 id={section.id + "-title"}>{section.title}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p}>
                <GuideText text={p} />
              </p>
            ))}
            {section.steps && (
              <ol className={styles.steps}>
                {section.steps.map((step, i) => (
                  <li key={step.title}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {i + 1}
                    </span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>
                        <GuideText text={step.body} />
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {section.bullets && (
              <ul className={styles.bullets}>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.screenshot && (() => {
              const media = productMedia[section.screenshot];
              return media.src ? (
                <figure className={styles.guideScreenshot}>
                  <ProductImage {...media} src={media.src} sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1100px) 70vw, 720px" />
                  <figcaption>{media.caption}</figcaption>
                </figure>
              ) : null;
            })()}
            {section.note && (
              <aside className={styles.articleNote}>
                <h3>{section.note.title}</h3>
                <p>{section.note.body}</p>
              </aside>
            )}
          </section>
        ))}
        <div className={styles.guideEnd}>
          <span>Continue with</span>
          <Link href={"/docs/" + next.slug}>
            {next.title}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.articleHelp}>
          <h2>Still need help?</h2>
          <p>
            {guide.audience === "candidates"
              ? "Contact your assessment organizer for invitation, timing, or in-round support. For other questions, contact the Access team."
              : "Contact the Access team to discuss your assessment setup or a question these guides have not answered."}
          </p>
          <div>
            <Link href="/contact">
              General enquiries <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <a href={ACCESS_APP_URL}>
              App access <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </article>
      <aside className={styles.contents}>
        <nav aria-label="On this page">
          <p>On this page</p>
          {contents}
        </nav>
        <div className={styles.contentsHelp}>
          <p>App access & downloads</p>
          <a href={ACCESS_APP_URL}>
            Open Access <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </aside>
    </div>
  );
}
