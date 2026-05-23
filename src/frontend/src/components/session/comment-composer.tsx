"use client";

import { useState, type FormEvent } from "react";
import { SendHorizontal, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PermissionState } from "@/lib/session/types";

type CommentComposerProps = {
  permission: PermissionState;
  onSubmit?: (body: string) => void | Promise<void>;
};

export function CommentComposer({ permission, onSubmit }: CommentComposerProps) {
  const [comment, setComment] = useState("");
  const disabled = !permission.canComment;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();

    if (disabled || !body) {
      return;
    }

    await onSubmit?.(body);
    setComment("");
  }

  return (
    <form className="border-t border-[#e6ebf1] bg-white p-3" onSubmit={handleSubmit}>
      <div className="flex h-12 items-center gap-2 rounded-[10px] border border-[#e0e6ed] bg-white px-3 shadow-[0_1px_0_rgba(13,18,28,0.02)]">
        <Input
          value={comment}
          disabled={disabled}
          onChange={(event) => setComment(event.target.value)}
          placeholder={disabled ? "Commenting is unavailable" : "Add a comment..."}
          className="h-8 flex-1 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100"
          aria-label="Add a comment"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-[#6f7a8b]"
          aria-label="Add reaction"
          disabled={disabled}
        >
          <Smile className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="submit"
          variant="secondary"
          size="icon-sm"
          className="rounded-full"
          aria-label="Send comment"
          disabled={disabled || comment.trim().length === 0}
        >
          <SendHorizontal className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
