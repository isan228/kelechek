import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

type Tab = "home" | "users" | "tariffs" | "content" | "payments";
const ROLES = ["TRAINEE", "COACH", "ADMIN", "CONTENT_EDITOR"] as const;
const TYPES = ["ARTICLE", "EXERCISE", "PROGRAM"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"] as const;

const emptyTariff = {
  priceKgs: 1000,
  periodDays: 30,
  isActive: true,
  ru: { name: "", description: "" },
  ky: { name: "", description: "" },
};
const emptyContent = {
  type: "ARTICLE",
  status: "PUBLISHED",
  ru: { title: "", summary: "", bodyRich: "", contraindications: "" },
  ky: { title: "", summary: "", bodyRich: "", contraindications: "" },
};

export function AdminPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [msg, setMsg] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!user.roles.includes("ADMIN")) return <Navigate to="/cabinet" replace />;

  return (
    <div className="wrap section">
      <p className="kicker">{t("nav.admin")}</p>
      <h1>{t("admin.title")}</h1>
      <p className="muted">{t("admin.lead")}</p>
      <div className="admin-tabs">
        {(["home", "users", "tariffs", "content", "payments"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "" : "ghost"}
            onClick={() => {
              setTab(id);
              setMsg(null);
            }}
          >
            {t(`admin.tab.${id}`)}
          </button>
        ))}
      </div>
      {msg && <p className="ok">{msg}</p>}
      {tab === "home" && <Overview />}
      {tab === "users" && <UsersTab onSaved={() => setMsg(t("profile.saved"))} />}
      {tab === "tariffs" && <TariffsTab onSaved={() => setMsg(t("profile.saved"))} />}
      {tab === "content" && <ContentTab onSaved={() => setMsg(t("profile.saved"))} />}
      {tab === "payments" && <PaymentsTab />}
    </div>
  );
}

function Overview() {
  const { t } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminOverview>> | null>(null);
  useEffect(() => {
    void api.adminOverview().then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <p className="muted">{t("admin.loading")}</p>;
  return (
    <div className="stats">
      <div className="stat"><b>{data.users}</b><span>{t("admin.tab.users")}</span></div>
      <div className="stat"><b>{data.coaches}</b><span>{t("nav.coaches")}</span></div>
      <div className="stat"><b>{data.tariffs}</b><span>{t("admin.tab.tariffs")}</span></div>
      <div className="stat"><b>{data.content}</b><span>{t("admin.tab.content")}</span></div>
      <div className="stat"><b>{data.payments}</b><span>{t("admin.tab.payments")}</span></div>
      <div className="stat"><b>{data.paidKgs}</b><span>{t("admin.paidKgs")}</span></div>
    </div>
  );
}

function UsersTab({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminUsers>>["users"]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({
    phone: "+996",
    login: "",
    password: "",
    firstName: "",
    lastName: "",
    status: "ACTIVE",
    roles: ["TRAINEE"] as string[],
  });

  async function load(query = q) {
    const res = await api.adminUsers(query);
    setRows(res.users);
  }
  useEffect(() => {
    void load();
  }, []);

  function open(row?: (typeof rows)[0]) {
    if (!row) {
      setEditId("new");
      setForm({
        phone: "+996",
        login: "",
        password: "",
        firstName: "",
        lastName: "",
        status: "ACTIVE",
        roles: ["TRAINEE"],
      });
      return;
    }
    setEditId(row.id);
    setForm({
      phone: row.phone,
      login: row.login ?? "",
      password: "",
      firstName: row.firstName ?? "",
      lastName: row.lastName ?? "",
      status: row.status,
      roles: row.roles,
    });
  }

  function toggleRole(role: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      if (editId === "new") {
        await api.adminCreateUser(form);
      } else if (editId) {
        const { password, ...rest } = form;
        await api.adminPatchUser(editId, password ? form : rest);
      }
      setEditId(null);
      onSaved();
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "error");
    }
  }

  return (
    <>
      <div className="row" style={{ margin: "1rem 0" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.search")} />
        <button type="button" className="ghost" onClick={() => void load(q)}>{t("admin.find")}</button>
        <button type="button" onClick={() => open()}>{t("admin.createUser")}</button>
      </div>
      {editId && (
        <form className="card admin-form" onSubmit={(e) => void save(e)}>
          <h3>{editId === "new" ? t("admin.createUser") : t("admin.editUser")}</h3>
          {err && <p className="error">{err}</p>}
          <label>{t("auth.login")}<input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} /></label>
          <label>{t("auth.password")}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editId === "new" ? "" : t("admin.passwordOptional")} /></label>
          <label>{t("auth.phone")}<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>{t("profile.firstName")}<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label>{t("profile.lastName")}<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          <label>
            {t("admin.status")}
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </label>
          <p className="muted">{t("admin.roles")}</p>
          <div className="row">
            {ROLES.map((role) => (
              <label key={role} className="check">
                <input
                  type="checkbox"
                  checked={form.roles.includes(role)}
                  disabled={editId === me?.id && role === "ADMIN" && form.roles.includes("ADMIN")}
                  onChange={() => toggleRole(role)}
                />
                {role}
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit">{t("profile.save")}</button>
            <button type="button" className="ghost" onClick={() => setEditId(null)}>{t("admin.cancel")}</button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("auth.login")}</th>
              <th>{t("auth.phone")}</th>
              <th>{t("profile.firstName")}</th>
              <th>{t("admin.roles")}</th>
              <th>{t("admin.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.login || "—"}</td>
                <td>{row.phone}</td>
                <td>{[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}</td>
                <td>{row.roles.join(", ")}</td>
                <td>{row.status}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => open(row)}>{t("admin.edit")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TariffsTab({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminTariffs>>["tariffs"]>([]);
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(emptyTariff);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setRows((await api.adminTariffs()).tariffs);
  }
  useEffect(() => {
    void load();
  }, []);

  function open(row?: (typeof rows)[0]) {
    if (!row) {
      setEditId("new");
      setForm(emptyTariff);
      return;
    }
    setEditId(row.id);
    setForm({
      priceKgs: row.priceKgs,
      periodDays: row.periodDays,
      isActive: row.isActive,
      ru: row.ru,
      ky: row.ky,
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api.adminSaveTariff(editId === "new" ? null : editId, form);
      setEditId(null);
      onSaved();
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "error");
    }
  }

  return (
    <>
      <div className="row" style={{ margin: "1rem 0" }}>
        <button type="button" onClick={() => open()}>{t("admin.createTariff")}</button>
      </div>
      {editId && (
        <form className="card admin-form" onSubmit={(e) => void save(e)}>
          {err && <p className="error">{err}</p>}
          <div className="grid two">
            <label>{t("admin.price")}<input type="number" min={1} value={form.priceKgs} onChange={(e) => setForm({ ...form, priceKgs: Number(e.target.value) })} /></label>
            <label>{t("admin.days")}<input type="number" min={1} value={form.periodDays} onChange={(e) => setForm({ ...form, periodDays: Number(e.target.value) })} /></label>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            {t("admin.active")}
          </label>
          <div className="grid two">
            <div>
              <h3>RU</h3>
              <label>{t("admin.name")}<input value={form.ru.name} onChange={(e) => setForm({ ...form, ru: { ...form.ru, name: e.target.value } })} /></label>
              <label>{t("admin.description")}<textarea value={form.ru.description} onChange={(e) => setForm({ ...form, ru: { ...form.ru, description: e.target.value } })} /></label>
            </div>
            <div>
              <h3>KY</h3>
              <label>{t("admin.name")}<input value={form.ky.name} onChange={(e) => setForm({ ...form, ky: { ...form.ky, name: e.target.value } })} /></label>
              <label>{t("admin.description")}<textarea value={form.ky.description} onChange={(e) => setForm({ ...form, ky: { ...form.ky, description: e.target.value } })} /></label>
            </div>
          </div>
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit">{t("profile.save")}</button>
            <button type="button" className="ghost" onClick={() => setEditId(null)}>{t("admin.cancel")}</button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("admin.name")}</th>
              <th>{t("admin.price")}</th>
              <th>{t("admin.days")}</th>
              <th>{t("admin.active")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.ru.name}</td>
                <td>{row.priceKgs}</td>
                <td>{row.periodDays}</td>
                <td>{row.isActive ? "✓" : "—"}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => open(row)}>{t("admin.edit")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ContentTab({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminContent>>["items"]>([]);
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(emptyContent);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setRows((await api.adminContent()).items);
  }
  useEffect(() => {
    void load();
  }, []);

  function open(row?: (typeof rows)[0]) {
    if (!row) {
      setEditId("new");
      setForm(emptyContent);
      return;
    }
    setEditId(row.id);
    setForm({ type: row.type, status: row.status, ru: row.ru, ky: row.ky });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api.adminSaveContent(editId === "new" ? null : editId, form);
      setEditId(null);
      onSaved();
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "error");
    }
  }

  async function archive(id: string) {
    await api.adminArchiveContent(id);
    onSaved();
    await load();
  }

  return (
    <>
      <div className="row" style={{ margin: "1rem 0" }}>
        <button type="button" onClick={() => open()}>{t("admin.createContent")}</button>
      </div>
      {editId && (
        <form className="card admin-form" onSubmit={(e) => void save(e)}>
          {err && <p className="error">{err}</p>}
          <div className="grid two">
            <label>
              {t("admin.type")}
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label>
              {t("admin.status")}
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <div className="grid two">
            {(["ru", "ky"] as const).map((loc) => (
              <div key={loc}>
                <h3>{loc.toUpperCase()}</h3>
                <label>{t("admin.heading")}<input value={form[loc].title} onChange={(e) => setForm({ ...form, [loc]: { ...form[loc], title: e.target.value } })} /></label>
                <label>{t("admin.summary")}<textarea value={form[loc].summary} onChange={(e) => setForm({ ...form, [loc]: { ...form[loc], summary: e.target.value } })} /></label>
                <label>{t("admin.body")}<textarea className="tall" value={form[loc].bodyRich} onChange={(e) => setForm({ ...form, [loc]: { ...form[loc], bodyRich: e.target.value } })} /></label>
                <label>{t("content.contraindications")}<textarea value={form[loc].contraindications} onChange={(e) => setForm({ ...form, [loc]: { ...form[loc], contraindications: e.target.value } })} /></label>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit">{t("profile.save")}</button>
            <button type="button" className="ghost" onClick={() => setEditId(null)}>{t("admin.cancel")}</button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("admin.heading")}</th>
              <th>{t("admin.type")}</th>
              <th>{t("admin.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.ru.title}</td>
                <td>{row.type}</td>
                <td>{row.status}</td>
                <td>
                  <button type="button" className="ghost" onClick={() => open(row)}>{t("admin.edit")}</button>
                  {row.status !== "ARCHIVED" && (
                    <button type="button" className="ghost" onClick={() => void archive(row.id)}>{t("admin.archive")}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaymentsTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminPayments>>["payments"]>([]);
  useEffect(() => {
    void api.adminPayments().then((r) => setRows(r.payments));
  }, []);
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>{t("auth.phone")}</th>
            <th>{t("admin.name")}</th>
            <th>{t("admin.price")}</th>
            <th>{t("admin.status")}</th>
            <th>{t("admin.date")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.user.phone}</td>
              <td>{row.tariffName}</td>
              <td>{row.amountKgs}</td>
              <td>{row.status}</td>
              <td>{new Date(row.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted">{t("admin.emptyPayments")}</p>}
    </div>
  );
}
