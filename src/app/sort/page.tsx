import { FeatherSortGameClient } from "@/components/sort/FeatherSortGameClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feather Sort" };

// Feather Match is free to play unlimited — only Park Hunt has the free-tier
// daily limit (enforced server-side in findWordAtStationAction).
export default function SortPage() {
  return (
    <main className="page sort-page">
      <FeatherSortGameClient />
    </main>
  );
}
