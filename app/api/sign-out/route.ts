import { authClient, signOut } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export async function POST() {
  console.log("sign out route called");
  authClient.signOut();
  redirect("/sign-in");
}
