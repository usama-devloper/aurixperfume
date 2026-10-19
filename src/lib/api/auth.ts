import { apiFetch } from "./client";

export interface UserProfile {
  id: string;
  full_name?: string;
  phone?: string;
  role: "customer" | "admin";
  updated_at?: string;
}

export const updateProfile = (data: { full_name?: string; phone?: string }) => {
  return apiFetch<UserProfile>("/profile-update", {
    method: "POST",
    body: JSON.stringify(data),
  });
};
