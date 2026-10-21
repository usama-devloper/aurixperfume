import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { deriveNamesFromUser, useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

// Mock AuthContext
let mockUser: any = null;
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock use-toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Helper to create wrapper for TanStack Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("Profile Provisioning & Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  describe("deriveNamesFromUser", () => {
    it("handles null or undefined user gracefully", () => {
      expect(deriveNamesFromUser(null)).toEqual({ firstName: "", lastName: "" });
      expect(deriveNamesFromUser(undefined)).toEqual({ firstName: "", lastName: "" });
      expect(deriveNamesFromUser({})).toEqual({ firstName: "", lastName: "" });
    });

    it("extracts explicit first_name and last_name from user_metadata", () => {
      const user = {
        user_metadata: {
          first_name: "Aria",
          last_name: "Vance",
        },
      };
      expect(deriveNamesFromUser(user)).toEqual({ firstName: "Aria", lastName: "Vance" });
    });

    it("extracts given_name and family_name standard OAuth claims", () => {
      const user = {
        user_metadata: {
          given_name: "Elena",
          family_name: "Rostova",
        },
      };
      expect(deriveNamesFromUser(user)).toEqual({ firstName: "Elena", lastName: "Rostova" });
    });

    it("parses full_name or name string into first and last name", () => {
      const userGoogle = {
        user_metadata: {
          full_name: "Usama Developer",
        },
      };
      expect(deriveNamesFromUser(userGoogle)).toEqual({
        firstName: "Usama",
        lastName: "Developer",
      });

      const userMultiWord = {
        user_metadata: {
          name: "Jean Paul Gaultier",
        },
      };
      expect(deriveNamesFromUser(userMultiWord)).toEqual({
        firstName: "Jean",
        lastName: "Paul Gaultier",
      });
    });
  });

  describe("useProfile hook", () => {
    it("loads an existing profile from database successfully", async () => {
      mockUser = {
        id: "usr-123",
        email: "existing@example.com",
      };

      const existingProfile = {
        id: "usr-123",
        user_id: "usr-123",
        email: "existing@example.com",
        first_name: "Existing",
        last_name: "Customer",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      };

      // Mock supabase query chain
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: existingProfile,
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromSpy = vi.spyOn(supabase, "from").mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fromSpy).toHaveBeenCalledWith("profiles");
      expect(selectMock).toHaveBeenCalledWith("*");
      expect(eqMock).toHaveBeenCalledWith("user_id", "usr-123");
      expect(maybeSingleMock).toHaveBeenCalled();
      expect(result.current.data).toEqual(existingProfile);
    });

    it("handles missing profile gracefully for first-time Google OAuth user without error", async () => {
      mockUser = {
        id: "google-user-999",
        email: "google.user@example.com",
        created_at: "2026-10-21T10:00:00Z",
        user_metadata: {
          full_name: "Google Customer",
        },
      };

      // Mock database returning null (no row found, but no error)
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.spyOn(supabase, "from").mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should return a synthesized customer profile without throwing or crashing
      expect(result.current.data).toMatchObject({
        id: "google-user-999",
        user_id: "google-user-999",
        email: "google.user@example.com",
        first_name: "Google",
        last_name: "Customer",
      });
    });

    it("propagates genuine database errors properly", async () => {
      mockUser = { id: "usr-err", email: "err@example.com" };

      const dbError = new Error("Database connection refused");
      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.spyOn(supabase, "from").mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(dbError);
    });
  });

  describe("useUpdateProfile hook", () => {
    it("provisions or updates profile using conflict-safe upsert with only permitted fields", async () => {
      mockUser = {
        id: "usr-456",
        email: "customer@example.com",
      };

      const upsertResult = {
        id: "usr-456",
        user_id: "usr-456",
        email: "customer@example.com",
        first_name: "UpdatedFirst",
        last_name: "UpdatedLast",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-10-21T12:00:00Z",
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: upsertResult,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.spyOn(supabase, "from").mockReturnValue({
        upsert: upsertMock,
      } as any);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      // Pass attempted unauthorized properties (e.g. role, admin privileges)
      await result.current.mutateAsync({
        first_name: "UpdatedFirst",
        last_name: "UpdatedLast",
        // @ts-expect-error - simulating hostile input
        role: "admin",
        // @ts-expect-error - simulating hostile input
        user_id: "someone-else",
      });

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "usr-456", // Authenticated user ID strictly enforced
          email: "customer@example.com",
          first_name: "UpdatedFirst",
          last_name: "UpdatedLast",
        }),
        { onConflict: "user_id" }
      );

      // Verify that malicious properties (role, unauthorized user_id) were NOT passed into upsert
      const callArg = upsertMock.mock.calls[0][0];
      expect(callArg.role).toBeUndefined();
      expect(callArg.user_id).toBe("usr-456");

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Profile updated successfully",
        })
      );
    });

    it("handles update failure and presents destructive toast", async () => {
      mockUser = {
        id: "usr-fail",
        email: "fail@example.com",
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Row Level Security violation"),
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const upsertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.spyOn(supabase, "from").mockReturnValue({
        upsert: upsertMock,
      } as any);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({ first_name: "Test" })
      ).rejects.toThrow("Row Level Security violation");

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to update profile",
          description: "Row Level Security violation",
          variant: "destructive",
        })
      );
    });
  });
});
