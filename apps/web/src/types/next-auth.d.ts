import "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
    login?: string;
  }
}
