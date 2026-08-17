import Link from "next/link";
import Button from "@mui/material/Button";
import { ContactForm } from "@/components/directory/contact-form";
import { MainCard } from "@/components/berry/main-card";
import { PageHeader } from "@/components/page-header";
import { getDirectoryOptions } from "@/lib/queries";
import { requireBrokerOps } from "@/lib/tenant";

export default async function NewBuyerPage() {
  const ctx = await requireBrokerOps();
  const { verticals } = await getDirectoryOptions(ctx.tenantId);

  return (
    <div>
      <PageHeader
        title="Create buyer"
        description="Company details, contract start, default terms, and the verticals this buyer pays for."
      >
        <Link href="/directory?tab=buyers">
          <Button variant="outlined" color="primary" sx={{ minHeight: 44 }}>
            Back to buyers
          </Button>
        </Link>
      </PageHeader>
      <MainCard>
        <ContactForm kind="buyer" verticals={verticals} />
      </MainCard>
    </div>
  );
}
