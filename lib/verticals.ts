import { prisma } from "@/lib/prisma";
import { PPC_VERTICALS } from "@/lib/ppc-verticals";

export async function ensurePpcVerticals(tenantId: string) {
  await prisma.vertical.createMany({
    data: PPC_VERTICALS.map((name) => ({ tenantId, name, isSystem: true })),
    skipDuplicates: true,
  });
  await prisma.vertical.updateMany({
    where: { tenantId, name: { in: [...PPC_VERTICALS] } },
    data: { isSystem: true },
  });
}
