"use client";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

export function MainCard({
  title,
  secondary,
  children,
  content = true,
  sx,
  contentSX,
}: {
  title?: React.ReactNode;
  secondary?: React.ReactNode;
  children: React.ReactNode;
  content?: boolean;
  sx?: SxProps<Theme>;
  contentSX?: SxProps<Theme>;
}) {
  return (
    <Card sx={sx}>
      {title ? (
        <CardHeader
          title={typeof title === "string" ? <Typography variant="h3">{title}</Typography> : title}
          action={secondary}
        />
      ) : null}
      {title ? <Divider /> : null}
      {content ? <CardContent sx={contentSX}>{children}</CardContent> : children}
    </Card>
  );
}
