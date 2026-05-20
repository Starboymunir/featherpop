import { WalletClient } from "@/components/WalletClient";
import { KidRow } from "@/components/KidAvatar";

export default function WalletPage() {
  return (
    <main className="page">
      <header className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <span className="kicker">Wallet</span>
          <h1 className="h-display mt-2 text-4xl md:text-5xl">
            <span className="h-gradient">FeatherPop</span>
          </h1>
        </div>
        <div className="kid-stage">
          <KidRow kids={["ari", "kai", "zara"]} pose="cheer" size={56} />
        </div>
      </header>
      <WalletClient />
    </main>
  );
}
