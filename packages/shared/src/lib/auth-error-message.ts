/** Same as Firebase `invalid-credential` / `wrong-password` copy — use for any sign-in rejection that should look like a normal credential check. */
export const SIGN_IN_INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password. Please try again.";

/**
 * Maps Firebase Auth errors to short, non-technical copy for the sign-in UI.
 */
export function friendlySignInError(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return SIGN_IN_INVALID_CREDENTIALS_MESSAGE;
    case "auth/user-disabled":
      return "This account has been disabled. Contact your administrator.";
    case "auth/too-many-requests":
      return "Too many sign-in attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Couldn’t connect. Check your internet and try again.";
    case "auth/requires-recent-login":
      return "Please sign in again.";
    default:
      return "Sign-in didn’t work. Please try again.";
  }
}
