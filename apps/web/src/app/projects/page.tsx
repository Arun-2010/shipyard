import Link from "next/link";
import { redirect } from "next/navigation";
import type { JSX } from "react";
import type { ProjectDto } from "@shipyard/shared";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

export default async function ProjectsPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user) redirect("/");

  const projects = await apiFetch<ProjectDto[]>("/projects");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/projects/new" className={buttonVariants()}>
          New project
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          No projects yet. Create one to deploy your first site.
        </p>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-muted">
                  <CardHeader>
                    <CardTitle>{project.slug}</CardTitle>
                    <CardDescription>{project.repoUrl}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
