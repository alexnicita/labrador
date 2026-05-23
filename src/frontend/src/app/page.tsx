import { CollaborativeSessionRoom } from "@/components/session/collaborative-session-room";
import { getDemoMessageLimitState, listDemoFeedRows } from "@/lib/demo-feed/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await listDemoFeedRows();
  const messageLimit = await getDemoMessageLimitState();

  return (
    <CollaborativeSessionRoom
      initialRows={rows}
      initialMessageLimit={messageLimit}
      realtimeWsUrl={process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? ""}
    />
  );
}
