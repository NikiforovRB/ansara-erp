"use client";

import Image from "next/image";
import Link from "next/link";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeadlineBlock } from "@/components/cells/deadline-block";
import { IconCheckbox } from "@/components/icon-checkbox";
import { PaymentBlock } from "@/components/cells/payment-block";
import { useTheme } from "@/components/theme-provider";
import ansaraLogo from "@/icons/ANSARA.svg";
import checkboxCompleteIcon from "@/icons/checkboxcomplete.svg";
import moonIcon from "@/icons/moon.svg";
import moonNavIcon from "@/icons/moon-nav.svg";
import sunIcon from "@/icons/sun.svg";
import sunNavIcon from "@/icons/sun-nav.svg";
import closeBlack from "@/icons/close-black.svg";
import closeNav from "@/icons/close-nav.svg";
import { paymentChipStyles } from "@/lib/payment-chip";
import { formatRuDayMonthWeekday } from "@/lib/dates";
import { xhrGetJsonWithProgress } from "@/lib/xhr-get-json";

type ApiPayload = {
  access?: "staff" | "guest";
  full: {
    project: {
      lkTitle: string;
      customerName: string;
      shortDescription: string | null;
      longDescription: string | null;
      cms: string | null;
      remainingAmountRubles: number;
      lkStagesComment?: string | null;
    };
    deadline: {
      startAt: string | null;
      endAt: string | null;
      comment: string | null;
    } | null;
    timeline: {
      entries: { id: string; entryDate: string; title: string; description?: string | null }[];
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
  };
};

function LkViewHeader() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header
      className="sticky top-0 z-40 flex h-14 min-w-0 items-center justify-between px-3 text-[var(--header-fg)] sm:px-6"
      style={{ backgroundColor: "#000000" }}
    >
      <Link href="/" className="relative block h-7 w-[96px] shrink-0">
        <Image
          src={ansaraLogo}
          alt="ANSARA"
          fill
          className="object-contain object-left"
          sizes="96px"
          priority
          unoptimized
        />
      </Link>
      <button
        type="button"
        aria-label={theme === "light" ? "Тёмная тема" : "Светлая тема"}
        title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
        onClick={toggleTheme}
        className="group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--header-fg)]"
      >
        <Image
          src={theme === "light" ? moonIcon : sunIcon}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="transition-opacity duration-200 group-hover:opacity-0"
        />
        <Image
          src={theme === "light" ? moonNavIcon : sunNavIcon}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
      </button>
    </header>
  );
}

const PIN_DIGITS = 4;

function PinDigitInputs({
  digits,
  setDigits,
  inputsRef,
  disabled,
}: {
  digits: string[];
  setDigits: (next: string[]) => void;
  inputsRef: MutableRefObject<(HTMLInputElement | null)[]>;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const pinFieldBg = theme === "dark" ? "#000000" : "#ffffff";
  const pinFieldBorder = theme === "dark" ? "#2d2e30" : "#dae3f0";

  function setDigit(index: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = ch;
    setDigits(next);
    if (ch && index < PIN_DIGITS - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  return (
    <div className="grid w-full grid-cols-4 gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={d}
          aria-label={`Цифра ${i + 1}`}
          className="mt-0 box-border h-14 min-w-0 w-full rounded-md py-0 text-center text-xl tracking-normal text-[var(--foreground)] outline-none disabled:opacity-50"
          style={{
            backgroundColor: pinFieldBg,
            border: `1px solid ${pinFieldBorder}`,
          }}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              inputsRef.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_DIGITS);
            if (!t) return;
            const next = [...digits];
            for (let j = 0; j < t.length && i + j < PIN_DIGITS; j++) {
              next[i + j] = t[j]!;
            }
            setDigits(next);
            const last = Math.min(i + t.length, PIN_DIGITS - 1);
            inputsRef.current[last]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function LkClient({ slug }: { slug: string }) {
  const { theme, setTheme } = useTheme();
  const [digits, setDigits] = useState<string[]>(() => Array(PIN_DIGITS).fill(""));
  const pinInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [pinFeedback, setPinFeedback] = useState<null | "ok" | "bad">(null);
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [slider, setSlider] = useState<string[] | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [loadProgress, setLoadProgress] = useState<number | null>(0);

  const pin = digits.join("");

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

  const timelineEntriesSorted = useMemo(() => {
    const e = data?.full?.timeline?.entries;
    if (!e?.length) return [];
    return [...e].sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }, [data]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadProgress(0);
    try {
      const raw = await xhrGetJsonWithProgress(
        `/api/lk/${slug}/data`,
        (p) => setLoadProgress(p),
      );
      const j = JSON.parse(raw) as ApiPayload;
      setData(j);
      setBootError(null);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        setData(null);
        setBootError(null);
      } else {
        setData(null);
        setBootError("Не удалось загрузить");
      }
    } finally {
      setLoading(false);
      setLoadProgress(null);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTheme("light");
  }, [setTheme, slug]);

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== PIN_DIGITS || verifying) return;
    setVerifying(true);
    const res = await fetch(`/api/lk/${slug}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pin }),
    });
    setVerifying(false);
    if (!res.ok) {
      setPinFeedback("bad");
      window.setTimeout(() => setPinFeedback(null), 2200);
      setDigits(Array(PIN_DIGITS).fill(""));
      pinInputsRef.current[0]?.focus();
      return;
    }
    setPinFeedback("ok");
    window.setTimeout(() => {
      setPinFeedback(null);
      void load();
    }, 900);
  }

  useEffect(() => {
    if (!loading && !data) {
      pinInputsRef.current[0]?.focus();
    }
  }, [loading, data]);

  const lkPageBg = theme === "dark" ? "#000000" : "#F6F5F8";

  if (loading) {
    return (
      <div
        className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden"
        style={{ backgroundColor: lkPageBg }}
      >
        <LkViewHeader />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="p-6 text-center text-sm text-[var(--muted)]">Загрузка…</p>
        </div>
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--table-divider)] bg-[var(--background)] px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto max-w-md px-2">
            <div className="mb-1 text-xs text-[var(--muted)]">
              {loadProgress == null ? "Загрузка…" : `${loadProgress}%`}
            </div>
            <div className="h-1.5 w-full overflow-hidden bg-[var(--foreground)]/10">
              {loadProgress == null ? (
                <div className="h-full w-1/3 animate-pulse bg-[#0f68e4]" />
              ) : (
                <div
                  className="h-full bg-[#0f68e4] transition-[width] duration-150"
                  style={{ width: `${loadProgress}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data && bootError) {
    return (
      <div
        className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden"
        style={{ backgroundColor: lkPageBg }}
      >
        <LkViewHeader />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="p-6 text-center text-sm text-[var(--muted)]">{bootError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden"
        style={{ backgroundColor: lkPageBg }}
      >
        <LkViewHeader />
        <div className="mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col justify-center px-3 pb-16 sm:px-4">
          <h1 className="text-center text-lg font-medium">Просмотр ЛК</h1>
          <p className="mt-3 text-center text-sm text-[var(--muted)]">Введите ПИН-код</p>

          {pinFeedback === "ok" ? (
            <p className="mt-4 text-center text-sm text-[#00B956]">Введён верный ПИН-код</p>
          ) : null}
          {pinFeedback === "bad" ? (
            <p className="mt-4 text-center text-sm text-red-600">Введён неверный ПИН-код</p>
          ) : null}

          <form onSubmit={(e) => void verifyPin(e)} className="mt-8 w-full space-y-6">
            <PinDigitInputs
              digits={digits}
              setDigits={setDigits}
              inputsRef={pinInputsRef}
              disabled={verifying || pinFeedback === "ok"}
            />
            <button
              type="submit"
              disabled={pin.length !== PIN_DIGITS || verifying || pinFeedback === "ok"}
              className="w-full rounded-[8px] bg-[#0f68e4] py-3 text-sm font-medium text-white transition-colors hover:bg-[#2677e8] disabled:opacity-40"
            >
              Продолжить
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { full } = data;
  const remaining = full.project.remainingAmountRubles ?? 0;

  const cardBg = theme === "dark" ? "#1a1a1a" : "#ffffff";
  const sectionShell = "min-w-0 rounded-[12px] p-3 sm:p-5";

  return (
    <div className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden text-[var(--foreground)]">
      <LkViewHeader />
      <div
        className="flex min-w-0 flex-1 flex-col px-3 py-8 sm:px-4"
        style={{ backgroundColor: lkPageBg }}
      >
        <div className="mx-auto w-full min-w-0 max-w-[1200px] flex-1">
          <h1 className="lk-section-title text-center text-balance break-words px-1 max-lg:!text-[1.25rem] max-lg:!leading-snug">
            {full.project.lkTitle}
          </h1>

          <div className="mt-10 grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <section
              className={`order-1 min-w-0 space-y-6 lg:col-start-2 lg:row-start-1 lg:space-y-8`}
            >
              <div className={sectionShell} style={{ backgroundColor: cardBg }}>
                <h2 className="lk-section-title">Текущий дедлайн</h2>
                <div className="mt-4 w-full">
                  <DeadlineBlock
                    startAt={full.deadline?.startAt ?? null}
                    endAt={full.deadline?.endAt ?? null}
                    comment={full.deadline?.comment ?? null}
                    className="w-full"
                    commentClassName="text-sm whitespace-pre-wrap"
                  />
                </div>
              </div>

              <div className={sectionShell} style={{ backgroundColor: cardBg }}>
                <h2 className="lk-section-title">Этапы</h2>
                <div className="mt-4 space-y-4">
                  <div className="space-y-6">
                    {full.stages.map((st) => (
                      <div key={st.id}>
                        <div className="font-medium">{st.title}</div>
                        <div
                          className="mt-2 h-px w-full shrink-0"
                          style={{
                            backgroundColor: theme === "dark" ? "#474747" : "#dadada",
                          }}
                        />
                        <ul className="mt-2 space-y-2 text-sm">
                          {full.stageTasks
                            .filter((t) => t.stageId === st.id)
                            .map((t, ti) => (
                              <li key={ti} className="flex items-start gap-2">
                                <IconCheckbox checked={t.done} readOnly ariaLabel="" />
                                <span className="min-w-0 flex-1 leading-snug">
                                  <span
                                    className={t.done ? "line-through opacity-60" : ""}
                                  >
                                    {t.description}
                                  </span>
                                  {t.completedAt ? (
                                    <>
                                      {"\u00A0\u00A0"}
                                      <span
                                        className={
                                          t.done
                                            ? "text-[#00B956]"
                                            : theme === "dark"
                                              ? "text-[#666666]"
                                              : "text-[#a4a4a4]"
                                        }
                                      >
                                        {formatRuDayMonthWeekday(t.completedAt)}
                                      </span>
                                    </>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  {full.project.lkStagesComment?.trim() ? (
                    <p
                      className="whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm text-[var(--foreground)]"
                      style={{
                        borderColor: theme === "dark" ? "#333333" : "#dadada",
                      }}
                    >
                      {full.project.lkStagesComment}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={sectionShell} style={{ backgroundColor: cardBg }}>
                <h2 className="lk-section-title">Оплаты</h2>
                <div className="mt-4 w-full">
                  <PaymentBlock paidRubles={paid} remainingRubles={remaining} lkView />
                </div>
                <div className="mt-[7px] flex flex-wrap items-center gap-2">
                  {full.payments.textBlocks.map((b, i) => {
                    const hasText = Boolean(b.body?.trim());
                    const chip = paymentChipStyles(b.color, theme);
                    return (
                      <div
                        key={i}
                        className={`inline-flex max-w-full min-h-[24px] shrink-0 items-center rounded-full py-0.5 text-xs whitespace-nowrap ${
                          hasText ? "px-3" : "w-[43px] justify-center px-0"
                        }`}
                        style={{
                          color: chip.color,
                          backgroundColor: chip.backgroundColor,
                        }}
                      >
                        <span className="min-w-0 truncate">{hasText ? b.body : "\u00A0"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              className={`order-2 min-w-0 ${sectionShell} lg:col-start-1 lg:row-start-1`}
              style={{ backgroundColor: cardBg }}
            >
              <h2 className="lk-section-title">Таймлайн работ по проекту</h2>
              <div className="mt-4">
                {timelineEntriesSorted.map((e, i) => {
                  const isLast = i === timelineEntriesSorted.length - 1;
                  return (
                    <div key={e.id} className="flex gap-3">
                      <div className="flex w-[18px] shrink-0 flex-col items-center self-stretch">
                        <div
                          className="relative z-10 flex h-[18px] w-[18px] shrink-0 items-center justify-center pt-0.5"
                          style={{ backgroundColor: cardBg }}
                        >
                          <Image
                            src={checkboxCompleteIcon}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                          />
                        </div>
                        {!isLast ? (
                          <div className="mt-0 w-px flex-1 min-h-[24px] bg-[#00B956]" />
                        ) : null}
                      </div>
                      <article className="min-w-0 flex-1 pb-8">
                        <div className="text-xs text-[var(--muted)]">
                          {formatRuDayMonthWeekday(e.entryDate)}
                        </div>
                        <div className="mt-1 text-lg font-medium leading-snug">{e.title}</div>
                        {e.description?.trim() ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm opacity-80">
                            {e.description}
                          </p>
                        ) : null}
                        <div className="mt-2 grid w-full grid-cols-3 gap-2">
                          {(imagesByEntry.get(e.id) ?? []).map((im, ii) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={ii}
                              src={im.webpUrl || ""}
                              alt=""
                              className="aspect-[3/2] w-full min-w-0 cursor-pointer rounded-lg object-cover"
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
                          {(linksByEntry.get(e.id) ?? []).map((ln, li) => (
                            <li key={li}>
                              <a
                                href={ln.url}
                                className="underline decoration-[#5A86EE]/50 underline-offset-[3px]"
                                style={{ color: "#5A86EE" }}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {ln.linkTitle}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </article>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {slider ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          onClick={() => setSlider(null)}
        >
          <div className="flex shrink-0 justify-end p-4">
            <button
              type="button"
              className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-opacity hover:opacity-95"
              aria-label="Закрыть"
              onClick={(e) => {
                e.stopPropagation();
                setSlider(null);
              }}
            >
              <Image
                src={closeBlack}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="transition-opacity duration-200 group-hover:opacity-0"
              />
              <Image
                src={closeNav}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slider[sliderIdx]}
              alt=""
              className="max-h-[85vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {slider.length > 1 ? (
              <>
                <button
                  type="button"
                  disabled={sliderIdx <= 0}
                  className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-medium text-black shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-35 sm:left-6"
                  aria-label="Предыдущее фото"
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
                  className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl font-medium text-black shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-35 sm:right-6"
                  aria-label="Следующее фото"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSliderIdx((i) => Math.min(slider.length - 1, i + 1));
                  }}
                >
                  →
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
