import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { getEmailFrom, getResendApiKey, stripWrappingQuotes } from "@/lib/env";

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => stripWrappingQuotes(email).toLowerCase())
    .filter(Boolean),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(getPrisma()),
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Resend({
      apiKey: getResendApiKey(),
      from: getEmailFrom(),
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      if (!adminEmails.has(email)) return true;

      await getPrisma().user.updateMany({
        where: { email },
        data: { role: "ADMIN" },
      });
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = ((user as { role?: Role }).role ?? "USER") as Role;
      }
      return session;
    },
  },
});
