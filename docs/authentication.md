# ConstroTrait Authentication Architecture & Standards

This document establishes the mandatory standards and architectural guidelines for authentication, session handling, route protection, and identity verification in ConstroTrait.

---

## 1. Authentication Architecture Overview

* **Single Source of Truth**: Supabase Auth (`auth.users`) is the sole identity provider and authentication engine. Application profiles (`public.profiles`) extend user identities with organizational attributes (roles, employee ID, branch assignment) via foreign key on `auth.users.id`.
* **Cookie-Based SSR Sessions**: All authentication state is managed via secure, HTTP-only, encrypted cookie sessions handled through `@supabase/ssr`.
* **Zero Client Trust**: Client-side authentication tokens, cookies, localStorage, or UI states are never trusted for authorization decisions. Server Actions and API route handlers must independently resolve and verify the session server-side.

---

## 2. Server-Side Session Handling

### Session Resolution Pattern

All server-side operations must resolve user identity using `getAuthenticatedUser()` or `getAuthenticatedUserWithRoles()` defined in `src/services/auth.service.ts`:

```typescript
import { getAuthenticatedUserWithRoles } from "@/services/auth.service";

export async function myServerAction() {
  const user = await getAuthenticatedUserWithRoles();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }
  // User authenticated and roles resolved
}
```

* `getAuthenticatedUser()` resolves the Supabase Auth session via `supabase.auth.getUser()`.
* `getAuthenticatedUserWithRoles()` resolves both the auth user and their corresponding profile in `public.profiles`, loading `roles`, `allRoles`, `activeRole`, and `branch_id`.
* Both functions are wrapped with React `cache(...)` to deduplicate database lookups within the same server request lifecycle.

---

## 3. Role Evaluation & Multi-Role Support

### Multi-Role Evaluation

Employees in ConstroTrait may hold multiple roles simultaneously (e.g., `['BRANCH_MANAGER_ADMINISTRATIVE', 'TEST_ENGINEER']`).

* **Mandatory Rule**: Authorization checks must evaluate **all roles assigned to the employee** (`user.roles`), never assuming an employee only holds a single role.
* Role-checking helper functions from `src/config/roles.ts` must be used for all role evaluations:
  - `isSuperAdmin(roles)`
  - `isBranchManager(roles)`
  - `isHR(roles)`
  - `canManageClientsAndJobs(roles)`
  - `canManageJobAssignments(roles)`
  - `canManageBilling(roles)`
  - `canManageTestMaster(roles)`
  - `canAccessSystemConsole(roles)`

---

## 4. Route Protection & Middleware

* **Next.js Middleware (`src/middleware.ts`)**:
  - Intercepts all incoming requests before page rendering.
  - Refreshes expiring Supabase auth session tokens via `@supabase/ssr`.
  - Redirects unauthenticated requests attempting to access `/(dashboard)` or protected paths to `/login`.
  - Redirects authenticated users accessing public auth routes (e.g., `/login`, `/forgot-password`) to `/dashboard`.
* **Server Action Defense-in-Depth**:
  - Middleware redirection protects page routes; however, **Server Actions can be invoked directly over HTTP POST**.
  - Every Server Action must independently enforce authentication and authorization guards at its entry boundary.

---

## 5. Branch Isolation & Multi-Tenant Boundaries

* Non-superadmin users belong to a specific branch (`branch_id`).
* Cross-branch data access or modification is strictly prohibited.
* Server Actions and database queries must:
  - Verify caller's `branch_id`.
  - Force branch filtering to `user.branch_id` unless the caller is verified as `SUPER_ADMIN`.
  - Database tables must enforce Row Level Security (RLS) matching the user's JWT branch metadata or profile branch.

---

## 6. Login Auditing & Device Telemetry

* Successful and failed login attempts must be recorded to `public.login_audit_logs`.
* Audit records capture:
  - `user_id`, `email`, `full_name`, and all assigned `roles`
  - High-entropy device telemetry: `ip_address`, `device_type`, `os`, `browser`, and optional screen resolution
  - Authentication status (`SUCCESS` or `FAILED`) and `failure_reason`
* Audit logging runs in isolated try/catch blocks to ensure audit infrastructure failures never break core authentication workflows.

---

## 7. Password & Credential Security

* Passwords must meet minimum complexity standards (minimum 8 characters).
* Passwords must NEVER be stored in plain text, logged, or saved in application database tables.
* Administrative password resets must enforce branch and role hierarchy:
  - Non-superadmins cannot reset `SUPER_ADMIN` passwords.
  - Branch managers can only reset passwords for employees within their own branch.
