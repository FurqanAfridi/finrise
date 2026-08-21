"use client";

import { useActionState, useEffect } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { IconTrash } from "@tabler/icons-react";
import { removeContact } from "@/app/actions/ops";

export function ContactDeleteIcon({
  kind,
  contactId,
  hasHistory,
  canDeleteWithHistory,
}: {
  kind: "buyer" | "publisher";
  contactId: string;
  hasHistory: boolean;
  canDeleteWithHistory: boolean;
}) {
  const [state, action] = useActionState(removeContact, {} as { error?: string });
  const canDelete = !hasHistory || canDeleteWithHistory;
  const label = kind === "buyer" ? "buyer" : "publisher";

  useEffect(() => {
    if (state.error) window.alert(state.error);
  }, [state.error]);

  if (!canDelete) {
    return (
      <Tooltip title={`A company admin can delete ${label}s that have invoices.`}>
        <span>
          <IconButton
            size="small"
            disabled
            aria-label={`Delete ${label} unavailable`}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <IconTrash size={18} />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Box
      component="form"
      action={action}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        const message = hasHistory
          ? `This deletes the ${label} and their invoices and daily figures. This cannot be undone.`
          : `Remove this ${label}?`;
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="contactId" value={contactId} />
      <Tooltip title={`Delete ${label}`}>
        <IconButton
          type="submit"
          size="small"
          color="error"
          aria-label={`Delete ${label}`}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <IconTrash size={18} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
