import { requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { ExecutiveDashboard } from "./ExecutiveDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <ExecutiveDashboard userName={user.displayName} signOutPath={chatGPTSignOutPath("/")} />;
}
