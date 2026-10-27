import type { FastifyPluginAsync } from "fastify";
import type { UserDto } from "@shipyard/shared";
import { NotFoundError } from "../errors";
import { toUserDto } from "../serializers";

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (request): Promise<UserDto> => {
    const user = await app.prisma.user.findUnique({ where: { id: request.userId } });
    if (!user) throw new NotFoundError("User not found");
    return toUserDto(user);
  });
};
