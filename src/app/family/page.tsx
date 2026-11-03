"use client";

import React, { useMemo, useState } from "react";
import {
  Cake,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import StatusPill from "@/components/ui/StatusPill";
import FamilySheet from "@/components/forms/FamilySheet";
import { ageOn, daysBetween, nextBirthday, relativeDayLabel, todayISO } from "@/lib/dates";
import type { FamilyMember } from "@/lib/types";

export default function FamilyPage() {
  const { familyMembers, deleteFamilyMember, notify, t, formatDate } = useApp();
  const confirm = useConfirm();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);

  const withBirthdays = useMemo(
    () =>
      familyMembers
        .filter((member) => member.dateOfBirth)
        .map((member) => ({
          member,
          next: nextBirthday(member.dateOfBirth as string),
          days: daysBetween(todayISO(), nextBirthday(member.dateOfBirth as string)),
        }))
        .sort((a, b) => a.days - b.days),
    [familyMembers]
  );

  const nextBirthdayRow = withBirthdays[0];
  const thisMonth = withBirthdays.filter(
    (row) => row.next.slice(5, 7) === todayISO().slice(5, 7)
  ).length;

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const remove = async (member: FamilyMember) => {
    const okay = await confirm({
      title: t("family.confirmDelete"),
      message: t("dialog.deleteWarning"),
      confirmLabel: t("family.deleteMember"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!okay) return;
    await deleteFamilyMember(member.id);
    notify("Family member removed.");
  };

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader
        title={t("family.title")}
        subtitle={t("family.subtitle")}
        backHref="/more"
        right={
          <button
            type="button"
            onClick={openNew}
            className="flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-3.5 text-[12px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            {t("common.add")}
          </button>
        }
      />

      <main className="app-container space-y-4 py-4">
        <section className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-ink">{t("family.title")}</h2>
              <p className="text-[11.5px] text-ink-muted">
                {t("family.subtitle")}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatCard
              label={t("family.title")}
              value={String(familyMembers.length)}
              hint={familyMembers.length === 1 ? t("family.memberCount", { count: 1 }) : t("family.memberCountPlural", { count: familyMembers.length })}
            />
            <StatCard
              label={t("family.birthday")}
              value={String(thisMonth)}
              hint={
                nextBirthdayRow
                  ? `${nextBirthdayRow.member.name.split(" ")[0]}`
                  : t("common.noRecords")
              }
              tone={thisMonth > 0 ? "amber" : "default"}
            />
          </div>
        </section>

        {nextBirthdayRow && (
          <section className="flex items-center gap-3 rounded-card border border-amber/25 bg-amber-light/60 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber">
              <Cake className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">
                {nextBirthdayRow.member.name}
              </p>
              <p className="text-[11.5px] text-ink-secondary">
                {formatDate(nextBirthdayRow.next, "long")} ·{" "}
                {relativeDayLabel(nextBirthdayRow.next)}
              </p>
            </div>
            <StatusPill
              label={`Age ${ageOn(
                nextBirthdayRow.member.dateOfBirth as string,
                nextBirthdayRow.next
              )}`}
              tone="amber"
            />
          </section>
        )}

        {familyMembers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={t("family.noMembers")}
            message={t("family.subtitle")}
            actionLabel={t("family.addMember")}
            onAction={openNew}
          />
        ) : (
          <div className="space-y-2.5">
            {familyMembers.map((member) => {
              const next = member.dateOfBirth ? nextBirthday(member.dateOfBirth) : null;
              const days = next ? daysBetween(todayISO(), next) : null;
              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-line bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[16px] font-semibold text-brand-800">
                      {member.name.trim().charAt(0).toUpperCase() || "F"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-ink">
                          {member.name}
                        </p>
                        <StatusPill label={member.relation || t("family.title")} tone="neutral" />
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {member.dateOfBirth && (
                          <p className="flex items-center gap-1.5 text-[11.5px] text-ink-secondary">
                            <Cake className="h-3 w-3 text-ink-muted" />
                            {formatDate(member.dateOfBirth, "long")} · {ageOn(member.dateOfBirth)}
                            {next && days !== null && days <= 30 && (
                              <span className="font-semibold text-amber">
                                · {relativeDayLabel(next)}
                              </span>
                            )}
                          </p>
                        )}
                        {member.phone && (
                          <a
                            href={`tel:${member.phone.replace(/\s+/g, "")}`}
                            className="flex items-center gap-1.5 text-[11.5px] font-medium text-brand-700"
                          >
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </a>
                        )}
                        {member.notes && (
                          <p className="truncate text-[11px] text-ink-muted">{member.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(member);
                          setSheetOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary"
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(member)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-negative"
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <FamilySheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        member={editing}
      />
    </div>
  );
}
