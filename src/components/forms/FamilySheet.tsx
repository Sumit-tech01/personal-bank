"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import SimpleDatePicker from "@/components/ui/SimpleDatePicker";
import { useApp } from "@/context/AppContext";
import type { FamilyMember } from "@/lib/types";

interface FamilySheetProps {
  open: boolean;
  onClose: () => void;
  member?: FamilyMember | null;
}

export default function FamilySheet({ open, onClose, member }: FamilySheetProps) {
  const { saveFamilyMember, notify, t } = useApp();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setBusy(false);
    setName(member?.name ?? "");
    setRelation(member?.relation ?? "");
    setDateOfBirth(member?.dateOfBirth ?? "");
    setPhone(member?.phone ?? "");
    setNotes(member?.notes ?? "");
  }, [open, member]);

  const save = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter a name.");
      return;
    }
    setBusy(true);
    try {
      await saveFamilyMember(
        {
          name,
          relation,
          dateOfBirth: dateOfBirth || undefined,
          phone: phone || undefined,
          notes: notes || undefined,
        },
        member?.id
      );
      notify(member ? t("common.saved") : t("common.saved"));
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this person.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={member ? t("family.editMember") : t("family.addMember")}
      subtitle="Keep names, birthdays and phone numbers together."
      footer={
        <button type="button" className="btn-primary w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {busy ? "…" : member ? t("form.saveChanges") : t("common.save")}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            {t("common.name")} <span className="text-negative">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Sunita Patil"
            autoFocus={!member}
          />
        </div>

        <div>
          <label className="label">{t("family.relation")}</label>
          <input
            className="input"
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
            placeholder="e.g. Wife, Son, Mother"
          />
        </div>

        <SimpleDatePicker label={t("common.date")} value={dateOfBirth} onChange={setDateOfBirth} />

        <div>
          <label className="label">
            {t("family.phone")} <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            type="tel"
            className="input"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Mobile number"
          />
        </div>

        <div>
          <label className="label">
            {t("common.notes")} <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            className="textarea"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything you want to remember"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-negative-light px-3.5 py-2.5 text-[12.5px] font-medium text-negative">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
