"use client";

import { useState } from "react";

const VIEWS = [
  {
    id: "collect",
    label: "Collect",
    hint: "Open buyer invoices",
    kpis: [
      { label: "To collect", value: "$48,200.00", tone: "primary" },
      { label: "Past due", value: "$3,040.00", tone: "danger" },
      { label: "Drafts", value: "4 ready", tone: "info" },
      { label: "This week", value: "$11,600.00", tone: "success" },
    ],
    bars: [46, 62, 54, 78, 70, 88, 64, 82],
    note: "Sample buyer invoices. Layout only.",
  },
  {
    id: "pay",
    label: "Pay",
    hint: "Publisher payouts",
    kpis: [
      { label: "To pay", value: "$19,450.00", tone: "warning" },
      { label: "Approved", value: "$6,200.00", tone: "success" },
      { label: "Waiting", value: "2 payables", tone: "info" },
      { label: "This week", value: "$4,800.00", tone: "primary" },
    ],
    bars: [38, 50, 44, 60, 52, 72, 48, 66],
    note: "Sample publisher payables. Layout only.",
  },
  {
    id: "profit",
    label: "Profit",
    hint: "After payouts and expenses",
    kpis: [
      { label: "Profit", value: "$12,810.00", tone: "success" },
      { label: "Paid in", value: "$41,000.00", tone: "primary" },
      { label: "Paid out", value: "$22,190.00", tone: "info" },
      { label: "Expenses", value: "$6,000.00", tone: "warning" },
    ],
    bars: [40, 58, 50, 74, 68, 90, 60, 80],
    note: "Sample month. Layout only.",
  },
] as const;

export function ProductShowcase() {
  const [viewId, setViewId] = useState<(typeof VIEWS)[number]["id"]>("collect");
  const view = VIEWS.find((row) => row.id === viewId) ?? VIEWS[0];

  return (
    <div className="mk-mock">
      <div className="mk-mock-top">
        <p className="mk-mock-title">Your books, at a glance</p>
        <div className="mk-tabs" role="tablist" aria-label="Preview">
          {VIEWS.map((row) => (
            <button
              key={row.id}
              type="button"
              role="tab"
              aria-selected={row.id === view.id}
              className={row.id === view.id ? "mk-tab is-on" : "mk-tab"}
              onClick={() => setViewId(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mk-mock-hint">{view.hint}</p>
      <div className="mk-kpis">
        {view.kpis.map((kpi) => (
          <div key={kpi.label} className={`mk-kpi tone-${kpi.tone}`}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </div>
        ))}
      </div>
      <div className="mk-bars" aria-hidden>
        {view.bars.map((h, i) => (
          <div
            key={`${view.id}-${i}`}
            className={`mk-bar tone-${view.kpis[i % 4]?.tone ?? "primary"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mk-mock-note">{view.note}</p>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Set up the company",
    body: "Add buyers, publishers, NET terms, and contract start dates. Everyone on the team sees the same ledger.",
  },
  {
    n: "02",
    title: "Log the day’s work",
    body: "Enter calls and leads, or drop in an invoice. Missed a date? Add it later. Import a Google Sheet if the history already lives there.",
  },
  {
    n: "03",
    title: "Review, then send",
    body: "When a NET cycle ends, a draft is waiting. You check it. Nothing leaves FundLookup until you say so.",
  },
  {
    n: "04",
    title: "Close the month",
    body: "Profit after payouts and expenses, overdue items, and variances sit on the dashboard so the month is easy to explain.",
  },
];

export function HowItWorks() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  return (
    <div className="mk-how">
      <div className="mk-how-nav" role="tablist" aria-label="How FundLookup works">
        {STEPS.map((row, i) => (
          <button
            key={row.n}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? "mk-how-btn is-on" : "mk-how-btn"}
            onClick={() => setIndex(i)}
          >
            <span>{row.n}</span>
            {row.title}
          </button>
        ))}
      </div>
      <div className="mk-how-panel" role="tabpanel">
        <p className="mk-how-num">{step.n}</p>
        <h3 className="mk-h3">{step.title}</h3>
        <p>{step.body}</p>
      </div>
    </div>
  );
}

const SCOPES = [
  {
    id: "sheets",
    title: "The sheet you pick",
    scope: "spreadsheets.readonly",
    body: "We read cell values from one spreadsheet you choose, so historical invoice rows can be mapped into FundLookup. We never write back.",
    tone: "success",
  },
  {
    id: "drive",
    title: "Names, not your Drive",
    scope: "drive.metadata.readonly",
    body: "We list spreadsheet names and ids so you can pick a file. We do not open Docs, Photos, folders, or files you never select.",
    tone: "info",
  },
  {
    id: "email",
    title: "Which account is connected",
    scope: "userinfo.email",
    body: "We show the Google email on Integrations so you can confirm it is the right account, then disconnect whenever you want.",
    tone: "warning",
  },
] as const;

export function GoogleScopes() {
  const [open, setOpen] = useState<(typeof SCOPES)[number]["id"]>("sheets");
  const current = SCOPES.find((row) => row.id === open) ?? SCOPES[0];

  return (
    <div className="mk-scopes">
      <div className="mk-scope-picks">
        {SCOPES.map((row) => (
          <button
            key={row.id}
            type="button"
            className={row.id === open ? `mk-scope-pick tone-${row.tone} is-on` : `mk-scope-pick tone-${row.tone}`}
            onClick={() => setOpen(row.id)}
          >
            {row.title}
          </button>
        ))}
      </div>
      <div className={`mk-scope-card tone-${current.tone}`}>
        <p className="mk-scope-code">{current.scope}</p>
        <h3 className="mk-h3">{current.title}</h3>
        <p>{current.body}</p>
      </div>
    </div>
  );
}
