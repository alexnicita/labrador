"use client";

import type { ReactNode } from "react";
import { MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileCollaborationSheetProps = {
  children: ReactNode;
  liveCount: number;
};

export function MobileCollaborationSheet({
  children,
  liveCount,
}: MobileCollaborationSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[10px] border-[#dfe5eb] bg-white px-3 text-[13px] font-semibold lg:hidden"
        >
          <MessageSquareText className="size-4" aria-hidden="true" />
          Thread
          <span className="ml-1 rounded-full bg-[#f0f3f7] px-1.5 text-[11px]">
            {liveCount}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[94vw] gap-0 bg-white p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Session collaboration</SheetTitle>
          <SheetDescription>
            Comments, activity, and participants for this shared session.
          </SheetDescription>
        </SheetHeader>
        <div className="h-full p-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
