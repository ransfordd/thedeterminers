import { TopBar } from "@/components/public/TopBar";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PageLoader } from "@/components/public/PageLoader";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PageLoader />
      <TopBar />
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
