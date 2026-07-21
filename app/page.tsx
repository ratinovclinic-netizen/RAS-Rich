import { requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { RichDashboard } from "./rich/RichDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <RichDashboard userName={user.displayName} signOutPath={chatGPTSignOutPath("/")} />;
}
