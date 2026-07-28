import { redirect } from "next/navigation";
import { WelcomeWizard } from "./WelcomeWizard";
import { listChildren, addChildAction } from "@/app/account/profiles/actions";

export const metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const children = await listChildren();
  // Once a child exists there's nothing to onboard — go home.
  if (children.length > 0) {
    redirect("/");
  }
  return (
    <main className="page">
      <WelcomeWizard addChildAction={addChildAction} />
    </main>
  );
}
