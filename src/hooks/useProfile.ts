import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Derives first and last names from user metadata (e.g. Google OAuth or signup metadata)
 */
export function deriveNamesFromUser(user: { user_metadata?: Record<string, any> } | null | undefined): {
  firstName: string;
  lastName: string;
} {
  if (!user || !user.user_metadata) {
    return { firstName: "", lastName: "" };
  }

  const meta = user.user_metadata;
  let firstName = (meta.first_name || meta.given_name || "").trim();
  let lastName = (meta.last_name || meta.family_name || "").trim();

  if (!firstName && !lastName) {
    const fullName = (meta.full_name || meta.name || "").trim();
    if (fullName) {
      const parts = fullName.split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }
  }

  return { firstName, lastName };
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile> => {
      if (!user) throw new Error("No user");

      // Use maybeSingle() to avoid PGRST116 error when profile row doesn't exist yet
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // If a database profile row exists, return it
      if (data) {
        return data as Profile;
      }

      // Missing profile fallback (e.g. first-time Google OAuth user):
      // Safely synthesize a customer profile using user metadata
      const { firstName, lastName } = deriveNamesFromUser(user);

      return {
        id: user.id,
        user_id: user.id,
        email: user.email || null,
        first_name: firstName || null,
        last_name: lastName || null,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    enabled: !!user,
  });
};

export const useUpdateProfile = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("No user");

      // Strictly allow-list permitted customer fields to prevent privilege escalation or unexpected mutations
      const safePayload: {
        user_id: string;
        email: string | null;
        first_name?: string | null;
        last_name?: string | null;
        updated_at: string;
      } = {
        user_id: user.id,
        email: user.email || null,
        updated_at: new Date().toISOString(),
      };

      if (updates.first_name !== undefined) {
        safePayload.first_name = updates.first_name;
      }
      if (updates.last_name !== undefined) {
        safePayload.last_name = updates.last_name;
      }

      // Use upsert on user_id conflict so that first-time users without an existing row are provisioned safely,
      // while existing profile records have only permitted fields updated.
      const { data, error } = await supabase
        .from("profiles")
        .upsert(safePayload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (e: Error) => {
      toast({
        title: "Failed to update profile",
        description: e.message,
        variant: "destructive",
      });
    },
  });
};
