import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BoardsPage() {
  const session = await auth.api.getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return <h1>Boards Page</h1>;
}
