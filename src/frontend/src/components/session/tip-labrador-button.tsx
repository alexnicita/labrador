"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Loader2,
  TerminalSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { PublicTipConfig } from "@/lib/tips/config";
import { cn } from "@/lib/utils";

type TipLabradorButtonProps = {
  trigger?: "button" | "menu-item";
};

type LoadState = "idle" | "loading" | "ready" | "error";

export function TipLabradorButton({ trigger = "button" }: TipLabradorButtonProps) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<PublicTipConfig | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [checkoutAmount, setCheckoutAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const agentEndpoints = useMemo(
    () => (config?.x402.available ? config.x402.amounts : []),
    [config],
  );

  useEffect(() => {
    if (!open || config) {
      return;
    }

    const controller = new AbortController();

    async function loadConfig() {
      setLoadState("loading");
      setError(null);

      try {
        const response = await fetch("/api/tips/config", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Tip configuration is unavailable.");
        }

        const payload = (await response.json()) as PublicTipConfig;

        if (!controller.signal.aborted) {
          setConfig(payload);
          setLoadState("ready");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setLoadState("error");
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Tip configuration is unavailable.",
          );
        }
      }
    }

    void loadConfig();

    return () => {
      controller.abort();
    };
  }, [config, open]);

  async function startCheckout(amountCents: number) {
    setCheckoutAmount(amountCents);
    setError(null);

    try {
      const response = await fetch("/api/tips/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Could not start Stripe Checkout.");
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      setCheckoutAmount(null);
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Could not start Stripe Checkout.",
      );
    }
  }

  async function copyEndpoint(endpoint: string) {
    await navigator.clipboard.writeText(endpoint);
    setCopiedEndpoint(endpoint);
    window.setTimeout(() => setCopiedEndpoint(null), 1600);
  }

  const triggerNode =
    trigger === "menu-item" ? (
      <DropdownMenuItem
        className="sm:hidden"
        onSelect={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <CircleDollarSign className="size-4" aria-hidden="true" />
        Tip Labrador
      </DropdownMenuItem>
    ) : (
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[10px] border-[#dfe5eb] bg-white px-4 text-[13px] font-semibold text-[#111318] shadow-sm hover:bg-[#f8fafc]"
        >
          <CircleDollarSign className="size-4" aria-hidden="true" />
          Tip
        </Button>
      </SheetTrigger>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {triggerNode}
      <SheetContent
        side="right"
        className="w-[94vw] gap-0 overflow-y-auto bg-white p-0 sm:max-w-[430px]"
      >
        <SheetHeader className="border-b border-[#e2e8f0] px-5 py-5 text-left">
          <SheetTitle className="flex items-center gap-2 text-[18px] text-[#111318]">
            <CircleDollarSign className="size-5 text-[#0f8a61]" aria-hidden="true" />
            Tip Labrador
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[#647084]">
            Voluntary support through Stripe Checkout. Tips do not unlock access.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-5 py-5">
          {loadState === "loading" ? (
            <div className="flex min-h-40 items-center justify-center text-[13px] font-medium text-[#647084]">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Loading tip options
            </div>
          ) : null}

          {loadState === "error" ? (
            <StatusMessage tone="error">
              {error || "Tip configuration is unavailable."}
            </StatusMessage>
          ) : null}

          {config ? (
            <>
              <section className="space-y-3">
                <div>
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#596579]">
                    Humans
                  </h3>
                  <p className="mt-1 text-[13px] leading-5 text-[#647084]">
                    Stripe-hosted checkout for card and wallet payments.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {config.checkout.presets.map((preset) => {
                    const loading = checkoutAmount === preset.amountCents;
                    const disabled =
                      !config.checkout.available || !preset.configured || loading;

                    return (
                      <Button
                        key={preset.amountCents}
                        type="button"
                        variant="secondary"
                        className="h-11 rounded-[10px] bg-[#eef3f8] text-[14px] font-bold text-[#111318] hover:bg-[#e3ebf3]"
                        disabled={disabled}
                        onClick={() => void startCheckout(preset.amountCents)}
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                          preset.label
                        )}
                      </Button>
                    );
                  })}
                </div>

                {!config.checkout.available ? (
                  <StatusMessage>
                    Stripe Checkout is waiting on server payment secrets.
                  </StatusMessage>
                ) : null}
              </section>

              {config.x402.available ? (
                <section className="space-y-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#596579]">
                      <TerminalSquare className="size-4" aria-hidden="true" />
                      Agents
                    </h3>
                    <p className="mt-1 text-[13px] leading-5 text-[#647084]">
                      x402 on {config.x402.network}; retry paid requests with a
                      payment signature.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {agentEndpoints.map((amount) => (
                      <button
                        key={amount.amountCents}
                        type="button"
                        className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-[10px] border border-[#dfe5eb] bg-white px-3 py-3 text-left shadow-sm transition hover:bg-[#f8fafc]"
                        onClick={() => void copyEndpoint(amount.endpoint)}
                      >
                        <span className="shrink-0 rounded-full bg-[#e8f7ef] px-2 py-1 text-[12px] font-bold text-[#0f8a61]">
                          {amount.label}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#2b3442]">
                          {amount.endpoint}
                        </span>
                        {copiedEndpoint === amount.endpoint ? (
                          <Check className="size-4 shrink-0 text-[#0f8a61]" aria-hidden="true" />
                        ) : (
                          <Copy className="size-4 shrink-0 text-[#647084]" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="rounded-[10px] border border-[#dfe5eb] bg-[#fbfcfd] p-3 text-[12px] leading-5 text-[#647084]">
                <div className="flex items-start gap-2">
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Tips are payment records only, not Labrador permission grants.
                  </span>
                </div>
              </div>
            </>
          ) : null}

          {error && loadState !== "error" ? (
            <StatusMessage tone="error">{error}</StatusMessage>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border px-3 py-2 text-[12px] font-medium leading-5",
        tone === "error"
          ? "border-[#f0c4c4] bg-[#fff5f5] text-[#9c2d2d]"
          : "border-[#dfe5eb] bg-[#fbfcfd] text-[#647084]",
      )}
    >
      {children}
    </div>
  );
}
