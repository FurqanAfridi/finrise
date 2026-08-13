import type { TenantRole } from "@prisma/client";
import {
  IconAddressBook,
  IconCash,
  IconChartBar,
  IconDashboard,
  IconReceipt2,
  IconSettings,
  IconTruckDelivery,
  IconUsers,
  IconWallet,
  type Icon,
} from "@tabler/icons-react";

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  roles?: TenantRole[];
  mobilePrimary?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const BROKER_ROLES: TenantRole[] = ["ADMIN", "BROKER", "ACCOUNTANT"];

/**
 * Compact role-filtered sidebar.
 * Create invoice lives as a page CTA; notifications via top-bar bell;
 * companies + team live under Settings.
 */
export function getNavSections(role?: TenantRole): NavSection[] {
  if (role === "PUBLISHER") {
    return [
      {
        label: "Menu",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: IconDashboard, mobilePrimary: true },
          { href: "/publishers", label: "My invoices", icon: IconReceipt2, mobilePrimary: true },
          { href: "/payouts", label: "Payments", icon: IconCash, mobilePrimary: true },
        ],
      },
    ];
  }

  if (role === "BUYER") {
    return [
      {
        label: "Menu",
        items: [
          { href: "/dashboard", label: "Dashboard", icon: IconDashboard, mobilePrimary: true },
          { href: "/buyers", label: "Invoices to pay", icon: IconReceipt2, mobilePrimary: true },
        ],
      },
    ];
  }

  const sections: NavSection[] = [
    {
      label: "Menu",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: IconDashboard, roles: BROKER_ROLES, mobilePrimary: true },
        { href: "/buyers", label: "Invoices", icon: IconReceipt2, roles: BROKER_ROLES, mobilePrimary: true },
        { href: "/publishers", label: "Payables", icon: IconTruckDelivery, roles: BROKER_ROLES, mobilePrimary: true },
        { href: "/directory", label: "Contacts", icon: IconAddressBook, roles: BROKER_ROLES },
        { href: "/expenses", label: "Expenses", icon: IconWallet, roles: BROKER_ROLES },
        { href: "/reports", label: "Reports", icon: IconChartBar, roles: BROKER_ROLES, mobilePrimary: true },
        { href: "/partners", label: "Partners", icon: IconUsers, roles: BROKER_ROLES },
        { href: "/settings", label: "Settings", icon: IconSettings, roles: ["ADMIN"] },
      ],
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles) return true;
        if (!role) return false;
        return item.roles.includes(role);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export function getMobileNav(role?: TenantRole): NavItem[] {
  const items = getNavSections(role).flatMap((s) => s.items);
  const primary = items.filter((item) => item.mobilePrimary).slice(0, 4);
  if (primary.length > 0) return primary;
  return items.slice(0, 4);
}
