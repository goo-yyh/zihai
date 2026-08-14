import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

const authHandler = (request: Request) => getAuth().handler(request);

export const { GET, POST } = toNextJsHandler(authHandler);
