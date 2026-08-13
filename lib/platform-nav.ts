import {
  IconBuilding,
  IconCash,
  IconDashboard,
  IconMailForward,
  IconReceipt2,
  IconTruckDelivery,
  IconUsers,
  IconUsersGroup,
  IconWallet,
  IconAddressBook,
  type Icon,
} from "@tabler/icons-react";

export type PlatformNavItem = {
  href: string;
  label: string;
  icon: Icon;
  mobilePrimary?: boolean;
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { href: "/admin", label: "Overview", icon: IconDashboard, mobilePrimary: true },
  { href: "/admin/users", label: "Users", icon: IconUsers, mobilePrimary: true },
  { href: "/admin/tenants", label: "Companies", icon: IconBuilding, mobilePrimary: true },
  { href: "/admin/memberships", label: "Memberships", icon: IconUsersGroup },
  { href: "/admin/invites", label: "Invites", icon: IconMailForward },
  { href: "/admin/buyers", label: "Buyers", icon: IconAddressBook },
  { href: "/admin/publishers", label: "Publishers", icon: IconTruckDelivery },
  { href: "/admin/buyer-invoices", label: "Buyer invoices", icon: IconReceipt2, mobilePrimary: true },
  { href: "/admin/publisher-invoices", label: "Payables", icon: IconCash },
  { href: "/admin/expenses", label: "Expenses", icon: IconWallet },
  { href: "/admin/partners", label: "Partners", icon: IconUsers },
];
