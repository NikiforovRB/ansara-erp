"use client";

import { useEffect, useMemo, useState } from "react";
import { DeadlineBlock } from "@/components/cells/deadline-block";
import { PaymentBlock } from "@/components/cells/payment-block";
import { RightPanel } from "@/components/right-panel";
import { cmsOptions, type CmsValue } from "@/lib/cms-labels";
import { roleLabel } from "@/lib/role-labels";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fieldClass(extra = "") {
  return `form-input ${extra}`.trim();
}

function btnFooter(onCancel: () => void, onSave: () => void, disabled?: boolean) {
  return (
    <>
      <button
        type="button"
        className="rounded px-4 py-2 text-sm opacity-80 hover:opacity-100"
        onClick={onCancel}
      >
        Отмена
      </button>
      <button
        type="button"
        className="rounded px-4 py-2 text-sm font-medium disabled:opacity-40"
        style={{ backgroundColor: "#000", color: "#fff" }}
        data-theme-hack="ignore"
        onClick={() => void onSave()}
        disabled={disabled}
      >
        Сохранить
      </button>
    </>
  );
}

export function AddProjectPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetchJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone: phone || null,
          pinView: pin,
          shortDescription: shortDescription || null,
        }),
      });
      onCreated();
      setCustomerName("");
      setPhone("");
      setPin("");
      setShortDescription("");
    } catch {
      alert("Не удалось создать проект");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightPanel
      open={open}
      title="Добавить проект"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy || pin.length !== 4)}
    >
      <label className="block text-xs text-[var(--muted)]">Имя заказчика</label>
      <input
        className={fieldClass()}
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />
      <label className="mt-4 block text-xs text-[var(--muted)]">Телефон</label>
      <input
        className={fieldClass()}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <label className="mt-4 block text-xs text-[var(--muted)]">
        ПИН-код на просмотр (4 цифры)
      </label>
      <input
        className={fieldClass()}
        value={pin}
        maxLength={4}
        inputMode="numeric"
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />
      <label className="mt-4 block text-xs text-[var(--muted)]">Короткое описание</label>
      <textarea
        className={fieldClass("min-h-[72px]")}
        value={shortDescription}
        onChange={(e) => setShortDescription(e.target.value)}
      />
    </RightPanel>
  );
}

export function CustomerPanel({
  open,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const j = await fetchJson(`/api/projects/${projectId}`);
        setData(j);
      } catch {
        setData(null);
      }
    })();
  }, [open, projectId]);

  const p = data?.project as
    | {
        customerName: string;
        phone: string | null;
        pinView: string;
        shortDescription: string | null;
        longDescription: string | null;
        cms: string | null;
        status: "active" | "paused" | "completed";
      }
    | undefined;
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [cms, setCms] = useState<CmsValue | "">("");
  const [status, setStatus] = useState<"active" | "paused" | "completed">("active");

  useEffect(() => {
    if (!p) return;
    setCustomerName(p.customerName);
    setPhone(p.phone ?? "");
    setPin(p.pinView);
    setShortDescription(p.shortDescription ?? "");
    setLongDescription(p.longDescription ?? "");
    setCms((p.cms ?? "") as CmsValue | "");
    setStatus(p.status);
  }, [p]);

  async function save() {
    if (!p) return;
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone: phone || null,
          pinView: pin,
          shortDescription: shortDescription || null,
          longDescription: longDescription || null,
          cms: cms || null,
          status,
        }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightPanel
      open={open}
      title="Заказчик"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy || !p || pin.length !== 4)}
    >
      {!p ? (
        <p className="text-sm text-[var(--muted)]">Загрузка…</p>
      ) : (
        <>
          <label className="block text-xs text-[var(--muted)]">Имя заказчика</label>
          <input
            className={fieldClass()}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <label className="mt-4 block text-xs text-[var(--muted)]">Телефон</label>
          <input className={fieldClass()} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label className="mt-4 block text-xs text-[var(--muted)]">ПИН-код на просмотр</label>
          <input
            className={fieldClass()}
            value={pin}
            maxLength={4}
            inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <label className="mt-4 block text-xs text-[var(--muted)]">CMS</label>
          <select
            className={fieldClass()}
            value={cms}
            onChange={(e) => setCms(e.target.value as CmsValue | "")}
          >
            <option value="">—</option>
            {cmsOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="mt-4 block text-xs text-[var(--muted)]">Короткое описание</label>
          <textarea
            className={fieldClass("min-h-[64px]")}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
          <label className="mt-4 block text-xs text-[var(--muted)]">Длинное описание</label>
          <textarea
            className={fieldClass("min-h-[120px]")}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="text-[var(--muted)]">Категория:</span>
            {(
              [
                ["active", "Активные"],
                ["paused", "На паузе"],
                ["completed", "Завершённые"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="status"
                  checked={status === k}
                  onChange={() => setStatus(k)}
                />
                {label}
              </label>
            ))}
          </div>
        </>
      )}
    </RightPanel>
  );
}

function toLocalDatetimeValue(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DeadlineFormPanel({
  open,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      const dl = j?.deadline;
      setStart(
        dl?.startAt
          ? toLocalDatetimeValue(new Date(dl.startAt))
          : "",
      );
      setEnd(dl?.endAt ? toLocalDatetimeValue(new Date(dl.endAt)) : "");
      setComment(dl?.comment ?? "");
    })();
  }, [open, projectId]);

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/deadline`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: start ? new Date(start).toISOString() : null,
          endAt: end ? new Date(end).toISOString() : null,
          comment: comment || null,
        }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightPanel
      open={open}
      title="Текущий дедлайн"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy)}
    >
      <label className="block text-xs text-[var(--muted)]">Начало</label>
      <input
        type="datetime-local"
        className={fieldClass()}
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />
      <label className="mt-4 block text-xs text-[var(--muted)]">Конец</label>
      <input
        type="datetime-local"
        className={fieldClass()}
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />
      <label className="mt-4 block text-xs text-[var(--muted)]">Комментарий</label>
      <textarea
        className={fieldClass("min-h-[96px]")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
    </RightPanel>
  );
}

type LedgerRow = {
  amountRubles: number;
  paymentDate: string;
  comment: string | null;
};
type DocRow = { docDate: string; url: string; comment: string | null };
type BlockRow = { body: string | null; color: "green" | "gray" };

export function PaymentsFormPanel({
  open,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      if (!j) return;
      setRemaining(j.project.remainingAmountRubles ?? 0);
      setBlocks(
        (j.payments?.textBlocks ?? []).map((b: { body: string | null; color: "green" | "gray" }) => ({
          body: b.body,
          color: b.color,
        })),
      );
      setLedger(
        (j.payments?.ledger ?? []).map(
          (r: { amountRubles: number; paymentDate: string; comment: string | null }) => ({
            amountRubles: r.amountRubles,
            paymentDate: r.paymentDate.slice(0, 10),
            comment: r.comment,
          }),
        ),
      );
      setDocs(
        (j.payments?.documents ?? []).map(
          (r: { docDate: string; url: string; comment: string | null }) => ({
            docDate: r.docDate.slice(0, 10),
            url: r.url,
            comment: r.comment,
          }),
        ),
      );
    })();
  }, [open, projectId]);

  const paid = useMemo(
    () => ledger.reduce((s, r) => s + r.amountRubles, 0),
    [ledger],
  );

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remainingAmountRubles: remaining,
          textBlocks: blocks,
          ledger,
          documents: docs,
        }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightPanel
      open={open}
      title="Оплаты и документы"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy)}
    >
      <div className="max-w-md">
        <PaymentBlock paidRubles={paid} remainingRubles={remaining} />
      </div>
      <label className="mt-6 block text-xs text-[var(--muted)]">Осталось (₽)</label>
      <input
        type="number"
        className={fieldClass()}
        value={remaining}
        onChange={(e) => setRemaining(Number(e.target.value) || 0)}
      />

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Текстовые блоки</span>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setBlocks((b) => [...b, { body: "", color: "gray" }])}
          >
            + блок
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {blocks.map((b, i) => (
            <div
              key={i}
              className="flex gap-2 rounded px-2 py-2"
              style={{
                backgroundColor: `${b.color === "green" ? "#00B956" : "#8c8c8e"}26`,
              }}
            >
              <button
                type="button"
                className="mt-1 h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: b.color === "green" ? "#00B956" : "#8c8c8e" }}
                aria-label="Цвет"
                onClick={() =>
                  setBlocks((prev) =>
                    prev.map((x, j) =>
                      j === i
                        ? { ...x, color: x.color === "green" ? "gray" : "green" }
                        : x,
                    ),
                  )
                }
              />
              <textarea
                className="min-h-[48px] flex-1 border-0 bg-transparent text-sm outline-none"
                style={{ color: b.color === "green" ? "#00B956" : "#8c8c8e" }}
                placeholder=" "
                value={b.body ?? ""}
                onChange={(e) =>
                  setBlocks((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                  )
                }
              />
              <button
                type="button"
                className="text-xs opacity-60"
                onClick={() => setBlocks((prev) => prev.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Поступившие оплаты</span>
          <button
            type="button"
            className="text-sm underline"
            onClick={() =>
              setLedger((r) => [
                ...r,
                { amountRubles: 0, paymentDate: new Date().toISOString().slice(0, 10), comment: "" },
              ])
            }
          >
            + оплата
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {ledger.map((row, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="number"
                className={fieldClass()}
                placeholder="Сумма"
                value={row.amountRubles || ""}
                onChange={(e) =>
                  setLedger((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, amountRubles: Number(e.target.value) || 0 } : x,
                    ),
                  )
                }
              />
              <input
                type="date"
                className={fieldClass()}
                value={row.paymentDate}
                onChange={(e) =>
                  setLedger((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, paymentDate: e.target.value } : x,
                    ),
                  )
                }
              />
              <div className="flex gap-2 sm:col-span-3">
                <input
                  className={fieldClass()}
                  placeholder="Комментарий"
                  value={row.comment ?? ""}
                  onChange={(e) =>
                    setLedger((prev) =>
                      prev.map((x, j) =>
                        j === i ? { ...x, comment: e.target.value || null } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-xs opacity-60"
                  onClick={() => setLedger((prev) => prev.filter((_, j) => j !== i))}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Документы</span>
          <button
            type="button"
            className="text-sm underline"
            onClick={() =>
              setDocs((d) => [
                ...d,
                { docDate: new Date().toISOString().slice(0, 10), url: "", comment: "" },
              ])
            }
          >
            + документ
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {docs.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-2">
              <input
                type="date"
                className={fieldClass()}
                value={row.docDate}
                onChange={(e) =>
                  setDocs((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, docDate: e.target.value } : x)),
                  )
                }
              />
              <input
                className={fieldClass()}
                placeholder="Ссылка"
                value={row.url}
                onChange={(e) =>
                  setDocs((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                  )
                }
              />
              <input
                className={fieldClass("sm:col-span-2")}
                placeholder="Комментарий"
                value={row.comment ?? ""}
                onChange={(e) =>
                  setDocs((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, comment: e.target.value || null } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="text-xs opacity-60 sm:col-span-2"
                onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </div>
    </RightPanel>
  );
}

type StaffUser = {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  role: "admin" | "employee";
};

type BlTask = { description: string; done: boolean };
type BlList = { title: string; assigneeUserId: string | null; tasks: BlTask[] };

export function BacklogFormPanel({
  open,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lists, setLists] = useState<BlList[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [j, u] = await Promise.all([
        fetchJson(`/api/projects/${projectId}`).catch(() => null),
        fetchJson("/api/users").catch(() => ({ users: [] })),
      ]);
      setStaff(u.users ?? []);
      if (!j || !j.backlog) {
        setLists([]);
        return;
      }
      const grouped = new Map<
        string,
        { title: string; assigneeUserId: string | null; tasks: BlTask[] }
      >();
      const order: string[] = [];
      const bl = j.backlog as {
        lists: {
          list: { id: string; title: string };
          assignee: { id: string } | null;
        }[];
        tasks: { listId: string; description: string; done: boolean }[];
      };
      for (const { list, assignee } of bl.lists) {
        order.push(list.id);
        grouped.set(list.id, {
          title: list.title,
          assigneeUserId: assignee?.id ?? null,
          tasks: [],
        });
      }
      for (const t of bl.tasks) {
        const g = grouped.get(t.listId);
        if (g) g.tasks.push({ description: t.description, done: t.done });
      }
      setLists(order.map((id) => grouped.get(id)!));
    })();
  }, [open, projectId]);

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/backlog`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lists }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RightPanel
      open={open}
      title="Бэклог"
      onClose={onClose}
      footer={btnFooter(onClose, save, busy)}
    >
      <button
        type="button"
        className="text-sm underline"
        onClick={() =>
          setLists((ls) => [...ls, { title: "Новый список", assigneeUserId: null, tasks: [] }])
        }
      >
        + список
      </button>
      <div className="mt-4 space-y-8">
        {lists.map((list, li) => (
          <div key={li}>
            <input
              className={fieldClass()}
              value={list.title}
              onChange={(e) =>
                setLists((prev) =>
                  prev.map((x, j) => (j === li ? { ...x, title: e.target.value } : x)),
                )
              }
            />
            <label className="mt-2 block text-xs text-[var(--muted)]">Ответственный</label>
            <select
              className={fieldClass()}
              value={list.assigneeUserId ?? ""}
              onChange={(e) =>
                setLists((prev) =>
                  prev.map((x, j) =>
                    j === li
                      ? { ...x, assigneeUserId: e.target.value || null }
                      : x,
                  ),
                )
              }
            >
              <option value="">—</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <div className="mt-3 space-y-2">
              {list.tasks.map((t, ti) => (
                <div key={ti} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={t.done}
                    onChange={(e) =>
                      setLists((prev) =>
                        prev.map((x, j) =>
                          j === li
                            ? {
                                ...x,
                                tasks: x.tasks.map((y, k) =>
                                  k === ti ? { ...y, done: e.target.checked } : y,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <input
                    className={fieldClass()}
                    value={t.description}
                    onChange={(e) =>
                      setLists((prev) =>
                        prev.map((x, j) =>
                          j === li
                            ? {
                                ...x,
                                tasks: x.tasks.map((y, k) =>
                                  k === ti ? { ...y, description: e.target.value } : y,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="text-xs opacity-60"
                    onClick={() =>
                      setLists((prev) =>
                        prev.map((x, j) =>
                          j === li
                            ? { ...x, tasks: x.tasks.filter((_, k) => k !== ti) }
                            : x,
                        ),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm underline"
                onClick={() =>
                  setLists((prev) =>
                    prev.map((x, j) =>
                      j === li
                        ? {
                            ...x,
                            tasks: [...x.tasks, { description: "", done: false }],
                          }
                        : x,
                    ),
                  )
                }
              >
                + задача
              </button>
            </div>
          </div>
        ))}
      </div>
    </RightPanel>
  );
}

type TlImg = {
  originalKey: string;
  webpKey: string;
  webpUrl?: string;
  originalUrl?: string;
};
type TlEntry = {
  entryDate: string;
  title: string;
  images: TlImg[];
  links: { url: string; title: string }[];
};
type StRow = {
  title: string;
  tasks: { description: string; done: boolean; completedAt: string | null }[];
};

export function LkEditorPanel({
  open,
  projectId,
  onClose,
  onSaved,
}: {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [lkTitle, setLkTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [dcomment, setDcomment] = useState("");
  const [timeline, setTimeline] = useState<TlEntry[]>([]);
  const [stages, setStages] = useState<StRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [slider, setSlider] = useState<string[] | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      if (!j) return;
      setLkTitle(j.project.lkTitle ?? "");
      const dl = j.deadline;
      setStart(dl?.startAt ? toLocalDatetimeValue(new Date(dl.startAt)) : "");
      setEnd(dl?.endAt ? toLocalDatetimeValue(new Date(dl.endAt)) : "");
      setDcomment(dl?.comment ?? "");

      const byEntry = new Map<string, TlEntry>();
      const order: string[] = [];
      for (const e of j.timeline.entries as {
        id: string;
        entryDate: string;
        title: string;
      }[]) {
        order.push(e.id);
        byEntry.set(e.id, {
          entryDate: e.entryDate.slice(0, 10),
          title: e.title,
          images: [],
          links: [],
        });
      }
      for (const im of j.timeline.images as {
        entryId: string;
        originalKey: string;
        webpKey: string;
        webpUrl?: string | null;
        originalUrl?: string | null;
      }[]) {
        const ent = byEntry.get(im.entryId);
        if (!ent) continue;
        ent.images.push({
          originalKey: im.originalKey,
          webpKey: im.webpKey,
          webpUrl: im.webpUrl ?? "",
          originalUrl: im.originalUrl ?? "",
        });
      }
      for (const ln of j.timeline.links as {
        entryId: string;
        url: string;
        linkTitle: string;
      }[]) {
        const ent = byEntry.get(ln.entryId);
        if (!ent) continue;
        ent.links.push({ url: ln.url, title: ln.linkTitle });
      }
      setTimeline(order.map((id) => byEntry.get(id)!));

      const stOrder: string[] = [];
      const stMap = new Map<string, StRow>();
      for (const s of j.stages as { id: string; title: string }[]) {
        stOrder.push(s.id);
        stMap.set(s.id, { title: s.title, tasks: [] });
      }
      for (const t of j.stageTasks as {
        stageId: string;
        description: string;
        done: boolean;
        completedAt: string | null;
      }[]) {
        const st = stMap.get(t.stageId);
        if (!st) continue;
        st.tasks.push({
          description: t.description,
          done: t.done,
          completedAt: t.completedAt ? t.completedAt.slice(0, 10) : null,
        });
      }
      setStages(stOrder.map((id) => stMap.get(id)!));
    })();
  }, [open, projectId]);

  async function uploadFile(file: File, entryIndex: number) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch(`/api/projects/${projectId}/timeline-upload`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) {
      alert("Загрузка не удалась");
      return;
    }
    const j = await res.json();
    setTimeline((prev) =>
      prev.map((e, i) =>
        i === entryIndex
          ? {
              ...e,
              images: [
                ...e.images,
                {
                  originalKey: j.originalKey,
                  webpKey: j.webpKey,
                  webpUrl: j.webpUrl,
                  originalUrl: j.originalUrl,
                },
              ],
            }
          : e,
      ),
    );
  }

  async function save() {
    setBusy(true);
    try {
      await fetchJson(`/api/projects/${projectId}/lk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lkTitle,
          deadline: {
            startAt: start ? new Date(start).toISOString() : null,
            endAt: end ? new Date(end).toISOString() : null,
            comment: dcomment || null,
          },
          timeline: timeline.map((e) => ({
            entryDate: e.entryDate,
            title: e.title,
            images: e.images.map((im) => ({
              originalKey: im.originalKey,
              webpKey: im.webpKey,
            })),
            links: e.links.map((l) => ({ url: l.url, title: l.title })),
          })),
          stages: stages.map((s) => ({
            title: s.title,
            tasks: s.tasks.map((t) => ({
              description: t.description,
              done: t.done,
              completedAt: t.completedAt,
            })),
          })),
        }),
      });
      onSaved();
      onClose();
    } catch {
      alert("Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <RightPanel
        open={open}
        title="Редактор ЛК"
        onClose={onClose}
        footer={btnFooter(onClose, save, busy)}
      >
        <label className="block text-xs text-[var(--muted)]">Заголовок ЛК</label>
        <input className={fieldClass()} value={lkTitle} onChange={(e) => setLkTitle(e.target.value)} />

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="text-sm font-medium">Таймлайн работ по проекту</div>
            <button
              type="button"
              className="mt-2 text-sm underline"
              onClick={() =>
                setTimeline((t) => [
                  ...t,
                  {
                    entryDate: new Date().toISOString().slice(0, 10),
                    title: "",
                    images: [],
                    links: [],
                  },
                ])
              }
            >
              + запись
            </button>
            <div className="mt-4 space-y-6">
              {timeline.map((e, ei) => (
                <div key={ei}>
                  <input
                    type="date"
                    className={fieldClass()}
                    value={e.entryDate}
                    onChange={(ev) =>
                      setTimeline((prev) =>
                        prev.map((x, j) =>
                          j === ei ? { ...x, entryDate: ev.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className={fieldClass()}
                    placeholder="Заголовок"
                    value={e.title}
                    onChange={(ev) =>
                      setTimeline((prev) =>
                        prev.map((x, j) =>
                          j === ei ? { ...x, title: ev.target.value } : x,
                        ),
                      )
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {e.images.map((im, ii) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={ii}
                        src={im.webpUrl || ""}
                        alt=""
                        className="h-16 w-16 cursor-pointer object-cover"
                        onClick={() => {
                          const urls = e.images
                            .map((x) => x.originalUrl || x.webpUrl)
                            .filter(Boolean) as string[];
                          setSlider(urls);
                          setSliderIdx(ii);
                        }}
                      />
                    ))}
                    <label className="inline-flex cursor-pointer items-center text-xs underline">
                      + фото
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(ev) => {
                          const f = ev.target.files?.[0];
                          if (f) void uploadFile(f, ei);
                          ev.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="mt-2 space-y-2">
                    {e.links.map((ln, li) => (
                      <div key={li} className="flex gap-2">
                        <input
                          className={fieldClass()}
                          placeholder="URL"
                          value={ln.url}
                          onChange={(ev) =>
                            setTimeline((prev) =>
                              prev.map((x, j) =>
                                j === ei
                                  ? {
                                      ...x,
                                      links: x.links.map((y, k) =>
                                        k === li ? { ...y, url: ev.target.value } : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <input
                          className={fieldClass()}
                          placeholder="Заголовок ссылки"
                          value={ln.title}
                          onChange={(ev) =>
                            setTimeline((prev) =>
                              prev.map((x, j) =>
                                j === ei
                                  ? {
                                      ...x,
                                      links: x.links.map((y, k) =>
                                        k === li ? { ...y, title: ev.target.value } : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          className="text-xs"
                          onClick={() =>
                            setTimeline((prev) =>
                              prev.map((x, j) =>
                                j === ei
                                  ? { ...x, links: x.links.filter((_, k) => k !== li) }
                                  : x,
                              ),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() =>
                        setTimeline((prev) =>
                          prev.map((x, j) =>
                            j === ei
                              ? { ...x, links: [...x.links, { url: "", title: "" }] }
                              : x,
                          ),
                        )
                      }
                    >
                      + ссылка
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <div className="text-sm font-medium">Текущий дедлайн</div>
              <div className="mt-2 max-w-sm">
                <DeadlineBlock
                  startAt={start ? new Date(start).toISOString() : null}
                  endAt={end ? new Date(end).toISOString() : null}
                  comment={dcomment}
                />
              </div>
              <label className="mt-4 block text-xs text-[var(--muted)]">Начало</label>
              <input
                type="datetime-local"
                className={fieldClass()}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <label className="mt-2 block text-xs text-[var(--muted)]">Конец</label>
              <input
                type="datetime-local"
                className={fieldClass()}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
              <label className="mt-2 block text-xs text-[var(--muted)]">Комментарий</label>
              <textarea
                className={fieldClass("min-h-[64px]")}
                value={dcomment}
                onChange={(e) => setDcomment(e.target.value)}
              />
            </div>

            <div>
              <div className="text-sm font-medium">Этапы</div>
              <button
                type="button"
                className="mt-2 text-sm underline"
                onClick={() =>
                  setStages((s) => [...s, { title: "", tasks: [] }])
                }
              >
                + этап
              </button>
              <div className="mt-4 space-y-6">
                {stages.map((st, si) => (
                  <div key={si}>
                    <input
                      className={fieldClass()}
                      placeholder="Заголовок этапа"
                      value={st.title}
                      onChange={(e) =>
                        setStages((prev) =>
                          prev.map((x, j) =>
                            j === si ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <div className="mt-2 space-y-2">
                      {st.tasks.map((t, ti) => (
                        <div key={ti} className="flex flex-wrap items-center gap-2">
                          <input type="checkbox" checked={t.done} onChange={(e) =>
                            setStages((prev) =>
                              prev.map((x, j) =>
                                j === si
                                  ? {
                                      ...x,
                                      tasks: x.tasks.map((y, k) =>
                                        k === ti ? { ...y, done: e.target.checked } : y,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          } />
                          <input
                            className={fieldClass("flex-1 min-w-[120px]")}
                            value={t.description}
                            onChange={(e) =>
                              setStages((prev) =>
                                prev.map((x, j) =>
                                  j === si
                                    ? {
                                        ...x,
                                        tasks: x.tasks.map((y, k) =>
                                          k === ti
                                            ? { ...y, description: e.target.value }
                                            : y,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                          <input
                            type="date"
                            className={fieldClass()}
                            value={t.completedAt ?? ""}
                            onChange={(e) =>
                              setStages((prev) =>
                                prev.map((x, j) =>
                                  j === si
                                    ? {
                                        ...x,
                                        tasks: x.tasks.map((y, k) =>
                                          k === ti
                                            ? {
                                                ...y,
                                                completedAt: e.target.value || null,
                                              }
                                            : y,
                                        ),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() =>
                          setStages((prev) =>
                            prev.map((x, j) =>
                              j === si
                                ? {
                                    ...x,
                                    tasks: [
                                      ...x.tasks,
                                      { description: "", done: false, completedAt: null },
                                    ],
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        + задача
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <LkPaymentsBacklog projectId={projectId} open={open} />
          </div>
        </div>
      </RightPanel>

      {slider ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
          role="presentation"
          onClick={() => setSlider(null)}
        >
          <div className="flex justify-end p-4">
            <button type="button" className="text-2xl" onClick={() => setSlider(null)}>
              ×
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slider[sliderIdx]}
              alt=""
              className="max-h-[85vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex justify-center gap-4 pb-6">
            <button
              type="button"
              disabled={sliderIdx <= 0}
              onClick={(e) => {
                e.stopPropagation();
                setSliderIdx((i) => Math.max(0, i - 1));
              }}
            >
              ←
            </button>
            <button
              type="button"
              disabled={sliderIdx >= slider.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setSliderIdx((i) => Math.min(slider.length - 1, i + 1));
              }}
            >
              →
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LkPaymentsBacklog({
  projectId,
  open,
}: {
  projectId: string;
  open: boolean;
}) {
  const [paid, setPaid] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [bl, setBl] = useState<BlList[]>([]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const j = await fetchJson(`/api/projects/${projectId}`).catch(() => null);
      if (!j) return;
      const led = (j.payments?.ledger ?? []) as { amountRubles: number }[];
      setPaid(led.reduce((s, r) => s + r.amountRubles, 0));
      setRemaining((j.project as { remainingAmountRubles?: number }).remainingAmountRubles ?? 0);
      setBlocks(
        (j.payments?.textBlocks ?? []).map((b: { body: string | null; color: "green" | "gray" }) => ({
          body: b.body,
          color: b.color,
        })),
      );
      if (!j.backlog) {
        setBl([]);
        return;
      }
      const blData = j.backlog as {
        lists: {
          list: { id: string; title: string };
          assignee: { id: string } | null;
        }[];
        tasks: { listId: string; description: string; done: boolean }[];
      };
      const grouped = new Map<
        string,
        { title: string; assigneeUserId: string | null; tasks: BlTask[] }
      >();
      const order: string[] = [];
      for (const { list, assignee } of blData.lists) {
        order.push(list.id);
        grouped.set(list.id, {
          title: list.title,
          assigneeUserId: assignee?.id ?? null,
          tasks: [],
        });
      }
      for (const t of blData.tasks) {
        const g = grouped.get(t.listId);
        if (g) g.tasks.push({ description: t.description, done: t.done });
      }
      setBl(order.map((id) => grouped.get(id)!));
    })();
  }, [open, projectId]);

  return (
    <>
      <div>
        <div className="text-sm font-medium">Оплаты и документы</div>
        <div className="mt-2 max-w-sm">
          <PaymentBlock paidRubles={paid} remainingRubles={remaining} />
        </div>
        <div className="mt-3 space-y-1">
          {blocks.map((b, i) => (
            <div
              key={i}
              className="rounded px-2 py-1 text-xs"
              style={{
                color: b.color === "green" ? "#00B956" : "#8c8c8e",
                backgroundColor: `${b.color === "green" ? "#00B956" : "#8c8c8e"}26`,
              }}
            >
              {b.body?.trim() ? b.body : " "}
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">Бэклог</div>
        <div className="mt-2 space-y-4 text-sm">
          {bl.map((list, i) => (
            <div key={i}>
              <div className="text-xs text-[var(--muted)]">{list.title}</div>
              <ul className="mt-1 space-y-1">
                {list.tasks.map((t, ti) => (
                  <li key={ti} className="flex gap-2">
                    <span className="opacity-50">{t.done ? "☑" : "☐"}</span>
                    <span>{t.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<
    {
      id: string;
      login: string;
      firstName: string;
      lastName: string;
      role: "admin" | "employee";
      avatarKey: string | null;
    }[]
  >([]);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");

  async function reload() {
    const j = await fetchJson("/api/users").catch(() => ({ users: [] }));
    setUsers(j.users ?? []);
  }

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open]);

  async function addUser() {
    try {
      await fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, firstName, lastName, role }),
      });
      setLogin("");
      setPassword("");
      setFirstName("");
      setLastName("");
      await reload();
    } catch {
      alert("Не удалось добавить");
    }
  }

  return (
    <RightPanel
      open={open}
      title="Настройки"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="rounded px-4 py-2 text-sm opacity-80 hover:opacity-100"
          onClick={onClose}
        >
          Закрыть
        </button>
      }
    >
      <div className="text-sm font-medium">Новый пользователь</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input className={fieldClass()} placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} />
        <input
          className={fieldClass()}
          placeholder="Пароль"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className={fieldClass()}
          placeholder="Имя"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          className={fieldClass()}
          placeholder="Фамилия"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <select className={fieldClass()} value={role} onChange={(e) => setRole(e.target.value as "admin" | "employee")}>
          <option value="employee">Сотрудник</option>
          <option value="admin">Администратор</option>
        </select>
        <button type="button" className="rounded py-2 text-sm underline" onClick={() => void addUser()}>
          Добавить
        </button>
      </div>

      <div className="mt-10 space-y-6">
        {users.map((u) => (
          <UserRow key={u.id} u={u} onChange={() => void reload()} />
        ))}
      </div>
    </RightPanel>
  );
}

function UserRow({
  u,
  onChange,
}: {
  u: {
    id: string;
    login: string;
    firstName: string;
    lastName: string;
    role: "admin" | "employee";
    avatarKey: string | null;
  };
  onChange: () => void;
}) {
  const [login, setLogin] = useState(u.login);
  const [firstName, setFirstName] = useState(u.firstName);
  const [lastName, setLastName] = useState(u.lastName);
  const [role, setRole] = useState(u.role);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    setLogin(u.login);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setRole(u.role);
    setPwd("");
  }, [u]);

  async function save() {
    try {
      await fetchJson(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          firstName,
          lastName,
          role,
          ...(pwd ? { password: pwd } : {}),
        }),
      });
      onChange();
    } catch {
      alert("Ошибка сохранения");
    }
  }

  async function remove() {
    if (!confirm("Удалить пользователя?")) return;
    try {
      await fetchJson(`/api/users/${u.id}`, { method: "DELETE" });
      onChange();
    } catch {
      alert("Нельзя удалить");
    }
  }

  async function avatar(ev: { target: HTMLInputElement }) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch(`/api/users/${u.id}/avatar`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) alert("Аватар не загружен");
    else onChange();
    ev.target.value = "";
  }

  return (
    <div className="border-b border-[var(--foreground)]/10 pb-6">
      <div className="flex flex-wrap items-start gap-4">
        <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--foreground)]/10 text-xs">
          Аватар
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void avatar(e)} />
        </label>
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <input className={fieldClass()} value={login} onChange={(e) => setLogin(e.target.value)} />
          <input className={fieldClass()} placeholder="Новый пароль" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
          <input className={fieldClass()} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input className={fieldClass()} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <select className={fieldClass()} value={role} onChange={(e) => setRole(e.target.value as "admin" | "employee")}>
            <option value="employee">Сотрудник</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        <button type="button" className="underline" onClick={() => void save()}>
          Сохранить
        </button>
        <button type="button" className="underline opacity-60" onClick={() => void remove()}>
          Удалить
        </button>
        <span className="text-[var(--muted)]">{roleLabel(role)}</span>
      </div>
    </div>
  );
}
