"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TenantRole } from "@prisma/client";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { IconBell, IconChevronDown, IconMenu2, IconX } from "@tabler/icons-react";
import { logoutAction } from "@/app/actions/auth";
import { switchTenantAction } from "@/app/actions/ops";
import { Logo } from "@/components/berry/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { getMobileNav, getNavSections } from "@/lib/nav";
import { TENANT_ROLE_LABEL } from "@/lib/status";
import { contentMaxWidth, drawerCollapsedWidth, drawerWidth } from "@/theme/berry";

function isActive(pathname: string, href: string, allHrefs: string[]) {
  const path = href.split("?")[0];
  if (pathname === path) return true;
  if (!pathname.startsWith(`${path}/`)) return false;
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.split("?")[0].startsWith(`${path}/`) &&
      (pathname === other.split("?")[0] || pathname.startsWith(`${other.split("?")[0]}/`)),
  );
}

export function AppShell({
  children,
  email,
  name,
  avatarKey,
  tenantName,
  tenantId,
  tenantRole,
  memberships,
  unread,
}: {
  children: React.ReactNode;
  email?: string | null;
  name?: string | null;
  avatarKey?: string | null;
  tenantName?: string;
  tenantId?: string;
  tenantRole?: TenantRole;
  memberships?: { tenantId: string; tenantName: string; role?: TenantRole }[];
  unread?: number;
}) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [companyEl, setCompanyEl] = useState<null | HTMLElement>(null);

  const sections = useMemo(() => getNavSections(tenantRole), [tenantRole]);
  const items = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const allHrefs = useMemo(() => items.map((item) => item.href), [items]);
  const mobileItems = useMemo(() => getMobileNav(tenantRole), [tenantRole]);
  const sidebarWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;
  const roleLabel = tenantRole ? TENANT_ROLE_LABEL[tenantRole] : "";
  const displayName = name?.trim() || email || "Account";

  const drawerContent = (collapsed: boolean) => (
    <Box sx={{ pt: 1, px: collapsed ? 1 : 1.5, pb: 2 }}>
      <List disablePadding>
        {sections.map((section) => (
          <Box key={section.label} sx={{ mb: 1 }}>
            {section.items.map((item) => {
              const selected = isActive(pathname, item.href, allHrefs);
              const Icon = item.icon;
              const button = (
                <ListItemButton
                  selected={selected}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    justifyContent: collapsed ? "center" : "flex-start",
                    px: collapsed ? 1 : 1.5,
                    py: 1.1,
                    borderRadius: 2,
                    mb: 0.25,
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { bgcolor: "primary.dark" },
                      "& .MuiListItemIcon-root": { color: "primary.contrastText" },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 36,
                      color: selected ? "inherit" : "text.secondary",
                      justifyContent: "center",
                    }}
                  >
                    <Icon stroke={1.5} size={20} />
                  </ListItemIcon>
                  {!collapsed ? (
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: selected ? 600 : 500 }} noWrap>
                          {item.label}
                        </Typography>
                      }
                    />
                  ) : null}
                </ListItemButton>
              );
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
                  {collapsed ? (
                    <Tooltip title={item.label} placement="right">
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  )}
                </Link>
              );
            })}
          </Box>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        className="no-print"
        sx={{
          bgcolor: "background.paper",
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 64 },
            height: 64,
            px: { xs: 1.5, md: 2.5 },
            gap: { xs: 1, md: 1.5 },
          }}
        >
          <IconButton
            onClick={() => (isDesktop ? setDesktopOpen((v) => !v) : setMobileOpen((v) => !v))}
            aria-label={desktopOpen || mobileOpen ? "Collapse navigation" : "Open navigation"}
            sx={{
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              width: 40,
              height: 40,
            }}
          >
            {mobileOpen && !isDesktop ? <IconX size={18} stroke={1.5} /> : <IconMenu2 size={18} stroke={1.5} />}
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
            <Logo size={34} />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {tenantName ? (
            <>
              <Box
                component="button"
                type="button"
                onClick={(event) => setCompanyEl(event.currentTarget)}
                aria-label="Company menu"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  alignItems: "center",
                  gap: 1,
                  maxWidth: 260,
                  minHeight: 40,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.default",
                  color: "text.primary",
                  cursor: "pointer",
                  font: "inherit",
                  textAlign: "left",
                  transition: "border-color 150ms ease, background-color 150ms ease",
                  "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                    Company
                  </Typography>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                    {tenantName}
                  </Typography>
                </Box>
                <IconChevronDown size={16} stroke={1.5} />
              </Box>
              <Menu
                anchorEl={companyEl}
                open={Boolean(companyEl)}
                onClose={() => setCompanyEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 240, borderRadius: 2 } } }}
              >
                {memberships && memberships.length > 1 ? (
                  memberships.map((row) => (
                    <MenuItem
                      key={row.tenantId}
                      selected={row.tenantId === tenantId}
                      onClick={() => {
                        setCompanyEl(null);
                        if (row.tenantId === tenantId) return;
                        const fd = new FormData();
                        fd.set("tenantId", row.tenantId);
                        void switchTenantAction(fd);
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.tenantName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.role ? TENANT_ROLE_LABEL[row.role] : ""}
                          {row.tenantId === tenantId ? " · Current" : ""}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    <Typography variant="body2">{tenantName}</Typography>
                  </MenuItem>
                )}
                <Divider />
                <MenuItem
                  component={Link}
                  href="/settings?tab=companies"
                  onClick={() => setCompanyEl(null)}
                >
                  Manage companies
                </MenuItem>
              </Menu>
            </>
          ) : null}

          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: "center",
              pl: { sm: 0.5 },
              borderLeft: { sm: "1px solid" },
              borderColor: { sm: "divider" },
              ml: { sm: 0.5 },
            }}
          >
            <Tooltip title="Notifications">
              <IconButton
                component={Link}
                href="/notifications"
                aria-label="Notifications"
                sx={{
                  width: 40,
                  height: 40,
                  color: "text.secondary",
                  "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                }}
              >
                <Badge color="error" badgeContent={unread || 0} max={99} overlap="circular">
                  <IconBell stroke={1.5} size={20} />
                </Badge>
              </IconButton>
            </Tooltip>
            <ThemeToggle />
            <Tooltip title="Account">
              <IconButton
                onClick={(event) => setAnchorEl(event.currentTarget)}
                aria-label="Account menu"
                sx={{
                  width: 40,
                  height: 40,
                  p: 0.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "50%",
                }}
              >
                <UserAvatar avatarKey={avatarKey} email={email} name={name} size={32} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 260, borderRadius: 2, overflow: "hidden" } } }}
          >
            <Box sx={{ px: 2, py: 1.75, bgcolor: "background.default" }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <UserAvatar avatarKey={avatarKey} email={email} name={name} size={40} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                    {email}
                  </Typography>
                  {tenantName ? (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                      {tenantName}
                      {roleLabel ? ` · ${roleLabel}` : ""}
                    </Typography>
                  ) : null}
                </Box>
              </Stack>
            </Box>
            <Divider />
            <MenuItem component={Link} href="/settings?tab=profile" onClick={() => setAnchorEl(null)}>
              Profile
            </MenuItem>
            <MenuItem component={Link} href="/settings?tab=companies" onClick={() => setAnchorEl(null)}>
              Companies
            </MenuItem>
            {tenantRole === "ADMIN" ? (
              <MenuItem component={Link} href="/settings" onClick={() => setAnchorEl(null)}>
                Settings
              </MenuItem>
            ) : null}
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                void logoutAction();
              }}
            >
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        className="no-print"
        sx={{
          width: { md: sidebarWidth },
          flexShrink: { md: 0 },
          transition: "width 200ms ease",
          display: { xs: "none", md: "block" },
        }}
      >
        <Drawer
          variant="permanent"
          open
          sx={{
            "& .MuiDrawer-paper": {
              width: sidebarWidth,
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              mt: "64px",
              height: "calc(100% - 64px)",
              transition: "width 200ms ease",
              overflowX: "hidden",
            },
          }}
        >
          {drawerContent(!desktopOpen)}
        </Drawer>
      </Box>

      <Drawer
        variant="temporary"
        open={!isDesktop && mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="no-print"
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Logo />
        </Box>
        {drawerContent(false)}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarWidth}px)` },
          mt: "64px",
          mb: { xs: "64px", md: 0 },
          minHeight: { xs: "calc(100vh - 128px)", md: "calc(100vh - 64px)" },
          transition: "width 200ms ease",
        }}
      >
        <Box
          sx={{
            maxWidth: contentMaxWidth,
            mx: "auto",
            px: { xs: 2, md: 3 },
            py: { xs: 2.5, md: 3 },
            width: "100%",
          }}
        >
          {children}
        </Box>
      </Box>

      <Box
        className="no-print"
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <BottomNavigation
          showLabels
          value={mobileItems.findIndex((item) => isActive(pathname, item.href, allHrefs))}
          sx={{ height: 64 }}
        >
          {mobileItems.map((item) => {
            const Icon = item.icon;
            return (
              <BottomNavigationAction
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                icon={<Icon stroke={1.5} size={20} />}
              />
            );
          })}
        </BottomNavigation>
      </Box>
    </Box>
  );
}
