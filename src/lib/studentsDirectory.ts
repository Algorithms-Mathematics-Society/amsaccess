import type { Student } from "./orgTypes";

export type DirectoryAction = "add" | "mail" | "delete";
export type StudentActionResult = {
  student: Student;
  status: "pending" | "working" | "success" | "skipped" | "failed";
  message: string;
};

export function mailIneligible(student: Student): string | null {
  if (!student.mailable) return "Skipped: no deliverable login email.";
  if (!(student.contests_entered > 0 || student.contests?.length))
    return "Skipped: add to a contest before emailing login instructions.";
  return null;
}

export function studentsCsv(students: Student[]): string {
  const keys = [
    "uid",
    "display_name",
    "username",
    "email",
    "college",
    "branch",
    "graduation_year",
    "external_ref",
  ] as const;
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
      text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [
    keys.map(cell).join(","),
    ...students.map((student) =>
      keys.map((key) => cell(student[key])).join(","),
    ),
  ].join("\r\n");
}

/** Sequential requests keep large selections from flooding the API. */
export async function runStudentActions(
  students: Student[],
  action: DirectoryAction,
  contestUid: string,
  update: (result: StudentActionResult) => void,
  send: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<void> {
  for (const student of students) {
    if (signal?.aborted) return;
    const skip =
      action === "mail"
        ? mailIneligible(student)
        : action === "add" &&
            student.contests?.some((contest) => contest.uid === contestUid)
          ? "Skipped: already on this contest's roster."
          : null;
    if (skip) {
      update({ student, status: "skipped", message: skip });
      continue;
    }
    update({ student, status: "working", message: "Working…" });
    try {
      const suffix =
        action === "mail"
          ? "/credential/mail"
          : action === "add"
            ? `/contests/${encodeURIComponent(contestUid)}`
            : "";
      const response = await send(
        `/api/org/students/${encodeURIComponent(student.uid)}${suffix}`,
        { method: action === "delete" ? "DELETE" : "POST", signal },
      );
      if (signal?.aborted) return;
      // Successful add responses may contain a password; never read or retain it.
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Request failed (${response.status}).`,
        );
      }
      update({
        student,
        status: "success",
        message:
          action === "mail"
            ? "Login email queued (delivery not yet confirmed)."
            : action === "add"
              ? "Added to contest."
              : "Removed, or disabled with history preserved.",
      });
    } catch (error) {
      if (signal?.aborted) return;
      update({
        student,
        status: "failed",
        message: error instanceof Error ? error.message : "Request failed.",
      });
    }
  }
}
