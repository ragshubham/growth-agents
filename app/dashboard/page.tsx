import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/signin");

  return (
    <main className="p-6">
      <h1 className="text-2xl">Welcome, {session.user?.name ?? "friend"} 👋</h1>
      <p className="mt-2">You’re in. 🎉</p>
      <p className="mt-6">
        <a
          href="/logout"
          className="underline"
          title="Sign out"
        >
          Sign out
        </a>
      </p>
    </main>
  );
}
