import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role, Center } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    primaryCenter: Center;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      primaryCenter: Center;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    primaryCenter: Center;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.active) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          primaryCenter: user.primaryCenter,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.primaryCenter = user.primaryCenter;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, primaryCenter: true },
      });
      if (dbUser) {
        session.user.role = dbUser.role;
        session.user.primaryCenter = dbUser.primaryCenter;
      } else {
        session.user.role = token.role;
        session.user.primaryCenter = token.primaryCenter;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
