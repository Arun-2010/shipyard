import { redirect } from "next/navigation";
import type { JSX } from "react";
import { auth } from "@/auth";
import { NewProjectForm } from "./new-project-form";

export default async function NewProjectPage(): Promise<JSX.Element> {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-muted-foreground">
          Static sites and SPAs: Vite, Create React App, plain HTML, Next.js static export.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
