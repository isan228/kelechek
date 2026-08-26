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
  register: (data: {
    login: string;
    password: string;
    phone: string;
    firstName?: string;
    tariffId: string;
  }) =>
    request<{
      user: ApiUser;
      payment?: { id: string; status: string };
      paymentUrl?: string | null;
    }>("/api/auth/register", {
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
  pay: (tariffId: string) =>
    request<{ payment: { id: string; status: string }; paymentUrl?: string | null }>("/api/payments", {
      method: "POST",
      body: JSON.stringify({ tariffId }),
    }),
  paymentStatus: (id: string) =>
    request<{ payment: { id: string; status: string; amountKgs: number; paidAt: string | null } }>(
      `/api/payments/${encodeURIComponent(id)}`,
    ),
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
  endRelation: (traineeId?: string) =>
    request("/api/me/relation/end", {
      method: "POST",
      body: JSON.stringify(traineeId ? { traineeId } : {}),
    }),
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
        login?: string | null;
        relationStartedAt: string;
      }[];
    }>("/api/coach/trainees"),
  coachDashboard: () =>
    request<{
      coach: {
        id: string;
        login: string | null;
        phone: string;
        firstName: string | null;
        lastName: string | null;
        bioRu: string | null;
        bioKy: string | null;
        sportRu: string | null;
        sportKy: string | null;
        photoUrl: string | null;
        locale: "ru" | "ky";
        createdAt: string;
      };
      traineeCount: number;
      earnedKgs: number;
      pendingInvites: number;
      trainees: {
        id: string;
        login: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string;
        relationStartedAt: string;
        membershipEndsAt: string | null;
      }[];
    }>("/api/coach/dashboard"),
  coachPatchProfile: (data: {
    sportRu?: string;
    sportKy?: string;
    bioRu?: string;
    bioKy?: string;
    firstName?: string;
    lastName?: string;
  }) => request<{ coach: Record<string, unknown> }>("/api/coach/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  coachSessions: () =>
    request<{
      classId: string;
      sessions: {
        id: string;
        title: string;
        startsAt: string;
        endsAt: string;
        status: string;
        presentCount: number;
        fromWeekly: boolean;
      }[];
    }>("/api/coach/sessions"),
  coachSessionsHistory: () =>
    request<{
      traineeTotal: number;
      sessions: {
        id: string;
        title: string;
        startsAt: string;
        endsAt: string;
        status: string;
        presentCount: number;
        fromWeekly: boolean;
      }[];
    }>("/api/coach/sessions/history"),
  coachWeeklySlots: () =>
    request<{
      classId: string;
      slots: {
        id: string;
        weekday: number;
        startHm: string;
        endHm: string;
        title: string;
        isActive: boolean;
      }[];
    }>("/api/coach/weekly-slots"),
  coachCreateWeeklySlot: (data: {
    weekday: number;
    startHm: string;
    endHm: string;
    title: string;
  }) =>
    request<{
      slot: {
        id: string;
        weekday: number;
        startHm: string;
        endHm: string;
        title: string;
        isActive: boolean;
      };
    }>("/api/coach/weekly-slots", { method: "POST", body: JSON.stringify(data) }),
  coachPatchWeeklySlot: (
    id: string,
    data: Partial<{
      weekday: number;
      startHm: string;
      endHm: string;
      title: string;
      isActive: boolean;
    }>,
  ) =>
    request(`/api/coach/weekly-slots/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  coachDeleteWeeklySlot: (id: string) =>
    request(`/api/coach/weekly-slots/${encodeURIComponent(id)}`, { method: "DELETE" }),
  coachCreateSession: (data: { title: string; startsAt: string; endsAt: string }) =>
    request<{ session: { id: string; title: string; startsAt: string; endsAt: string } }>(
      "/api/coach/sessions",
      { method: "POST", body: JSON.stringify(data) },
    ),
  coachDeleteSession: (id: string) =>
    request(`/api/coach/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  coachSessionQr: (id: string) =>
    request<{
      session: { id: string; title: string; startsAt: string; endsAt: string };
      joinUrl: string;
      present: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        phone: string;
        markedAt: string;
      }[];
    }>(`/api/coach/sessions/${encodeURIComponent(id)}/qr`),
  mySchedule: () =>
    request<{
      coach: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        sportRu: string | null;
        sportKy: string | null;
      } | null;
      weeklySlots: {
        id: string;
        weekday: number;
        startHm: string;
        endHm: string;
        title: string;
      }[];
      sessions: {
        id: string;
        title: string;
        startsAt: string;
        endsAt: string;
        status: string;
        fromWeekly: boolean;
        attended: boolean;
        markedAt: string | null;
      }[];
    }>("/api/me/schedule"),
  checkIn: (token: string) =>
    request<{
      ok: true;
      already: boolean;
      session: { id: string; title: string; startsAt?: string };
    }>("/api/checkin", { method: "POST", body: JSON.stringify({ token }) }),
  notifications: () =>
    request<{
      unread: number;
      notifications: {
        id: string;
        type: string;
        payload: Record<string, unknown>;
        readAt: string | null;
        createdAt: string;
      }[];
    }>("/api/me/notifications"),
  notificationsReadAll: () =>
    request("/api/me/notifications/read-all", { method: "POST" }),
  notificationRead: (id: string) =>
    request(`/api/me/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
  coachQr: () =>
    request<{
      token: string;
      day: string;
      validUntil: string;
      joinUrl: string;
      coach: { id: string; firstName: string | null; lastName: string | null };
    }>("/api/coach/qr"),
  joinCoach: (token: string, confirmReplace = false) =>
    request<{
      ok: true;
      alreadyLinked: boolean;
      coachId: string;
      coach?: { id: string; firstName: string | null; lastName: string | null };
    }>("/api/join/coach", {
      method: "POST",
      body: JSON.stringify({ token, confirmReplace }),
    }),
  publicCoaches: (locale = "ru") =>
    request<{
      coaches: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        bio: string | null;
        sport: string | null;
        photoUrl: string | null;
      }[];
    }>(`/api/coaches?locale=${locale}`),
  adminCreateCoach: (data: {
    login: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    bioRu?: string;
    bioKy?: string;
    sportRu?: string;
    sportKy?: string;
    photoUrl?: string;
  }) => request("/api/admin/coaches", { method: "POST", body: JSON.stringify(data) }),
  adminOverview: () =>
    request<{
      users: number;
      coaches: number;
      tariffs: number;
      content: number;
      payments: number;
      paidKgs: number;
    }>("/api/admin/overview"),
  adminCoaches: () =>
    request<{
      coaches: {
        id: string;
        login: string | null;
        phone: string;
        firstName: string | null;
        lastName: string | null;
        bioRu: string | null;
        bioKy: string | null;
        photoUrl: string | null;
        status: string;
        createdAt: string;
        traineeCount: number;
      }[];
    }>("/api/admin/coaches"),
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
    phone?: string;
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
