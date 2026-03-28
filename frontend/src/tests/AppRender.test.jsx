import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import App from "../App";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}));

describe("App layout", () => {
  it("renders nested route content on public route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<div>Welcome to Lantern</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Welcome to Lantern")).toBeInTheDocument();
  });

  it("does not render authenticated footer on welcome route when logged out", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<div>Home Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(screen.queryByText(/Lantern\. All rights reserved\./i)).not.toBeInTheDocument();
  });
});