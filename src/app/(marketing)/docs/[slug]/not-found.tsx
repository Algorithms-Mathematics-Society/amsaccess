import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "../docs.module.css";
export default function GuideNotFound() {
  return (
    <div className={styles.notFound}>
      <p className={styles.eyebrow}>Access documentation</p>
      <h1>Let’s find the right guide.</h1>
      <p>
        This guide is not available at this address. Browse the documentation to
        find your next step.
      </p>
      <Link href="/docs">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all guides
      </Link>
    </div>
  );
}
