"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className="flex items-center gap-3 p-3 sm:p-4" onSubmit={handleSubmit}>
      <Textarea
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? permission.message
            : "Add a prompt to the shared room..."
        }
        aria-label="Prompt composer"
        className="max-h-40 min-h-10 resize-none rounded-[12px] border-0 bg-[#f4f6f9] px-3 py-2.5 text-[13px] leading-5 text-[#465264] shadow-none focus-visible:ring-0 disabled:bg-[#f4f6f9] disabled:opacity-100"
      />
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
