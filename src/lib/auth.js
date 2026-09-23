import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sessionHasPermission } from "@/lib/rbac-config";

export const authOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: { include: { permissions: true } } },
        });

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          await prisma.loginLog.create({
            data: { userId: user.id, status: "FAILED" },
          });
          return null;
        }

        await prisma.loginLog.create({
          data: { userId: user.id, status: "SUCCESS" },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await prisma.auditLog.create({
          data: { userId: user.id, action: "LOGIN", module: "auth" },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          permissions: user.role.permissions.map((p) => `${p.module}:${p.action}`),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.permissions = user.permissions;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.permissions = token.permissions;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function hasPermission(session, moduleName, action) {
  return sessionHasPermission(session, moduleName, action);
}
