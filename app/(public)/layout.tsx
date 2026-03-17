import { getBusinessInfoFromDb } from "@/lib/business-settings";
import { TopBar } from "@/components/public/TopBar";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PageLoader } from "@/components/public/PageLoader";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const businessInfo = await getBusinessInfoFromDb();
  return (
    <div className="min-h-screen flex flex-col">
      <PageLoader businessInfo={businessInfo} />
      <TopBar businessInfo={businessInfo} />
      <PublicHeader businessInfo={businessInfo} />
      <main className="flex-1">{children}</main>
      <PublicFooter businessInfo={businessInfo} />
    </div>
  );
}
