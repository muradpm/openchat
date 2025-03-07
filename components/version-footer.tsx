"use client";

import { useState } from "react";

import { motion } from "framer-motion";

import { useWindowSize } from "usehooks-ts";

import { useBlock } from "@/hooks/use-block";

import { getDocumentTimestampByIndex } from "@/lib/utils";

import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type Document = Doc<"documents">;

interface VersionFooterProps {
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  documents: Array<Document> | undefined;
  currentVersionIndex: number;
}

export const VersionFooter = ({
  handleVersionChange,
  documents,
  currentVersionIndex,
}: VersionFooterProps) => {
  const { block } = useBlock();
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const [isMutating, setIsMutating] = useState(false);

  const deleteDocuments = useMutation(api.documents.deleteDocumentsByIdAfterTimestamp);

  if (!documents) return;

  return (
    <motion.div
      className="absolute flex flex-col gap-4 lg:flex-row bottom-0 bg-background p-4 w-full border-t z-50 justify-between"
      initial={{ y: isMobile ? 200 : 77 }}
      animate={{ y: 0 }}
      exit={{ y: isMobile ? 200 : 77 }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
    >
      <div>
        <div>You are viewing a previous version</div>
        <div className="text-muted-foreground text-sm">
          Restore this version to make edits
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <Button
          disabled={isMutating}
          onClick={async () => {
            setIsMutating(true);
            try {
              await deleteDocuments({
                documentId: block.documentId,
                timestamp: new Date(
                  getDocumentTimestampByIndex(documents, currentVersionIndex)
                ).getTime(),
              });
            } finally {
              setIsMutating(false);
            }
          }}
        >
          <div>Restore this version</div>
          {isMutating && (
            <div className="animate-spin">
              <Loader className="w-4 h-4" />
            </div>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            handleVersionChange("latest");
          }}
        >
          Back to latest version
        </Button>
      </div>
    </motion.div>
  );
};
