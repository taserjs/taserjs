"use client";

import { cva } from "class-variance-authority";
import { FileIcon, FolderIcon, FolderOpen } from "lucide-react";
import { type CSSProperties, type HTMLAttributes, type ReactNode, useState } from "react";
import { cn } from "../lib/cn";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

const itemVariants = cva(
  "flex flex-row items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-4",
);

export function Files({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div className={cn("not-prose rounded-md border bg-fd-card p-2", className)} {...props}>
      {props.children}
    </div>
  );
}

export interface FileProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  icon?: ReactNode;
  route?: string;
}

export interface FolderProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  route?: string;

  disabled?: boolean;

  /**
   * Open folder by default
   *
   * @defaultValue false
   */
  defaultOpen?: boolean;
}

export const DefaultFileIcon = <FileIcon />;
export function File({
  name,
  icon = DefaultFileIcon,
  route,
  className,
  ...rest
}: FileProps): React.ReactElement {
  return (
    <div className={cn(itemVariants({ className }), "justify-between", className)} {...rest}>
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="truncate">{name}</span>
      </div>
      {route ? (
        <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-fd-muted/60 text-fd-muted-foreground shrink-0 border border-fd-border/50">
          {route}
        </code>
      ) : null}
    </div>
  );
}

export function Folder({ name, route, defaultOpen = false, ...props }: FolderProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} {...props}>
      <CollapsibleTrigger className={cn(itemVariants({ className: "w-full justify-between" }))}>
        <div className="flex items-center gap-2 min-w-0">
          {open ? <FolderOpen className="text-amber-500" /> : <FolderIcon className="text-amber-500" />}
          <span className="truncate">{name}</span>
        </div>
        {route ? (
          <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-fd-muted/60 text-fd-muted-foreground shrink-0 border border-fd-border/50">
            {route}
          </code>
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ms-2 flex flex-col border-l ps-2">{props.children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface FilesTableProps extends HTMLAttributes<HTMLDivElement> {
  columns: number;
}

export function FilesTable({ className, columns, ...rest }: FilesTableProps): React.ReactElement {
  return (
    <div
      className={cn("not-prose rounded-md border bg-fd-card p-2", className)}
      style={{ "--files-columns": columns } as CSSProperties}
      {...rest}
    >
      {rest.children}
    </div>
  );
}

export function FileRow({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(itemVariants({ className }), "grid gap-2")}
      {...rest}
      style={{ gridTemplateColumns: `repeat(var(--files-columns), 1fr)` }}
    >
      {children}
    </div>
  );
}
