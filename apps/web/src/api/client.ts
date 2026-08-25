export type ApiUser = {
  id: string;
  phone: string;
  locale: "ru" | "ky";
  roles: string[];
  firstName: string | null;
  lastName: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<{ user: ApiUser }>("/api/me"),
  requestOtp: (phone: string) =>
    request<{ ok: boolean; devCode?: string }>("/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, code: string) =>
    request<{ user: ApiUser }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  patchMe: (data: Partial<Pick<ApiUser, "locale" | "firstName" | "lastName">>) =>
    request<{ user: ApiUser }>("/api/me", { method: "PATCH", body: JSON.stringify(data) }),
  tariffs: (locale = "ru") =>
    request<{
      tariffs: { id: string; priceKgs: number; periodDays: number; name: string; description: string }[];
    }>(`/api/tariffs?locale=${locale}`),
  pay: (tariffId: string) => request<{ payment: { id: string; status: string } }>("/api/payments", {
    method: "POST",
    body: JSON.stringify({ tariffId }),
  }),
  balance: () =>
    request<{
      balance: { accrued: number; available: number; hold: number };
      streak: number;
      membership: { startsAt: string; endsAtExclusive: string } | null;
      withdrawalProgress: {
        holdingMonths: number;
        monthsHeld: number;
        holdingPassed: boolean;
        minAmountKgs: number;
        minAmountPassed: boolean;
      };
    }>("/api/me/balance"),
  ledger: () =>
    request<{
      entries: {
        id: string;
        type: string;
        amount: number;
        signedAmount: number;
        createdAt: string;
        appliedTraineeRateBps: number | null;
      }[];
    }>("/api/me/ledger"),
  content: (locale = "ru") =>
    request<{
      canReadBody: boolean;
      items: {
        id: string;
        type: string;
        title: string;
        summary: string;
        bodyAvailable: boolean;
        tags: string[];
      }[];
    }>(`/api/content?locale=${locale}`),
  contentItem: (id: string, locale = "ru") =>
    request<{
      id: string;
      type: string;
      title: string;
      summary: string;
      bodyAvailable: boolean;
      bodyRich: string | null;
      contraindications: string | null;
    }>(`/api/content/${id}?locale=${locale}`),
  invitations: () =>
    request<{
      invites: {
        id: string;
        expiresAt: string;
        coach: { id: string; firstName: string | null; lastName: string | null; phone: string };
      }[];
      relation: {
        coach: { id: string; firstName: string | null; lastName: string | null };
      } | null;
    }>("/api/me/invitations"),
  respondInvite: (id: string, accept: boolean, confirmReplace = false) =>
    request(`/api/invitations/${id}/respond`, {
      method: "POST",
      body: JSON.stringify({ accept, confirmReplace }),
    }),
  endRelation: () => request("/api/me/relation/end", { method: "POST" }),
  sendInvite: (phone: string) =>
    request<{ traineeHasCoach: boolean }>("/api/coach/invitations", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  coachTrainees: () =>
    request<{
      trainees: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        phone: string;
        relationStartedAt: string;
      }[];
    }>("/api/coach/trainees"),
  publicCoaches: () =>
    request<{ coaches: { id: string; firstName: string | null; lastName: string | null }[] }>("/api/coaches"),
  adminOverview: () =>
    request<{
      users: number;
      coaches: number;
      tariffs: number;
      content: number;
      payments: number;
      paidKgs: number;
    }>("/api/admin/overview"),
  adminUsers: (q = "") =>
    request<{
      users: {
        id: string;
        phone: string;
        firstName: string | null;
        lastName: string | null;
        locale: "ru" | "ky";
        roles: string[];
        status: string;
        createdAt: string;
      }[];
    }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  adminCreateUser: (data: {
    phone: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
  }) => request("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
  adminPatchUser: (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      roles: string[];
      status: string;
      locale: string;
    }>,
  ) => request(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminTariffs: () =>
    request<{
      tariffs: {
        id: string;
        priceKgs: number;
        periodDays: number;
        isActive: boolean;
        ru: { name: string; description: string };
        ky: { name: string; description: string };
      }[];
    }>("/api/admin/tariffs"),
  adminSaveTariff: (
    id: string | null,
    data: {
      priceKgs: number;
      periodDays: number;
      isActive: boolean;
      ru: { name: string; description: string };
      ky: { name: string; description: string };
    },
  ) =>
    request(id ? `/api/admin/tariffs/${id}` : "/api/admin/tariffs", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    }),
  adminContent: () =>
    request<{
      items: {
        id: string;
        type: string;
        status: string;
        ru: { title: string; summary: string; bodyRich: string; contraindications: string };
        ky: { title: string; summary: string; bodyRich: string; contraindications: string };
      }[];
    }>("/api/admin/content"),
  adminSaveContent: (
    id: string | null,
    data: {
      type: string;
      status: string;
      ru: { title: string; summary: string; bodyRich: string; contraindications: string };
      ky: { title: string; summary: string; bodyRich: string; contraindications: string };
    },
  ) =>
    request(id ? `/api/admin/content/${id}` : "/api/admin/content", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(data),
    }),
  adminArchiveContent: (id: string) => request(`/api/admin/content/${id}`, { method: "DELETE" }),
  adminPayments: () =>
    request<{
      payments: {
        id: string;
        amountKgs: number;
        status: string;
        createdAt: string;
        paidAt: string | null;
        tariffName: string;
        user: { phone: string; firstName: string | null; lastName: string | null };
      }[];
    }>("/api/admin/payments"),
};
