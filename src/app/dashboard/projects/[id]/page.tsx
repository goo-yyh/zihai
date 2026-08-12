import { redirect } from "next/navigation";

export default async function ProjectDashboardPage({ params }: PageProps<"/dashboard/projects/[id]">) {
  const { id } = await params;
  redirect(`/dashboard/projects/${id}/edit`);
}
