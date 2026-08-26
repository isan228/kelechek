export type ApiUser = {
  id: string;
  phone: string;
  login?: string | null;
  locale: "ru" | "ky";
  roles: string[];
  firstName: string | null;
  lastName: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP_${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<{ user: ApiUser }>("/api/me"),
  login: (login: string, password: string) =>
    request<{ user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    }),
  register: (data: { login: string; password: string; phone: string; firstName?: string }) =>
    request<{ user: ApiUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  adminLogin: (login: string, password: string) =>
    request<{ user: ApiUser }>("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    }),
  logout: () => request("/api/auth/logout", { method: "GET" }),
  siteTexts: (locale = "ru") =>
    request<{
      locale: string;
      texts: Record<string, string>;
      groups: { id: string; titleRu: string; fields: { key: string; labelRu: string; multiline?: boolean }[] }[];
    }>(`/api/site-texts?locale=${locale}`),
  sitePhotos: () =>
    request<{
      photos: Record<string, string>;
      slots: { key: string; labelRu: string; defaultUrl: string }[];
    }>("/api/site-photos"),
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
  publicCoaches: (locale = "ru") =>
    request<{
      coaches: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        bio: string | null;
        photoUrl: string | null;
      }[];
    }>(`/api/coaches?locale=${locale}`),
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
        login: string | null;
        firstName: string | null;
        lastName: string | null;
        bioRu: string | null;
        bioKy: string | null;
        photoUrl: string | null;
        locale: "ru" | "ky";
        roles: string[];
        status: string;
        createdAt: string;
      }[];
    }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  adminCreateUser: (data: {
    phone: string;
    login?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    bioRu?: string;
    bioKy?: string;
    photoUrl?: string;
    roles: string[];
  }) => request("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
  adminPatchUser: (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      phone: string;
      login: string;
      password: string;
      bioRu: string;
      bioKy: string;
      photoUrl: string;
      roles: string[];
      status: string;
      locale: string;
    }>,
  ) => request(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  adminSiteTexts: () =>
    request<{
      groups: { id: string; titleRu: string; fields: { key: string; labelRu: string; multiline?: boolean }[] }[];
      texts: Record<string, { ru: string; ky: string }>;
    }>("/api/admin/site-texts"),
  adminSaveSiteTexts: (items: { key: string; locale: "ru" | "ky"; value: string }[]) =>
    request("/api/admin/site-texts", { method: "PUT", body: JSON.stringify({ items }) }),
  adminSitePhotos: () =>
    request<{
      slots: { key: string; labelRu: string; defaultUrl: string }[];
      photos: Record<string, string>;
    }>("/api/admin/site-photos"),
  adminUploadSitePhoto: async (key: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/admin/site-photos/${encodeURIComponent(key)}`, {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `HTTP_${res.status}`);
    }
    return res.json() as Promise<{ ok: true; key: string; url: string }>;
  },
  adminResetSitePhoto: (key: string) =>
    request<{ ok: true; key: string; url: string }>(`/api/admin/site-photos/${encodeURIComponent(key)}/reset`, {
      method: "POST",
    }),
  adminUploadMedia: async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/media", {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `HTTP_${res.status}`);
    }
    return res.json() as Promise<{ ok: true; url: string }>;
  },
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
