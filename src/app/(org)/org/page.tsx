import { redirect } from "next/navigation";

// CONTEST-DAY.md sends staff to /org; it used to 404.
export default function OrgIndex() {
  redirect("/org/dashboard");
}
