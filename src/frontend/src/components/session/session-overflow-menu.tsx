"use client";

import { MoreHorizontal, Settings, Shield, SquarePen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TipLabradorButton } from "@/components/session/tip-labrador-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SessionOverflowMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="rounded-full text-[#151922] hover:bg-[#f1f4f7]"
          aria-label="Session options"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Session options</DropdownMenuLabel>
        <TipLabradorButton trigger="menu-item" />
        <DropdownMenuSeparator className="sm:hidden" />
        <DropdownMenuItem>
          <SquarePen className="size-4" aria-hidden="true" />
          Rename session
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Shield className="size-4" aria-hidden="true" />
          Permission settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="size-4" aria-hidden="true" />
          Session settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
