import { assessmentBrief } from "@/app/(marketing)/pricing/pricingData";
import styles from "@/app/(marketing)/pricing/page.module.css";

export function PricingBrief() {
  return (
    <section className={styles.section} aria-labelledby="assessment-brief">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>A useful starting point</p>
        <h2 id="assessment-brief">Tell us what you are planning.</h2>
        <p>
          A few sentences are enough to start. These details help us understand
          your assessment; a rough outline is enough.
        </p>
      </div>
      <dl className={styles.brief}>
        {assessmentBrief.map((item) => (
          <div key={item.title}>
            <dt>{item.title}</dt>
            <dd>{item.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
