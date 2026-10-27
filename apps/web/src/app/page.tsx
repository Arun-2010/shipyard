import { redirect } from "next/navigation";
import type { JSX } from "react";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage(): Promise<JSX.Element> {
  const session = await auth();
  if (session?.user) redirect("/projects");

  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Ship a site from a GitHub repo.</h1>
      <p className="max-w-md text-muted-foreground">
        Paste a repo URL. Shipyard builds it in an isolated container, streams the logs, and serves
        it at its own subdomain.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/projects" });
        }}
      >
        <Button size="lg" type="submit">
          Sign in with GitHub
        </Button>
      </form>
    </div>
  );
}
