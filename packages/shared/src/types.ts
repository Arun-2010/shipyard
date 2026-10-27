// Shapes the API sends over the wire. Dates are ISO strings because that's what JSON gives us.

export interface UserDto {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface ProjectDto {
  id: string;
  slug: string;
  repoUrl: string;
  installCommand: string;
  buildCommand: string;
  outputDir: string;
  activeDeploymentId: string | null;
  createdAt: string;
}

/** Every non-2xx API response has this body. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: { path: string; message: string }[];
  };
}
