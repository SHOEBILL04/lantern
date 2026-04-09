import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GoogleAuthSuccess from "../pages/GoogleAuthSuccess/GoogleAuthSuccess";

const syncAuthFromServer = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    syncAuthFromServer,
  }),
}));

describe("GoogleAuthSuccess", () => {
  beforeEach(() => {
    syncAuthFromServer.mockReset();
  });

  it("syncs auth and redirects to dashboard on success", async () => {
    syncAuthFromServer.mockResolvedValueOnce({ success: true, user: { id: 1 } });

    render(
      <MemoryRouter initialEntries={["/auth/google/success"]}>
        <Routes>
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });

    expect(syncAuthFromServer).toHaveBeenCalledTimes(1);
  });

  it("redirects to login on sync failure", async () => {
    syncAuthFromServer.mockResolvedValueOnce({ success: false });

    render(
      <MemoryRouter initialEntries={["/auth/google/success"]}>
        <Routes>
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    expect(syncAuthFromServer).toHaveBeenCalledTimes(1);
  });
});
