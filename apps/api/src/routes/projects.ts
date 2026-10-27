import type { FastifyPluginAsync } from "fastify";
import { isUniqueViolation } from "@shipyard/db";
import { createProjectSchema, idParamsSchema, type ProjectDto } from "@shipyard/shared";
import { ConflictError, NotFoundError } from "../errors";
import { toProjectDto } from "../serializers";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects", async (request): Promise<ProjectDto[]> => {
    const projects = await app.prisma.project.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: "desc" },
    });
    return projects.map(toProjectDto);
  });

  app.get("/projects/:id", async (request): Promise<ProjectDto> => {
    const { id } = idParamsSchema.parse(request.params);
    // Filtering by userId means someone else's project looks exactly like a
    // missing one (404, not 403), so ids can't be probed.
    const project = await app.prisma.project.findFirst({
      where: { id, userId: request.userId },
    });
    if (!project) throw new NotFoundError("Project not found");
    return toProjectDto(project);
  });

  app.post("/projects", async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    try {
      const project = await app.prisma.project.create({
        data: { ...input, userId: request.userId },
      });
      return reply.status(201).send(toProjectDto(project));
    } catch (err) {
      // Let the unique index decide instead of "check then insert", which
      // would race when two requests ask for the same slug at once.
      if (isUniqueViolation(err)) {
        throw new ConflictError(`The name "${input.slug}" is already taken`);
      }
      throw err;
    }
  });
};
