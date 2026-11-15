import { ConversationList } from "@/components/chat/conversation-list";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireSupplier } from "@/lib/auth";
import { listConversations } from "@/lib/chat-data";

export const metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  const { supplier } = await requireSupplier();
  const rows = await listConversations(supplier.id);
  return (
    <>
      <PageHeader title="Mensagens" description="Conversas diretas com seus revendedores" />
      <Card className="overflow-hidden">
        <ConversationList rows={rows} />
      </Card>
    </>
  );
}
