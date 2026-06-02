import { ProctorNetwork } from "./ProctorNetwork";

interface DarkSectionProps {
  children: React.ReactNode;
  /** Extra Tailwind classes — use for py, rounding, z-index overrides */
  className?: string;
  /** Show the ambient purple glow (default true) */
  glow?: boolean;
}

/**
 * Global dark-canvas section.
 * Provides bg-ams-dark + ProctorNetwork interactive overlay + optional glow.
 * Drop anywhere a dark CTA / hero band is needed.
 */
export function DarkSection({ children, className = "", glow = true }: DarkSectionProps) {
  return (
    <section
      className={`relative overflow-hidden text-white ${className}`}
      style={{ backgroundColor: "rgb(var(--ams-dark))" }}
    >
      <ProctorNetwork />

      {glow && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[360px] w-[800px] rounded-full bg-purple-600/10 blur-[120px]" />
        </div>
      )}

      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
