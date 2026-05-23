"use client";

import { Copy, Link2, ShieldCheck, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ShareSessionButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[10px] border-[#dfe5eb] bg-white px-4 text-[13px] font-semibold text-[#111318] shadow-sm hover:bg-[#f8fafc]"
        >
          <Upload className="size-4" aria-hidden="true" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Share session</DropdownMenuLabel>
        <DropdownMenuItem>
          <Copy className="size-4" aria-hidden="true" />
          Copy viewer link
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link2 className="size-4" aria-hidden="true" />
          Invite collaborators
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <ShieldCheck className="size-4" aria-hidden="true" />
          Anonymous viewers enabled
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
