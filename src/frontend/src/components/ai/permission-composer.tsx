"use client";

import { useState, type FormEvent } from "react";
import { LockKeyhole, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionState } from "@/lib/session/types";

type PermissionComposerProps = {
  permission: PermissionState;
  onSubmit?: (body: string) => void | Promise<void>;
};

export function PermissionComposer({ permission, onSubmit }: PermissionComposerProps) {
  const [draft, setDraft] = useState("");
  const disabled = !permission.canEditPrompt;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();

    if (disabled || !body) {
      return;
    }

    await onSubmit?.(body);
    setDraft("");
  }

  return (
    <form className="flex items-center gap-3 p-3 sm:p-4" onSubmit={handleSubmit}>
      <LockKeyhole className="size-5 shrink-0 text-[#697486]" aria-hidden="true" />
      {disabled ? (
        <div
          className="flex min-h-11 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] bg-[#f4f6f9] px-3 py-2 text-[13px] leading-5 text-[#687385]"
          aria-label="Prompt composer permission"
        >
          <span className="min-w-[220px] flex-1">{permission.message}</span>
          <button
            type="button"
            className="shrink-0 text-[12px] font-semibold text-[#202936] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
          >
            Request edit access
          </button>
        </div>
      ) : (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a prompt to the shared room..."
          aria-label="Prompt composer"
          className="h-10 rounded-[12px] border-0 bg-[#f4f6f9] px-3 text-[13px] text-[#465264] shadow-none focus-visible:ring-0"
        />
      )}
      <Button
        type="submit"
        size="icon-lg"
        variant="secondary"
        disabled={disabled || draft.trim().length === 0}
        className="rounded-full bg-[#eef2f6] text-[#8a94a3] hover:bg-[#e7ecf2]"
        aria-label="Send prompt"
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
