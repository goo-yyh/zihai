"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  emailOTPClient,
  usernameClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient(), usernameClient(), adminClient()],
});

export const { signIn, signOut, useSession } = authClient;
