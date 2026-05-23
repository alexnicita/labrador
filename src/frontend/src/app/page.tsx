import { CollaborativeSessionRoom } from "@/components/session/collaborative-session-room";
import { listDemoFeedRows } from "@/lib/demo-feed/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await listDemoFeedRows();

  return (
    <CollaborativeSessionRoom
      initialRows={rows}
      realtimeWsUrl={process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? ""}
    />
  );
}
