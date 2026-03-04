"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

interface FileUploadButtonProps {
  onFileSelect: (files: File[]) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/epub+zip",
  "application/x-mobipocket-ebook",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".epub", ".mobi", ".md", ".png", ".jpg", ".jpeg", ".gif", ".webp"];

export function FileUploadButton({ onFileSelect }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={handleClick}
      >
        <Paperclip className="size-4" />
      </Button>
    </>
  );
}
