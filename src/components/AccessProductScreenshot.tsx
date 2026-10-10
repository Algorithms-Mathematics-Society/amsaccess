import { homeScreenshots, type HomeScreenshotKey } from "@/app/(marketing)/home-media";
import { ProductImage } from "./ProductImage";
import styles from "./AccessProductPreview.module.css";

export function AccessProductScreenshot({
  name,
  hero = false,
}: {
  name: HomeScreenshotKey;
  hero?: boolean;
}) {
  const media = homeScreenshots[name];
  if (!media.src) return null;
  return (
    <figure
      className={hero ? styles.heroFigure : styles.figure}
      data-home-screenshot={name}
    >
      {hero && (
        <div className={styles.frameHeader}>
          <span>ACCESS / CANDIDATE WORKSPACE</span>
          <span className={styles.frameDot} aria-hidden="true" />
        </div>
      )}
      <ProductImage
        {...media}
        src={media.src}
        priority={hero}
        sizes={hero
          ? "(max-width: 700px) calc(100vw - 58px), (max-width: 1208px) calc(100vw - 68px), 1140px"
          : "(max-width: 700px) calc(100vw - 84px), (max-width: 959px) calc(100vw - 96px), (max-width: 1208px) 65vw, 800px"}
      />
      <figcaption>{media.caption}</figcaption>
    </figure>
  );
}
