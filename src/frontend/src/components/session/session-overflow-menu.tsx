"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TipLabradorButton } from "@/components/session/tip-labrador-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SessionOverflowMenu() {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="rounded-full text-[#151922] hover:bg-[#f1f4f7] sm:hidden"
            aria-label="Session options"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Session options</DropdownMenuLabel>
          <TipLabradorButton trigger="menu-item" />
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="hidden rounded-full text-[#151922] sm:inline-flex"
        aria-label="Session options unavailable"
        disabled
        title="Session options are not available yet"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </Button>
    </>
  );
}
