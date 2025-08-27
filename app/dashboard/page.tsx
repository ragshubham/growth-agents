import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/signin");

  // @ts-ignore
  const user: any = session.user;

  // If not onboarded, go to onboarding
  if (!user?.onboardingComplete) redirect("/onboarding");

  return (
    <div className="min-h-screen p-10">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-neutral-600 mt-2">Signed in as {user?.email}</p>
      {/* ...dashboard content... */}
    </div>
  );
}
