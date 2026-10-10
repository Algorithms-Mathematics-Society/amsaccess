import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  homeScreenshots,
  type HomeScreenshotKey,
} from "@/app/(marketing)/home-media";
import styles from "./AccessProductPreview.module.css";

export function AccessProductScreenshot({
  name,
  hero = false,
}: {
  name: HomeScreenshotKey;
  hero?: boolean;
}) {
  const media = homeScreenshots[name];
  return (
    <figure
      className={hero ? styles.heroFigure : styles.figure}
      data-home-screenshot={name}
    >
      {hero && (
        <div className={styles.frameHeader}>
          <span>ACCESS / REVIEW WORKSPACE</span>
          <span className={styles.frameDot} aria-hidden="true" />
        </div>
      )}
      <div className={styles.imageSpace}>
        {media.src ? (
          <Image
            src={media.src}
            alt={media.alt}
            fill
            priority={hero}
            sizes={
              hero
                ? "(max-width: 700px) calc(100vw - 48px), (max-width: 1208px) 46vw, 540px"
                : "(max-width: 700px) calc(100vw - 48px), (max-width: 1208px) 65vw, 830px"
            }
            className={styles.screenshot}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>
              <ImageIcon size={25} strokeWidth={1.25} aria-hidden="true" />
            </span>
            <strong>{media.title}</strong>
            <span>Screenshot to be added</span>
          </div>
        )}
      </div>
      <figcaption>
        <span>{media.caption}</span>
        <span className={styles.surface}>{media.surface}</span>
      </figcaption>
    </figure>
  );
}
