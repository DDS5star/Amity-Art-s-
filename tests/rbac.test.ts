import { describe, it, expect } from "vitest";
import { hasPermission } from "@/server/middleware/auth";

describe("RBAC permission matrix (per spec)", () => {
  it("super admin can do everything", () => {
    expect(hasPermission("SUPER_ADMIN", "settings.manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "users.manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "payments.manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "catalog.manage")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "wholesalers.approve")).toBe(true);
  });

  it("manager can manage catalog/inventory/orders/cms", () => {
    expect(hasPermission("MANAGER", "catalog.manage")).toBe(true);
    expect(hasPermission("MANAGER", "inventory.manage")).toBe(true);
    expect(hasPermission("MANAGER", "orders.view")).toBe(true);
    expect(hasPermission("MANAGER", "orders.process")).toBe(true);
    expect(hasPermission("MANAGER", "cms.manage")).toBe(true);
  });

  it("manager CANNOT manage settings, payments, users, or approve wholesalers", () => {
    expect(hasPermission("MANAGER", "settings.manage")).toBe(false);
    expect(hasPermission("MANAGER", "payments.manage")).toBe(false);
    expect(hasPermission("MANAGER", "users.manage")).toBe(false);
    expect(hasPermission("MANAGER", "wholesalers.approve")).toBe(false);
    expect(hasPermission("MANAGER", "orders.edit")).toBe(false);
    expect(hasPermission("MANAGER", "analytics.view")).toBe(false);
  });

  it("wholesalers and customers have no admin permissions", () => {
    expect(hasPermission("WHOLESALER", "catalog.manage")).toBe(false);
    expect(hasPermission("WHOLESALER", "orders.view")).toBe(false);
    expect(hasPermission("CUSTOMER", "catalog.manage")).toBe(false);
    expect(hasPermission("CUSTOMER", "users.manage")).toBe(false);
  });
});
