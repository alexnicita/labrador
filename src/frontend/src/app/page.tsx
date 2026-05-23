import { SessionShell } from "@/components/session/session-shell";
import { sessionReplicaData } from "@/lib/session/mock-data";

export default function Home() {
  return <SessionShell data={sessionReplicaData} />;
}
