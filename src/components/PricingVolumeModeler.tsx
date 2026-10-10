import { assessmentOptions } from "@/app/(marketing)/pricing/pricingData";
import styles from "@/app/(marketing)/pricing/page.module.css";

export function PricingOptions() {
  return (
    <section className={styles.section} aria-labelledby="pricing-options">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>Assessment types</p>
        <h2 id="pricing-options">What are you planning?</h2>
        <p>
          Use these examples to describe your assessment. You do not need to
          select a plan to ask about pricing.
        </p>
      </div>
      <div className={styles.options}>
        {assessmentOptions.map((option) => (
          <article key={option.name} className={styles.option}>
            <p className={styles.optionName}>{option.name}</p>
            <h3>{option.audience}</h3>
            <p>{option.description}</p>
            <p className={styles.detail}>{option.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
