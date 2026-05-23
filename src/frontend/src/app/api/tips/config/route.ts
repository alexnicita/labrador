import { getPublicTipConfig } from "@/lib/tips/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(getPublicTipConfig(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
