import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

let client: Auth0Client | null | undefined;

function getClient(): Auth0Client | null {
  if (client !== undefined) return client;
  if (
    !process.env.AUTH0_DOMAIN ||
    !process.env.AUTH0_CLIENT_ID ||
    !process.env.AUTH0_CLIENT_SECRET ||
    !process.env.AUTH0_SECRET
  ) {
    client = null;
    return null;
  }
  client = new Auth0Client();
  return client;
}

export function isAuth0Configured(): boolean {
  return getClient() !== null;
}

/** Auth0 middleware, or passthrough when env is not set (e.g. local build without .env.local). */
export async function runAuth0Proxy(request: Request) {
  const c = getClient();
  if (!c) return NextResponse.next();
  return c.middleware(request);
}

export const auth0 = {
  getSession(req?: NextRequest) {
    const c = getClient();
    if (!c) return Promise.resolve(null);
    return req ? c.getSession(req) : c.getSession();
  },
};
