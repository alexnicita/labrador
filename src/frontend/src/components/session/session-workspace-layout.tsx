"use client";

import type { ReactNode } from "react";
import {
  Eye,
  Menu,
  MessageSquareText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SessionWorkspaceLayoutProps = {
  title: string;
  subtitle: string;
  liveCount: number;
  viewerCount: number;
  threadCount: number;
  sidebar: ReactNode;
  main: ReactNode;
  rightPanel: ReactNode;
  presence: ReactNode;
  shareControl: ReactNode;
  tipControl: ReactNode;
  overflowControl: ReactNode;
};

export function SessionWorkspaceLayout({
  title,
  subtitle,
  liveCount,
  viewerCount,
  threadCount,
  sidebar,
  main,
  rightPanel,
  presence,
  shareControl,
  tipControl,
  overflowControl,
}: SessionWorkspaceLayoutProps) {
  return (
    <main className="labrador-app-bg relative h-dvh w-screen overflow-hidden px-0 py-0 text-[#111318] sm:px-6 sm:py-6 lg:px-10 lg:py-11">
      <section className="relative mx-auto grid h-full min-h-0 w-full overflow-hidden bg-white shadow-[0_28px_90px_rgba(31,45,61,0.16)] sm:h-[calc(100dvh-48px)] sm:rounded-[24px] sm:border sm:border-white/80 lg:h-[calc(100dvh-88px)] lg:min-h-[760px] lg:max-w-[1640px] lg:rounded-[30px] lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="hidden min-h-0 lg:block">
          {sidebar}
        </div>

        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#dfe5eb] bg-white px-3 sm:min-h-[88px] sm:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="rounded-[12px] lg:hidden"
                    aria-label="Open navigation"
                  >
                    <Menu className="size-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-[320px] gap-0 bg-white p-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Session navigation</SheetTitle>
                    <SheetDescription>
                      Navigate session context, files, versions, and branches.
                    </SheetDescription>
                  </SheetHeader>
                  {sidebar}
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <button
                  type="button"
                  className="block max-w-full truncate text-left text-[17px] font-bold tracking-[-0.01em] text-[#111318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
                  aria-label="Open session switcher"
                >
                  {title}
                </button>
                <p className="text-[12px] font-medium text-[#6d7788]">{subtitle}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-4 xl:flex">
                {presence}
                <div className="flex h-8 items-center gap-2 text-[13px] font-semibold text-[#151922]">
                  <span className="size-2 rounded-full bg-[#19a76f]" />
                  {liveCount} in session
                </div>
                <div className="flex h-8 items-center gap-2 text-[13px] font-semibold text-[#151922]">
                  <Eye className="size-4" aria-hidden="true" />
                  {viewerCount} viewers
                </div>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 rounded-[12px] bg-[#eef3f8] px-3 text-[13px] font-semibold xl:hidden"
                    aria-label="Open thread panel"
                  >
                    <MessageSquareText className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Thread</span>
                    <span className="ml-1 rounded-full bg-white px-1.5 text-[11px] text-[#465264]">
                      {threadCount}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[94vw] gap-0 bg-[#fbfcfd] p-0 sm:max-w-[430px]"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Session thread</SheetTitle>
                    <SheetDescription>
                      Comments, activity, and participants for this shared session.
                    </SheetDescription>
                  </SheetHeader>
                  {rightPanel}
                </SheetContent>
              </Sheet>

              <div className="hidden sm:block">{shareControl}</div>
              <div className="hidden sm:block">{tipControl}</div>
              {overflowControl}
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-hidden xl:grid-cols-[minmax(0,1fr)_330px] 2xl:grid-cols-[minmax(0,1fr)_350px]">
            {main}
            <div className="hidden min-h-0 border-l border-[#e0e6ed] bg-[#fbfcfd] p-3 xl:block">
              {rightPanel}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
