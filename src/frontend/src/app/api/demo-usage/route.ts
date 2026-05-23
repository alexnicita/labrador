import { getDemoUsageAggregates } from "@/lib/demo-feed/clickhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usage = await getDemoUsageAggregates();
  return Response.json(usage);
}
