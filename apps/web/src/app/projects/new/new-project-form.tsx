"use client";

import { useActionState, type JSX } from "react";
import {
  DEFAULT_BUILD_COMMAND,
  DEFAULT_INSTALL_COMMAND,
  DEFAULT_OUTPUT_DIR,
} from "@shipyard/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, type CreateProjectState } from "./actions";

const initialState: CreateProjectState = { formError: null, fieldErrors: {}, values: {} };

interface FieldProps {
  name: keyof CreateProjectState["values"];
  label: string;
  placeholder: string;
  hint?: string;
  state: CreateProjectState;
}

function Field({ name, label, placeholder, hint, state }: FieldProps): JSX.Element {
  const error = state.fieldErrors[name]?.[0];
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        placeholder={placeholder}
        defaultValue={state.values[name]}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
      />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function NewProjectForm(): JSX.Element {
  const [state, formAction, pending] = useActionState(createProject, initialState);

  return (
    // `key` remounts the inputs after each submit so defaultValue picks up state.values.
    <form action={formAction} className="flex flex-col gap-5" key={JSON.stringify(state.values)}>
      <Field
        name="repoUrl"
        label="GitHub repository"
        placeholder="https://github.com/owner/repo"
        state={state}
      />
      <Field
        name="slug"
        label="Project name"
        placeholder="my-site"
        hint="Your site will live at <name>.localhost. Lowercase letters, numbers and hyphens."
        state={state}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          name="installCommand"
          label="Install command"
          placeholder={DEFAULT_INSTALL_COMMAND}
          state={state}
        />
        <Field
          name="buildCommand"
          label="Build command"
          placeholder={DEFAULT_BUILD_COMMAND}
          state={state}
        />
        <Field
          name="outputDir"
          label="Output directory"
          placeholder={DEFAULT_OUTPUT_DIR}
          state={state}
        />
      </div>

      {state.formError && <p className="text-sm text-destructive">{state.formError}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
