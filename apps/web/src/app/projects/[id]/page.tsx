import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { JSX } from "react";
import type { ProjectDto } from "@shipyard/shared";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError, apiFetch } from "@/lib/api";

async function getProject(id: string): Promise<ProjectDto> {
  try {
    return await apiFetch<ProjectDto>(`/projects/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) notFound();
    throw err;
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user) redirect("/");

  const project = await getProject((await params).id);
  const settings: [string, string][] = [
    ["Repository", project.repoUrl],
    ["Install command", project.installCommand],
    ["Build command", project.buildCommand],
    ["Output directory", project.outputDir],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/projects" className="text-sm text-muted-foreground hover:underline">
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{project.slug}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Build settings</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            {settings.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployments</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No deployments yet.</CardContent>
      </Card>
    </div>
  );
}
