// To store information about currently logged in users

import { getServerSession } from "next-auth";
import { NextAuthOptions, User } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";
import { JWT } from "next-auth/jwt";
import { SessionInterface, UserProfile } from "@/common.types";
import { createUser, getUser } from "./actions";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, //"!" means it can be undefined as well
      clientSecret: process.env.GOOGLE_CLIENT_SECRECT!,
    }),
  ],
  jwt: {
      encode: ({secret, token}) => {
        const encodedToken = 
        jsonwebtoken.sign({
          ...token,
          iss: 'grafbase',
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // This is the standard time of one session
        }, secret)

        return encodedToken;
      },
      decode: async ({secret, token}) => {
        const decodedToken = jsonwebtoken.verify(token!, secret) as JWT;

        return decodedToken;
      }
  },
  theme: {
    colorScheme: "light",
    logo: "/logo.svg",
  },
  callbacks: {
    async session({ session }) {
      const email = session?.user?.email as string;

      try {
        const data = (await getUser(email)) as { user?: UserProfile };

        //Combining two different users ->
        // Google User has name, email, avatarUrl
        // User in the database has projects, githubUrl, linkedInUrl etc
        const newSession = {
          ...session,
          user: {
            ...session.user,
            ...data?.user,
          },
        };

        return newSession;
      } catch (error) {
        console.log('Error retrieving user data', error);
        return session;
      }
    },
    //AdapterUser or User is to differentiate between Google user and the user that we're going to have in our database
    async signIn({ user }: { user: AdapterUser | User }) {
      try {
        //get the user if they exist
        const userExists = (await getUser(user?.email as string)) as {
          user?: UserProfile;
        };

        //if they don't exist, create them
        if (!userExists.user) {
          await createUser(
            user.name as string,
            user.email as string,
            user.email as string
          );
        }

        return true;
      } catch (error: any) {
        console.log(error);
        return false;
      }
    },
  },
};

export async function getCurrentUser() {
  const session = (await getServerSession(authOptions)) as SessionInterface;

  return session;
}
