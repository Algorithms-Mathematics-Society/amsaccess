"use client";

import { useEffect, useMemo, useState } from "react";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  owner_firebase_uid: string;
  max_contest_duration_mins: number;
  allow_bulk_invites: boolean;
  max_invites_per_batch: number;
  invite_subject_template: string;
  invite_body_template: string;
  email_from_name: string;
  email_reply_to?: string | null;
  metadata_json: Record<string, unknown>;
};

export default function AmsAdminPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [selected, setSelected] = useState<OrgRow | null>(null);
  const [status, setStatus] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newOwner, setNewOwner] = useState("");

  async function load() {
    const res = await fetch("/api/amsadmin/orgs", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/amsadmin/login";
      return;
    }
    const data = (await res.json()) as OrgRow[];
    setOrgs(data);
    if (!selected && data.length > 0) setSelected(data[0]);
  }

  useEffect(() => {
    void load();
  }, []);

  const preview = useMemo(() => {
    if (!selected) return "";
    return (selected.invite_body_template ?? "")
      .replaceAll("{{email}}", "candidate@example.com")
      .replaceAll("{{download_url}}", "https://amsaccess.com/download");
  }, [selected]);

  async function saveSelected() {
    if (!selected) return;
    const res = await fetch(`/api/amsadmin/orgs/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        max_contest_duration_mins: selected.max_contest_duration_mins,
        allow_bulk_invites: selected.allow_bulk_invites,
        max_invites_per_batch: selected.max_invites_per_batch,
        invite_subject_template: selected.invite_subject_template,
        invite_body_template: selected.invite_body_template,
        email_from_name: selected.email_from_name,
        email_reply_to: selected.email_reply_to ?? null,
        metadata_json: selected.metadata_json ?? {},
      }),
    });
    setStatus(res.ok ? "Saved." : "Save failed.");
    await load();
  }

  async function createOrg() {
    const res = await fetch("/api/amsadmin/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        slug: newSlug,
        owner_firebase_uid: newOwner,
      }),
    });
    if (res.ok) {
      setStatus("Organization created.");
      setNewName("");
      setNewSlug("");
      setNewOwner("");
      await load();
    } else {
      setStatus("Create org failed.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 text-white">
      <h1 className="text-2xl font-semibold">AMS Admin</h1>
      <p className="mt-1 text-sm text-white/60">Manage org policies, contest duration limits, bulk invite permission, and email templates.</p>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="glass-card p-3">
          <div className="mb-3 rounded border border-white/10 p-2">
            <p className="mb-2 text-xs uppercase text-white/60">Add Organization</p>
            <input className="glass-input mb-2 w-full" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="glass-input mb-2 w-full" placeholder="Slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            <input className="glass-input mb-2 w-full" placeholder="Owner UID (Firebase Console → Users)" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
            <button className="rounded bg-white px-3 py-1 text-sm text-black" onClick={() => void createOrg()}>Create</button>
          </div>
          {orgs.map((o) => (
            <button key={o.id} className="mb-2 block w-full rounded border border-white/10 p-2 text-left" onClick={() => setSelected(o)}>
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-white/60">{o.slug}</div>
            </button>
          ))}
        </div>
        <div className="glass-card p-4 md:col-span-2">
          {!selected ? <p className="text-sm text-white/60">Select an organization.</p> : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className="glass-input" value={selected.max_contest_duration_mins} onChange={(e) => setSelected({ ...selected, max_contest_duration_mins: Number(e.target.value) })} />
                <input className="glass-input" value={selected.max_invites_per_batch} onChange={(e) => setSelected({ ...selected, max_invites_per_batch: Number(e.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.allow_bulk_invites} onChange={(e) => setSelected({ ...selected, allow_bulk_invites: e.target.checked })} />
                Allow bulk invite emails
              </label>
              <input className="glass-input" value={selected.invite_subject_template} onChange={(e) => setSelected({ ...selected, invite_subject_template: e.target.value })} />
              <textarea className="glass-input min-h-40 w-full" value={selected.invite_body_template} onChange={(e) => setSelected({ ...selected, invite_body_template: e.target.value })} />
              <div className="rounded border border-white/10 p-3">
                <div className="mb-1 text-xs uppercase text-white/60">Preview</div>
                <pre className="whitespace-pre-wrap text-sm">{preview}</pre>
              </div>
              <button className="rounded bg-white px-4 py-2 text-black" onClick={() => void saveSelected()}>Save Policy</button>
              {status ? <p className="text-sm text-white/70">{status}</p> : null}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
