import type { User } from "firebase/auth";

export async function portalAuthHeaders(user: User): Promise<{ Authorization: string }> {
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
