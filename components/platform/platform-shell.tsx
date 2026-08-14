"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
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
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/berry/logo";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { PLATFORM_NAV } from "@/lib/platform-nav";
import { contentMaxWidth, drawerCollapsedWidth, drawerWidth } from "@/theme/berry";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformShell({
  children,
  email,
  name,
}: {
  children: React.ReactNode;
  email?: string | null;
  name?: string | null;
}) {
  const pathname = usePathname();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const mobileItems = useMemo(
    () => PLATFORM_NAV.filter((item) => item.mobilePrimary).slice(0, 4),
    [],
  );
  const sidebarWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;
  const displayName = name?.trim() || email || "Platform admin";

  const drawerContent = (collapsed: boolean) => (
    <Box sx={{ pt: 1, px: collapsed ? 1 : 1.5, pb: 2, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <List disablePadding>
        {PLATFORM_NAV.map((item) => {
          const selected = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{
                justifyContent: collapsed ? "center" : "flex-start",
                px: collapsed ? 1 : 1.5,
                mb: 0.5,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: "center" }}>
                <Icon size={20} stroke={1.75} />
              </ListItemIcon>
              {!collapsed ? <ListItemText primary={item.label} /> : null}
            </ListItemButton>
          );
        })}
      </List>
      {!collapsed ? (
        <Box sx={{ mt: "auto", pt: 2, px: 0.5 }}>
          <PoweredBy compact />
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: sidebarWidth,
              boxSizing: "border-box",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          <Toolbar sx={{ px: 2, gap: 1 }}>
            <Logo />
            {desktopOpen ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Platform
              </Typography>
            ) : null}
          </Toolbar>
          <Divider />
          {drawerContent(!desktopOpen)}
        </Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <Toolbar sx={{ justifyContent: "space-between", px: 2 }}>
            <Logo />
            <IconButton onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <IconX size={20} />
            </IconButton>
          </Toolbar>
          <Divider />
          {drawerContent(false)}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
        >
          <Toolbar sx={{ gap: 1 }}>
            <IconButton
              edge="start"
              onClick={() => (isDesktop ? setDesktopOpen((v) => !v) : setMobileOpen(true))}
              aria-label="Toggle navigation"
            >
              <IconMenu2 size={20} />
            </IconButton>
            <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
              FundLookup admin
            </Typography>
            <ThemeToggle />
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu">
              <UserAvatar name={displayName} email={email} size={32} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem disabled>
                <Stack>
                  <Typography variant="body2">{displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {email}
                  </Typography>
                </Stack>
              </MenuItem>
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
          component="main"
          sx={{
            px: { xs: 2, md: 3 },
            py: 3,
            pb: { xs: 10, md: 3 },
            maxWidth: contentMaxWidth,
            mx: "auto",
            width: 1,
          }}
        >
          {children}
        </Box>

        {!isDesktop ? (
          <BottomNavigation
            showLabels
            value={mobileItems.findIndex((item) => isActive(pathname, item.href))}
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              borderTop: 1,
              borderColor: "divider",
              zIndex: 10,
            }}
          >
            {mobileItems.map((item) => {
              const Icon = item.icon;
              return (
                <BottomNavigationAction
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  icon={<Icon size={20} stroke={1.75} />}
                />
              );
            })}
          </BottomNavigation>
        ) : null}
      </Box>
    </Box>
  );
}
