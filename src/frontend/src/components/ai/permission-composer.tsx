"use client";

import { useState } from "react";
import { LockKeyhole, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionState } from "@/lib/session/types";

type PermissionComposerProps = {
  permission: PermissionState;
};

export function PermissionComposer({ permission }: PermissionComposerProps) {
  const [draft, setDraft] = useState("");
  const disabled = !permission.canEditPrompt;

  return (
    <div className="flex items-center gap-3 p-4">
      <LockKeyhole className="size-5 shrink-0 text-[#697486]" aria-hidden="true" />
      {disabled ? (
        <div
          className="flex min-h-10 flex-1 items-center rounded-[12px] bg-[#f4f6f9] px-3 py-2 text-[13px] leading-5 text-[#7a8494]"
          aria-label="Prompt composer permission"
        >
          {permission.message}
        </div>
      ) : (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask AI to revise this session..."
          aria-label="Prompt composer"
          className="h-10 rounded-[12px] border-0 bg-[#f4f6f9] px-3 text-[13px] text-[#465264] shadow-none focus-visible:ring-0"
        />
      )}
      <Button
        type="button"
        size="icon-lg"
        variant="secondary"
        disabled={disabled || draft.trim().length === 0}
        className="rounded-full bg-[#eef2f6] text-[#8a94a3] hover:bg-[#e7ecf2]"
        aria-label="Send prompt"
      >
        <SendHorizontal className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
