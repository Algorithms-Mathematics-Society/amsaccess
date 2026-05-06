import Image from "next/image";

type AMSLogoProps = {
  compact?: boolean;
};

export function AMSLogo({ compact = false }: AMSLogoProps) {
  return (
    <div className="flex items-center" aria-label="AMS Access">
      <div className={compact ? "h-10 w-14 overflow-hidden" : "h-10 w-44 overflow-hidden"}>
        <Image
          src="/AMS_ACCESS.svg"
          width={176}
          height={40}
          alt=""
          aria-hidden="true"
          className={compact ? "h-10 w-44 max-w-none" : "h-10 w-44"}
        />
      </div>
    </div>
  );
}
