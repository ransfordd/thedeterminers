import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, ModernCard } from "@/components/dashboard";
import { AccountSettingsForm } from "./AccountSettingsForm";
import { ProfilePictureCard } from "./ProfilePictureCard";
import { AccountInfoCard } from "./AccountInfoCard";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { ContactInfoForm } from "./ContactInfoForm";
import { NextOfKinForm } from "./NextOfKinForm";
import { DocumentUploadCard } from "./DocumentUploadCard";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = parseInt((session.user as { id?: string }).id ?? "0", 10);
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      profileImage: true,
      username: true,
      role: true,
      createdAt: true,
      middleName: true,
      dateOfBirth: true,
      gender: true,
      maritalStatus: true,
      nationality: true,
      postalAddress: true,
      city: true,
      region: true,
      postalCode: true,
      clients: { select: { clientCode: true, nextOfKinName: true, nextOfKinRelationship: true, nextOfKinPhone: true, nextOfKinEmail: true, nextOfKinAddress: true } },
      agents: { select: { agentCode: true } },
      userDocuments: { select: { id: true, documentType: true, fileName: true, status: true, createdAt: true, filePath: true } },
    },
  });
  if (!user) redirect("/login");

  const userCode = user.clients?.clientCode ?? user.agents?.agentCode ?? null;
  const isClient = user.role === "client";
  const nextOfKin = user.clients
    ? {
        nextOfKinName: user.clients.nextOfKinName,
        nextOfKinRelationship: user.clients.nextOfKinRelationship,
        nextOfKinPhone: user.clients.nextOfKinPhone,
        nextOfKinEmail: user.clients.nextOfKinEmail,
        nextOfKinAddress: user.clients.nextOfKinAddress,
      }
    : null;
  const documents = (user.userDocuments ?? []).map((d) => ({
    id: d.id,
    documentType: d.documentType,
    fileName: d.fileName,
    status: d.status,
    createdAt: d.createdAt,
    filePath: d.filePath,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        subtitle="Manage your profile, documents, and account preferences"
        icon={<i className="fas fa-cog" />}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfilePictureCard profileImagePath={user.profileImage} />
        <AccountInfoCard
          username={user.username}
          role={user.role}
          userCode={userCode}
          createdAt={user.createdAt}
        />
      </div>
      <ModernCard
        title="Profile"
        subtitle="Update your name, email, and contact information"
        icon={<i className="fas fa-user" />}
      >
        <AccountSettingsForm
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            address: user.address,
          }}
        />
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/account/password"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <i className="fas fa-key" /> Change password
          </Link>
        </div>
      </ModernCard>

      <ModernCard
        title="Personal information"
        subtitle="Middle name, date of birth, gender, marital status, nationality"
        icon={<i className="fas fa-user" />}
      >
        <PersonalInfoForm
          middleName={user.middleName}
          dateOfBirth={user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : null}
          gender={user.gender}
          maritalStatus={user.maritalStatus}
          nationality={user.nationality}
        />
      </ModernCard>

      <ModernCard
        title="Contact information (extended)"
        subtitle="Postal address, city, region, postal code"
        icon={<i className="fas fa-phone" />}
      >
        <ContactInfoForm
          postalAddress={user.postalAddress}
          city={user.city}
          region={user.region}
          postalCode={user.postalCode}
        />
      </ModernCard>

      {isClient && nextOfKin && (
        <ModernCard
          title="Next of kin"
          subtitle="Emergency contact details"
          icon={<i className="fas fa-users" />}
        >
          <NextOfKinForm
            nextOfKinName={nextOfKin.nextOfKinName}
            nextOfKinRelationship={nextOfKin.nextOfKinRelationship}
            nextOfKinPhone={nextOfKin.nextOfKinPhone}
            nextOfKinEmail={nextOfKin.nextOfKinEmail}
            nextOfKinAddress={nextOfKin.nextOfKinAddress}
          />
        </ModernCard>
      )}

      <ModernCard
        title="Documents"
        subtitle="Upload and manage your documents"
        icon={<i className="fas fa-file-upload" />}
      >
        <DocumentUploadCard documents={documents} />
      </ModernCard>
    </div>
  );
}
