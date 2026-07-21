import { requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
import { RichDashboard } from "./RichDashboard";

export const dynamic = "force-dynamic";

export default async function RichDashboardPage() {
  const user = await requireChatGPTUser("/rich");
  return <RichDashboard userName={user.displayName} signOutPath={chatGPTSignOutPath("/rich")} />;
}
