import Link from "next/link";
import Button from "@mui/material/Button";
import { ContactForm } from "@/components/directory/contact-form";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function NewPublisherPage() {
  const ctx = await requireBrokerOps();
  const { verticals } = await getDirectoryOptions(ctx.tenantId);

  return (
    <div>
      <PageHeader
        title="Create publisher"
        description="Company details, contract start, default terms, and the verticals this publisher runs."
      >
        <Link href="/directory?tab=publishers">
          <Button variant="outlined" color="primary" sx={{ minHeight: 44 }}>
            Back to publishers
          </Button>
        </Link>
      </PageHeader>
      <MainCard>
        <ContactForm kind="publisher" verticals={verticals} />
      </MainCard>
    </div>
  );
}
