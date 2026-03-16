type AccountInfoCardProps = {
  username: string;
  role: string;
  userCode: string | null;
  createdAt: Date | string;
};

export function AccountInfoCard({ username, role, userCode, createdAt }: AccountInfoCardProps) {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <i className="fas fa-info-circle" />
        Account Information
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400 font-medium">Username</dt>
          <dd className="text-gray-900 dark:text-gray-100 mt-0.5">{username}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400 font-medium">User code</dt>
          <dd className="text-gray-900 dark:text-gray-100 mt-0.5">{userCode ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400 font-medium">Role</dt>
          <dd className="text-gray-900 dark:text-gray-100 mt-0.5 capitalize">{role.replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400 font-medium">Account created</dt>
          <dd className="text-gray-900 dark:text-gray-100 mt-0.5">
            {created.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
