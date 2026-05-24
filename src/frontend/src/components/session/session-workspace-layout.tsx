"use client";

import type { ReactNode, SVGProps } from "react";
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

function GitHubLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.22.7-3.9-1.38-3.9-1.38-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.11-.75.41-1.26.74-1.55-2.57-.29-5.27-1.29-5.27-5.73 0-1.27.45-2.3 1.19-3.11-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.18 1.19a11.08 11.08 0 0 1 5.8 0c2.2-1.5 3.17-1.19 3.17-1.19.64 1.6.24 2.78.12 3.07.74.81 1.19 1.84 1.19 3.11 0 4.45-2.71 5.43-5.29 5.72.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.94 10.62 20.66 3h-1.59l-5.84 6.62L8.57 3H3.2l7.05 10.02L3.2 21h1.59l6.17-6.99L15.9 21h5.37l-7.33-10.38Zm-2.18 2.47-.72-1-5.68-7.87h2.45l4.59 6.37.72 1 5.96 8.27h-2.45l-4.87-6.77Z" />
    </svg>
  );
}

function SocialFooter() {
  const links = [
    {
      href: "https://github.com/alexnicita/labrador",
      label: "Open Labrador on GitHub",
      icon: <GitHubLogo className="size-4" />,
    },
    {
      href: "https://x.com/NicitaAlex",
      label: "Open NicitaAlex on X",
      icon: <XLogo className="size-4" />,
    },
  ];

  return (
    <footer
      aria-label="Labrador social links"
      className="absolute bottom-20 right-2 z-30 flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 p-1 shadow-[0_10px_30px_rgba(31,45,61,0.14)] backdrop-blur sm:bottom-3 sm:right-4 lg:bottom-4 lg:right-5"
    >
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className="grid size-7 place-items-center rounded-full text-[#242b36] transition hover:bg-[#eef3f8] hover:text-[#111318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111318]/20"
        >
          {link.icon}
        </a>
      ))}
    </footer>
  );
}

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
                <div className="block max-w-full cursor-default truncate text-left text-[17px] font-bold tracking-normal text-[#111318]">
                  {title}
                </div>
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
      <SocialFooter />
    </main>
  );
}
