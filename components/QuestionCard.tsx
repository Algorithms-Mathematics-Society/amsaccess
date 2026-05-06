"use client";

import type { Question } from "@/lib/types";
import { MarkdownPreview } from "@/components/MarkdownPreview";

type QuestionCardProps = {
  question: Question;
  answerText: string;
  finalAnswer: string;
  disabled?: boolean;
  onChange: (value: { answerText: string; finalAnswer: string }) => void;
};

export function QuestionCard({
  question,
  answerText,
  finalAnswer,
  disabled,
  onChange
}: QuestionCardProps) {
  return (
    <section className="glass-card p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-[#8B5CF6]">
            Question {question.order_index}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-white">{question.title}</h2>
        </div>
        <span className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs tracking-wide text-[#A1A1AA]">
          {question.max_score} marks
        </span>
      </div>

      <div className="mb-6 select-none">
        <MarkdownPreview value={question.statement} />
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-[11px] text-white/50">
        {question.requires_explanation ? <span className="rounded border border-white/10 bg-white/5 px-2 py-1">Explanation required</span> : null}
        {question.requires_final_answer ? <span className="rounded border border-white/10 bg-white/5 px-2 py-1">Final answer required</span> : null}
        {question.allows_assumptions ? <span className="rounded border border-white/10 bg-white/5 px-2 py-1">State assumptions</span> : null}
        {question.allows_diagrams ? <span className="rounded border border-white/10 bg-white/5 px-2 py-1">Diagrams allowed</span> : null}
        {question.allows_code ? <span className="rounded border border-white/10 bg-white/5 px-2 py-1">Code/pseudocode allowed</span> : null}
        {question.allows_multiple_methods ? <span className="rounded border border-white/10 bg-white/5 px-2 py-1">Multiple methods allowed</span> : null}
      </div>

      <label className="mb-2 block text-sm font-medium tracking-tight text-[#E4E4E7]">Written reasoning</label>
      <textarea
        className="min-h-52 w-full resize-y rounded border border-white/10 bg-[#09090B] p-4 text-sm leading-relaxed text-[#E4E4E7] outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:shadow-[0_0_12px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
        value={answerText}
        disabled={disabled}
        placeholder="Describe your approach here..."
        onPaste={(e) => e.preventDefault()}
        onChange={(event) => onChange({ answerText: event.target.value, finalAnswer })}
      />

      {question.requires_final_answer ? (
        <>
          <label className="mb-2 mt-5 block text-sm font-medium tracking-tight text-[#E4E4E7]">Final answer</label>
          <input
            className="w-full rounded border border-white/10 bg-[#09090B] px-4 py-3 text-sm text-[#E4E4E7] outline-none transition focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:shadow-[0_0_12px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
            value={finalAnswer}
            disabled={disabled}
            placeholder="Concise final answer"
            onPaste={(e) => e.preventDefault()}
            onChange={(event) => onChange({ answerText, finalAnswer: event.target.value })}
          />
        </>
      ) : null}
    </section>
  );
}
