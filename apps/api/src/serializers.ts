import type { Project, User } from "@shipyard/db";
import type { ProjectDto, UserDto } from "@shipyard/shared";

// Explicit DB row → API shape mapping, so adding a column never leaks it by accident.

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };
}

export function toProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    slug: project.slug,
    repoUrl: project.repoUrl,
    installCommand: project.installCommand,
    buildCommand: project.buildCommand,
    outputDir: project.outputDir,
    activeDeploymentId: project.activeDeploymentId,
    createdAt: project.createdAt.toISOString(),
  };
}
