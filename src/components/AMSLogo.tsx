import Image from "next/image";

type AMSLogoProps = {
  compact?: boolean;
  size?: "default" | "nav";
};

export function AMSLogo({ compact = false, size = "default" }: AMSLogoProps) {
  const logoSize = size === "nav" ? "h-8 w-[8.8rem]" : "h-10 w-44";
  const compactSize = size === "nav" ? "h-8 w-11" : "h-10 w-14";

  return (
    <div className="flex items-center" aria-label="AMS Access">
      <div className={`${compact ? compactSize : logoSize} overflow-hidden`}>
        <Image
          src="/AMS_ACCESS.svg"
          width={176}
          height={40}
          alt=""
          aria-hidden="true"
          className={compact ? `${logoSize} max-w-none` : logoSize}
        />
      </div>
    </div>
  );
}
