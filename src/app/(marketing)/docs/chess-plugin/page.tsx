import Link from "next/link";

const sampleYaml = `board:\n  width: 8\n  height: 8\npieces:\n  - id: king\n    color: white\n  - id: king\n    color: black\nportals:\n  - from: [2,2]\n    to: [6,6]\n`;

export default function ChessPluginDocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-white">
      <h1 className="text-3xl font-semibold tracking-tight">Chess Plugin Docs</h1>
      <p className="mt-2 text-sm text-zinc-400">Dedicated CHESS contest mode for AMS with YAML-defined rulesets and live test-play.</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Quick Start</h2>
        <ol className="list-decimal pl-5 text-sm text-zinc-300 space-y-1">
          <li>Create contest with <code>plugin_type=CHESS</code>.</li>
          <li>Create ruleset in <code>/org/chess/rulesets</code>.</li>
          <li>Validate ruleset and open test-play.</li>
          <li>Start session and submit moves through test-play APIs.</li>
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">YAML DSL Skeleton</h2>
        <pre className="rounded-xl border border-white/10 bg-black/40 p-4 text-xs overflow-auto">{sampleYaml}</pre>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">Core Endpoints</h2>
        <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
          <li><code>POST /org/chess/rulesets</code></li>
          <li><code>POST /org/chess/rulesets/{"{rulesetID}"}/validate</code></li>
          <li><code>POST /org/contests/{"{id}"}/chess/testplay/session</code></li>
          <li><code>POST /org/contests/{"{id}"}/chess/testplay/move</code></li>
          <li><code>GET /org/contests/{"{id}"}/chess/testplay/state</code></li>
          <li><code>GET /org/contests/{"{id}"}/chess/testplay/events</code></li>
        </ul>
      </section>

      <div className="mt-10">
        <Link href="/docs" className="text-sm text-purple-300 hover:text-purple-200">Back to Docs</Link>
      </div>
    </main>
  );
}
