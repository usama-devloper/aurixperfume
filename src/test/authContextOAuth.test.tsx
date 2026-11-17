import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock security logger
vi.mock("@/utils/securityLogger", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(true),
}));

describe("AuthContext — First-Time Google Signup & OAuth Session Auto-Establishment", () => {
  let authStateCallback: ((event: string, session: any) => void) | null = null;
  let mockUnsubscribe: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();

    vi.spyOn(supabase.auth, "onAuthStateChange").mockImplementation((cb: any) => {
      authStateCallback = cb;
      return {
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      } as any;
    });

    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it("automatically establishes session when SIGNED_IN event fires on first-time Google signup", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);

    const mockGoogleUser = {
      id: "google-first-time-user-123",
      email: "first.time.google@example.com",
      user_metadata: {
        full_name: "Aria Vance",
        avatar_url: "https://lh3.googleusercontent.com/photo.jpg",
      },
    };

    const mockGoogleSession = {
      access_token: "mock-google-access-token",
      refresh_token: "mock-google-refresh-token",
      user: mockGoogleUser,
    };

    // Simulate Supabase PKCE exchange completing and emitting SIGNED_IN
    await act(async () => {
      if (authStateCallback) {
        authStateCallback("SIGNED_IN", mockGoogleSession);
      }
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockGoogleUser);
    expect(result.current.session).toEqual(mockGoogleSession);
    // User is automatically and immediately logged in without needing a second click
  });

  it("resolves loading immediately on normal visit when no OAuth callback is in the URL", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate standard INITIAL_SESSION with null session
    await act(async () => {
      if (authStateCallback) {
        authStateCallback("INITIAL_SESSION", null);
      }
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("handles existing session on browser refresh correctly", async () => {
    const existingUser = {
      id: "existing-user-456",
      email: "existing@example.com",
    };
    const existingSession = {
      access_token: "token-456",
      user: existingUser,
    };

    vi.spyOn(supabase.auth, "getSession").mockResolvedValueOnce({
      data: { session: existingSession as any },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        authStateCallback("INITIAL_SESSION", existingSession);
      }
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(existingUser);
    expect(result.current.session).toEqual(existingSession);
  });

  it("clears user and session on SIGNED_OUT event", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // First, sign in
    await act(async () => {
      if (authStateCallback) {
        authStateCallback("SIGNED_IN", {
          access_token: "tok",
          user: { id: "u1", email: "u1@example.com" },
        });
      }
    });

    expect(result.current.user).not.toBeNull();

    // Now emit SIGNED_OUT
    await act(async () => {
      if (authStateCallback) {
        authStateCallback("SIGNED_OUT", null);
      }
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("unsubscribes on unmount to prevent memory leaks and zombie listeners", () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

