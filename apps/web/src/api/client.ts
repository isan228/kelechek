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
  tariffs: () =>
    request<{
      tariffs: { id: string; priceKgs: number; periodDays: number; name: string; description: string }[];
    }>("/api/tariffs"),
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
  content: () =>
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
    }>("/api/content"),
  contentItem: (id: string) =>
    request<{
      id: string;
      type: string;
      title: string;
      summary: string;
      bodyAvailable: boolean;
      bodyRich: string | null;
      contraindications: string | null;
    }>(`/api/content/${id}`),
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
};
