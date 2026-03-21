"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DeadlineBlock } from "@/components/cells/deadline-block";
import { PaymentBlock } from "@/components/cells/payment-block";
import { cmsLabel } from "@/lib/cms-labels";
import { formatRuDayMonthWeekday } from "@/lib/dates";

type ApiPayload = {
  full: {
    project: {
      lkTitle: string;
      customerName: string;
      shortDescription: string | null;
      longDescription: string | null;
      cms: string | null;
      remainingAmountRubles: number;
    };
    deadline: {
      startAt: string | null;
      endAt: string | null;
      comment: string | null;
    } | null;
    timeline: {
      entries: { id: string; entryDate: string; title: string }[];
      images: {
        entryId: string;
        webpKey: string;
        webpUrl?: string | null;
        originalUrl?: string | null;
      }[];
      links: { entryId: string; url: string; linkTitle: string }[];
    };
    stages: { id: string; title: string }[];
    stageTasks: {
      stageId: string;
      description: string;
      done: boolean;
      completedAt: string | null;
    }[];
    payments: {
      ledger: { amountRubles: number }[];
      textBlocks: { body: string | null; color: "green" | "gray" }[];
    };
    backlog: {
      lists: {
        list: { id: string; title: string };
        assignee: unknown;
      }[];
      tasks: { listId: string; description: string; done: boolean }[];
    };
  };
};

export function LkClient({ slug }: { slug: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [slider, setSlider] = useState<string[] | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);

  const paid = useMemo(() => {
    if (!data?.full?.payments?.ledger) return 0;
    return data.full.payments.ledger.reduce((s, r) => s + r.amountRubles, 0);
  }, [data]);

  const imagesByEntry = useMemo(() => {
    const m = new Map<string, { webpUrl?: string | null; originalUrl?: string | null }[]>();
    if (!data?.full?.timeline?.images) return m;
    for (const im of data.full.timeline.images) {
      if (!m.has(im.entryId)) m.set(im.entryId, []);
      m.get(im.entryId)!.push(im);
    }
    return m;
  }, [data]);

  const linksByEntry = useMemo(() => {
    const m = new Map<string, { url: string; linkTitle: string }[]>();
    if (!data?.full?.timeline?.links) return m;
    for (const ln of data.full.timeline.links) {
      if (!m.has(ln.entryId)) m.set(ln.entryId, []);
      m.get(ln.entryId)!.push({ url: ln.url, linkTitle: ln.linkTitle });
    }
    return m;
  }, [data]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/lk/${slug}/data`, { credentials: "include" });
    if (res.status === 401) {
      setData(null);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Не удалось загрузить");
      setLoading(false);
      return;
    }
    const j = (await res.json()) as ApiPayload;
    setData(j);
    setError(null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/lk/${slug}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setError("Неверный PIN");
      return;
    }
    await load();
  }

  if (loading) {
    return <p className="p-6 text-sm text-[var(--muted)]">Загрузка…</p>;
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <h1 className="text-lg font-medium">Просмотр ЛК</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Введите четырёхзначный PIN</p>
        <form onSubmit={(e) => void verifyPin(e)} className="mt-6 space-y-4">
          <input
            className="form-input py-3 text-lg tracking-widest"
            maxLength={4}
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "#000" }}
          >
            Продолжить
          </button>
        </form>
      </div>
    );
  }

  const { full } = data;
  const remaining = full.project.remainingAmountRubles ?? 0;

  return (
    <div className="min-h-screen px-4 py-8 text-[var(--foreground)]">
      <h1 className="text-2xl font-semibold">{full.project.lkTitle}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{full.project.customerName}</p>
      {full.project.shortDescription ? (
        <p className="mt-2 text-sm">{full.project.shortDescription}</p>
      ) : null}
      {full.project.longDescription ? (
        <p className="mt-4 text-sm whitespace-pre-wrap">{full.project.longDescription}</p>
      ) : null}
      <p className="mt-2 text-xs text-[var(--muted)]">
        CMS: {cmsLabel(full.project.cms as never)}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium">Таймлайн работ по проекту</h2>
          <div className="mt-4 space-y-8">
            {full.timeline.entries.map((e) => (
              <article key={e.id}>
                <div className="text-xs text-[var(--muted)]">
                  {formatRuDayMonthWeekday(e.entryDate)}
                </div>
                <div className="mt-1 font-medium">{e.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(imagesByEntry.get(e.id) ?? []).map((im, ii) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={ii}
                      src={im.webpUrl || ""}
                      alt=""
                      className="h-20 w-20 cursor-pointer object-cover"
                      onClick={() => {
                        const urls = (imagesByEntry.get(e.id) ?? [])
                          .map((x) => x.originalUrl || x.webpUrl)
                          .filter(Boolean) as string[];
                        setSlider(urls);
                        setSliderIdx(ii);
                      }}
                    />
                  ))}
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {(linksByEntry.get(e.id) ?? []).map((ln, i) => (
                    <li key={i}>
                      <a href={ln.url} className="underline" target="_blank" rel="noreferrer">
                        {ln.linkTitle}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-10">
          <div>
            <h2 className="text-sm font-medium">Текущий дедлайн</h2>
            <div className="mt-2 max-w-md">
              <DeadlineBlock
                startAt={full.deadline?.startAt ?? null}
                endAt={full.deadline?.endAt ?? null}
                comment={full.deadline?.comment ?? null}
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium">Этапы</h2>
            <div className="mt-4 space-y-6">
              {full.stages.map((st) => (
                <div key={st.id}>
                  <div className="font-medium">{st.title}</div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {full.stageTasks
                      .filter((t) => t.stageId === st.id)
                      .map((t, ti) => (
                        <li key={ti} className="flex flex-wrap items-center gap-2">
                          <span className="opacity-50">{t.done ? "☑" : "☐"}</span>
                          <span className={t.done ? "line-through opacity-60" : ""}>
                            {t.description}
                          </span>
                          {t.completedAt ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs"
                              style={{
                                color: "#00B956",
                                backgroundColor: "#00B95626",
                              }}
                            >
                              {formatRuDayMonthWeekday(t.completedAt)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium">Оплаты и документы</h2>
            <div className="mt-2 max-w-md">
              <PaymentBlock paidRubles={paid} remainingRubles={remaining} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {full.payments.textBlocks.map((b, i) => (
                <div
                  key={i}
                  className="rounded-full px-3 py-1 text-xs whitespace-nowrap"
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
            <h2 className="text-sm font-medium">Бэклог</h2>
            <div className="mt-2 space-y-4 text-sm">
              {full.backlog.lists.map((row) => {
                const listId = row.list.id;
                const tasks = full.backlog.tasks.filter((t) => t.listId === listId);
                return (
                  <div key={listId}>
                    <div className="text-xs text-[var(--muted)]">{row.list.title}</div>
                    <ul className="mt-1 space-y-1">
                      {tasks.map((t, ti) => (
                        <li key={ti} className="flex gap-2">
                          <span className="opacity-50">{t.done ? "☑" : "☐"}</span>
                          <span>{t.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {slider ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white"
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
    </div>
  );
}
