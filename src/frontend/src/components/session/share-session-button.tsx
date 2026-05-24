"use client";

import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareSessionButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 rounded-[10px] border-[#dfe5eb] bg-white px-4 text-[13px] font-semibold text-[#111318] shadow-sm"
      disabled
      title="Sharing controls are not available yet"
    >
      <Upload className="size-4" aria-hidden="true" />
      Share
    </Button>
  );
}
