"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createProjectSchema, type ProjectDto } from "@shipyard/shared";
import { ApiRequestError, apiFetch } from "@/lib/api";

const FIELDS = ["repoUrl", "slug", "installCommand", "buildCommand", "outputDir"] as const;
type Field = (typeof FIELDS)[number];

export interface CreateProjectState {
  formError: string | null;
  fieldErrors: Partial<Record<Field, string[]>>;
  /** What the user typed, so the form can refill itself after an error. */
  values: Partial<Record<Field, string>>;
}

export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const values: CreateProjectState["values"] = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    // Blank optional fields become undefined so the schema applies its defaults.
    if (typeof value === "string" && value.trim() !== "") values[field] = value;
  }

  // Validate here for quick feedback; the API validates again with the same schema.
  const parsed = createProjectSchema.safeParse(values);
  if (!parsed.success) {
    return { formError: null, fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  let project: ProjectDto;
  try {
    project = await apiFetch<ProjectDto>("/projects", { method: "POST", body: parsed.data });
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 409) {
      return { formError: null, fieldErrors: { slug: [err.message] }, values };
    }
    if (err instanceof ApiRequestError) {
      return { formError: err.message, fieldErrors: {}, values };
    }
    throw err;
  }

  // redirect() works by throwing, so it must be outside the try/catch above.
  redirect(`/projects/${project.id}`);
}
