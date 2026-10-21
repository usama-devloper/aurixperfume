import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "../pages/Auth";
import { sanitizeRedirectPath, getSafeOAuthRedirectUrl } from "../utils/authRedirect";

// Mock Supabase client
const mockSignInWithOAuth = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    rpc: vi.fn(async () => ({ data: false, error: null })),
  },
}));

// Mock AuthContext
const mockAuth = {
  user: null,
  session: null,
  loading: false,
  isAdmin: false,
  signIn: vi.fn(async () => {}),
  signUp: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

describe("Google OAuth & Safe Redirect Implementation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com" }, error: null });
  });

  describe("sanitizeRedirectPath & getSafeOAuthRedirectUrl", () => {
    it("accepts valid internal paths", () => {
      expect(sanitizeRedirectPath("/checkout")).toBe("/checkout");
      expect(sanitizeRedirectPath("/profile?tab=orders")).toBe("/profile?tab=orders");
      expect(sanitizeRedirectPath("/")).toBe("/");
    });

    it("rejects protocol-relative URL bypasses (//evil.com)", () => {
      expect(sanitizeRedirectPath("//evil.com")).toBe("/");
      expect(sanitizeRedirectPath("///evil.com")).toBe("/");
    });

    it("rejects backslash bypasses (/\\evil.com or \\\\evil.com)", () => {
      expect(sanitizeRedirectPath("/\\evil.com")).toBe("/");
      expect(sanitizeRedirectPath("\\evil.com")).toBe("/");
      expect(sanitizeRedirectPath("/test\\path")).toBe("/");
    });

    it("rejects absolute third-party URLs and malicious protocols", () => {
      expect(sanitizeRedirectPath("https://evil.com")).toBe("/");
      expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/");
      expect(sanitizeRedirectPath("data:text/html,evil")).toBe("/");
      expect(sanitizeRedirectPath("/javascript:evil")).toBe("/");
    });

    it("constructs correct absolute OAuth redirect URL without open redirect risk", () => {
      const target = getSafeOAuthRedirectUrl("/checkout");
      expect(target).toBe(`${window.location.origin}/checkout`);

      const maliciousTarget = getSafeOAuthRedirectUrl("//phishing.com");
      expect(maliciousTarget).toBe(`${window.location.origin}/`);
    });
  });

  describe("Auth UI — Google Button Integration", () => {
    it("renders Continue with Google button on Sign In tab", () => {
      render(
        <MemoryRouter initialEntries={["/auth?tab=signin"]}>
          <Auth />
        </MemoryRouter>
      );

      const googleButtons = screen.getAllByRole("button", { name: /continue with google/i });
      expect(googleButtons.length).toBeGreaterThanOrEqual(1);
      expect(googleButtons[0]).toBeInTheDocument();
    });

    it("renders Continue with Google button on Create Account tab", () => {
      render(
        <MemoryRouter initialEntries={["/auth?tab=signup"]}>
          <Auth />
        </MemoryRouter>
      );

      const googleButtons = screen.getAllByRole("button", { name: /continue with google/i });
      expect(googleButtons.length).toBeGreaterThanOrEqual(1);
      expect(googleButtons[0]).toBeInTheDocument();
    });

    it("invokes supabase.auth.signInWithOAuth with google provider and safe redirect", async () => {
      render(
        <MemoryRouter initialEntries={["/auth?redirect=/checkout"]}>
          <Auth />
        </MemoryRouter>
      );

      const googleButton = screen.getAllByRole("button", { name: /continue with google/i })[0];
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/checkout`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    });

    it("displays loading state and prevents duplicate clicks while connecting", async () => {
      // Delay response to test loading state
      let resolvePromise: any;
      mockSignInWithOAuth.mockReturnValue(new Promise((res) => { resolvePromise = res; }));

      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      const googleButton = screen.getAllByRole("button", { name: /continue with google/i })[0];
      fireEvent.click(googleButton);

      // Loading state should show spinner / connecting text and be disabled
      expect(await screen.findByText(/connecting to google/i)).toBeInTheDocument();
      expect(googleButton).toBeDisabled();

      // Second click while loading should NOT trigger additional calls
      fireEvent.click(googleButton);
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);

      resolvePromise({ data: {}, error: null });
    });

    it("handles OAuth initiation error gracefully without crashing", async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({
        data: null,
        error: new Error("Network error connecting to OAuth provider"),
      });

      render(
        <MemoryRouter initialEntries={["/auth"]}>
          <Auth />
        </MemoryRouter>
      );

      const googleButton = screen.getAllByRole("button", { name: /continue with google/i })[0];
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
      });

      // Button should be re-enabled after failure
      await waitFor(() => {
        expect(googleButton).not.toBeDisabled();
      });
    });

    it("renders verifying session indicator in Auth when loading is true and does not render forms", () => {
      mockAuth.loading = true;
      mockAuth.user = null;

      render(
        <MemoryRouter initialEntries={["/auth?redirect=/profile"]}>
          <Auth />
        </MemoryRouter>
      );

      expect(screen.getByText(/verifying session\.\.\./i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();

      // Reset
      mockAuth.loading = false;
    });

    it("redirects authenticated user to safe redirect destination when session is present", () => {
      mockAuth.loading = false;
      mockAuth.user = { id: "test-user-id", email: "user@example.com" } as any;

      const { container } = render(
        <MemoryRouter initialEntries={["/auth?redirect=/profile"]}>
          <Auth />
        </MemoryRouter>
      );

      // Should not render login form when user is authenticated
      expect(screen.queryByRole("button", { name: /continue with google/i })).not.toBeInTheDocument();

      // Reset
      mockAuth.user = null;
    });
  });
});
