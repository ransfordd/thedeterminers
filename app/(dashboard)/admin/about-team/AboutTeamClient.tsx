"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  createAboutTeamMember,
  deleteAboutTeamMember,
  reorderAboutTeamMember,
  updateAboutTeamMember,
  type AboutTeamActionState,
} from "@/app/actions/about-team";

type Row = {
  id: number;
  sortOrder: number;
  photoPath: string;
  name: string;
  title: string;
  bio: string;
};

const initial: AboutTeamActionState = {};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function validatePhotoInput(file: File | null): string | null {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return "Invalid image type. Use JPG, PNG, GIF, or WebP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Image too large. Max allowed size is 5MB.";
  }
  return null;
}

function SubmitLabel({ idle, pendingLabel }: { idle: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? pendingLabel : idle}</>;
}

function AddForm({ onSaved }: { onSaved: () => void }) {
  const [state, formAction] = useActionState(createAboutTeamMember, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const prevSuccessRef = useRef(false);
  const [clientError, setClientError] = useState<string | null>(null);
  useEffect(() => {
    const isSuccess = Boolean(state?.success);
    if (isSuccess && !prevSuccessRef.current) {
      formRef.current?.reset();
      onSaved();
    }
    prevSuccessRef.current = isSuccess;
  }, [state?.success, onSaved]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 max-w-xl"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const fileInput = form.elements.namedItem("photo") as HTMLInputElement | null;
        const file = fileInput?.files?.[0] ?? null;
        const msg = validatePhotoInput(file);
        if (msg) {
          e.preventDefault();
          setClientError(msg);
          return;
        }
        setClientError(null);
      }}
    >
      {clientError && (
        <p className="text-sm text-red-600 dark:text-red-400">{clientError}</p>
      )}
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">Member added.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
          <input name="name" required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Job title</label>
          <input name="title" required className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bio</label>
        <textarea name="bio" required rows={3} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo path (optional if you upload)</label>
        <input name="photoPath" placeholder="/assets/images/About-side/man1.jpg" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo upload</label>
        <input name="photo" type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="block w-full text-sm text-gray-600 dark:text-gray-400" />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
      >
        <SubmitLabel idle="Add member" pendingLabel="Saving…" />
      </button>
    </form>
  );
}

function EditForm({ member, onCancel, onSaved }: { member: Row; onCancel: () => void; onSaved: () => void }) {
  const [state, formAction] = useActionState(updateAboutTeamMember, initial);
  const prevSuccessRef = useRef(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    const isSuccess = Boolean(state?.success);
    if (isSuccess && !prevSuccessRef.current) {
      onSaved();
      onCancel();
    }
    prevSuccessRef.current = isSuccess;
  }, [state?.success, onCancel, onSaved]);

  return (
    <form
      action={formAction}
      className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/40"
      onSubmit={(e) => {
        const form = e.currentTarget;
        const fileInput = form.elements.namedItem("photo") as HTMLInputElement | null;
        const file = fileInput?.files?.[0] ?? null;
        const msg = validatePhotoInput(file);
        if (msg) {
          e.preventDefault();
          setClientError(msg);
          return;
        }
        setClientError(null);
      }}
    >
      <input type="hidden" name="id" value={member.id} />
      {clientError && <p className="text-sm text-red-600 dark:text-red-400">{clientError}</p>}
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">Saved.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
          <input name="name" required defaultValue={member.name} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Job title</label>
          <input name="title" required defaultValue={member.title} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bio</label>
        <textarea name="bio" required rows={3} defaultValue={member.bio} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Photo path</label>
        <input name="photoPath" defaultValue={member.photoPath} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Replace photo (optional)</label>
        <input name="photo" type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="block w-full text-sm text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          <SubmitLabel idle="Save changes" pendingLabel="Saving…" />
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AboutTeamClient({ members }: { members: Row[] }) {
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);

  return (
    <div className="space-y-8">
      <ModernCardLocal title="Add team member" subtitle="Shown on the public About page under Meet Our Team">
        <AddForm onSaved={refresh} />
      </ModernCardLocal>

      <ModernCardLocal title="Current members" subtitle="Order matches the About page (top to bottom, left to right)">
        {members.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No members in the database yet. The site shows default placeholders until you add one.</p>
        ) : (
          <ul className="space-y-6">
            {members.map((m, index) => (
              <MemberRow key={m.id} member={m} index={index} total={members.length} onRefresh={refresh} />
            ))}
          </ul>
        )}
      </ModernCardLocal>
    </div>
  );
}

function ModernCardLocal({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MemberRow({
  member,
  index,
  total,
  onRefresh,
}: {
  member: Row;
  index: number;
  total: number;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const closeEdit = () => setEditing(false);

  return (
    <li className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap gap-4 items-start">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-900">
          <Image src={member.photoPath} alt={member.name} fill className="object-cover" sizes="80px" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-white">{member.name}</div>
          <div className="text-sm text-indigo-600 dark:text-indigo-400">{member.title}</div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{member.bio}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono break-all">{member.photoPath}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={index === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40"
            onClick={async () => {
              const fd = new FormData();
              fd.set("id", String(member.id));
              fd.set("direction", "up");
              await reorderAboutTeamMember(fd);
              onRefresh();
            }}
          >
            Up
          </button>
          <button
            type="button"
            disabled={index >= total - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40"
            onClick={async () => {
              const fd = new FormData();
              fd.set("id", String(member.id));
              fd.set("direction", "down");
              await reorderAboutTeamMember(fd);
              onRefresh();
            }}
          >
            Down
          </button>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
            onClick={async () => {
              if (!confirm(`Delete ${member.name} from the team?`)) return;
              const fd = new FormData();
              fd.set("id", String(member.id));
              await deleteAboutTeamMember(fd);
              onRefresh();
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {editing && <EditForm member={member} onCancel={closeEdit} onSaved={onRefresh} />}
    </li>
  );
}
