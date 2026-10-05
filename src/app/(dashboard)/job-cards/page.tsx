import { redirect } from "next/navigation";

export default function JobCardsPage() {
  // Redirect to job assignments since there is no general job cards view without an ID
  redirect("/job-assignments");
}
