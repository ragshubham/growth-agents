import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/signin");
  return (
    <main className="p-6">
      <h1 className="text-2xl">Welcome, {session.user?.name ?? "friend"} 👋</h1>
    </main>
  );
}
