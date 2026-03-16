"use client";

import { useActionState } from "react";
import { uploadProfilePicture, removeProfilePicture, type ProfilePictureState } from "@/app/actions/account";

const initialUploadState: ProfilePictureState = {};
const initialRemoveState: ProfilePictureState = {};

export function ProfilePictureCard({ profileImagePath }: { profileImagePath: string | null }) {
  const [uploadState, uploadFormAction] = useActionState(uploadProfilePicture, initialUploadState);
  const [removeState, removeFormAction] = useActionState(removeProfilePicture, initialRemoveState);
  const error = uploadState?.error ?? removeState?.error;
  const success = uploadState?.success ?? removeState?.success;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-center gap-2">
        <i className="fas fa-user-circle" />
        Profile Picture
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Update your profile photo.</p>
      <div className="mb-3 flex justify-center">
        {profileImagePath ? (
          <img
            src={profileImagePath}
            alt="Profile"
            className="w-[150px] h-[150px] rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
          />
        ) : (
          <div className="w-[150px] h-[150px] rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-4xl">
            <i className="fas fa-user" />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400 mb-2">Updated.</p>}
      <form action={uploadFormAction} className="mb-2">
        <input
          type="file"
          name="profile_picture"
          accept="image/jpeg,image/png,image/gif"
          className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700 dark:file:bg-indigo-900/30 dark:file:text-indigo-300 mb-2"
        />
        <button
          type="submit"
          className="w-full px-3 py-1.5 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <i className="fas fa-upload mr-1" /> Upload
        </button>
      </form>
      {profileImagePath && (
        <form
          action={removeFormAction}
          onSubmit={(e) => {
            if (!confirm("Remove your profile picture?")) e.preventDefault();
          }}
        >
          <button type="submit" className="text-sm text-red-600 dark:text-red-400 hover:underline">
            <i className="fas fa-trash mr-1" /> Remove
          </button>
        </form>
      )}
    </div>
  );
}
