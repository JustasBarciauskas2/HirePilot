import { runAuth0Proxy } from "./lib/auth0";

export async function proxy(request: Request) {
  return runAuth0Proxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
