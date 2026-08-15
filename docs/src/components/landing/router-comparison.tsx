'use client'

import { useState, type ReactNode } from 'react'
import {
  FileCode2,
  Folder,
  FolderOpen,
  Layers,
  Sparkles,
  Server,
  Monitor,
  Code2,
} from 'lucide-react'
import { cn } from '@/lib/cn'

type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'MW' | 'LAYOUT' | 'PAGE'

interface MethodBadgeProps {
  method: HttpVerb
}

function MethodBadge({ method }: MethodBadgeProps) {
  const styles: Record<HttpVerb, string> = {
    GET: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    POST: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    PUT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    DELETE: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    MW: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    LAYOUT: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
    PAGE: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  }

  return (
    <span
      className={cn(
        'inline-flex w-14 items-center justify-center rounded px-1 py-0.5 text-center font-mono text-[10px] font-semibold tracking-wider uppercase border',
        styles[method],
      )}
    >
      {method}
    </span>
  )
}

interface TreeItemProps {
  name: string
  route?: string
  badge?: HttpVerb
  role?: string
  depth?: number
  isFolder?: boolean
  isOpen?: boolean
  onToggle?: () => void
  children?: ReactNode
}

function TreeItem({
  name,
  route,
  badge,
  role,
  depth = 0,
  isFolder = false,
  isOpen = true,
  onToggle,
  children,
}: TreeItemProps) {
  return (
    <div>
      <div
        onClick={isFolder ? onToggle : undefined}
        className={cn(
          'group flex items-center gap-2 sm:gap-3 px-3 py-1.5 text-xs transition-colors rounded-lg select-none',
          isFolder ? 'cursor-pointer hover:bg-fd-accent/60' : 'hover:bg-fd-accent/40',
        )}
      >
        {/* Column 1: File Structure with indentation */}
        <div
          className="flex flex-1 min-w-0 items-center gap-2 font-mono text-fd-foreground"
          style={{ paddingLeft: `${depth * 14}px` }}
        >
          {isFolder ? (
            isOpen ? (
              <FolderOpen className="size-3.5 shrink-0 text-amber-500 transition-transform group-hover:scale-110" />
            ) : (
              <Folder className="size-3.5 shrink-0 text-amber-500 transition-transform group-hover:scale-110" />
            )
          ) : (
            <FileCode2 className="size-3.5 shrink-0 text-fd-muted-foreground group-hover:text-fd-foreground transition-colors" />
          )}
          <span className={cn('truncate', isFolder ? 'font-semibold text-fd-foreground' : 'text-fd-foreground/90')}>
            {name}
          </span>
        </div>

        {/* Column 2: Fixed-width Badge slot */}
        <div className="w-14 shrink-0 flex items-center justify-center">
          {badge ? <MethodBadge method={badge} /> : null}
        </div>

        {/* Column 3: Fixed-width Route Path */}
        <div className="w-32 sm:w-36 shrink-0 flex items-center font-mono">
          {route ? (
            <code className="truncate rounded bg-fd-muted/60 px-1.5 py-0.5 text-[11px] text-fd-muted-foreground group-hover:text-fd-foreground transition-colors">
              {route}
            </code>
          ) : null}
        </div>

        {/* Column 4: Role Description */}
        <div className="hidden w-24 sm:w-28 shrink-0 text-right lg:block truncate text-[11px] text-fd-muted-foreground/80">
          {role ?? ''}
        </div>
      </div>

      {isFolder && isOpen && (
        <div className="relative ml-4 border-l border-fd-border/70 pl-0.5">
          {children}
        </div>
      )}
    </div>
  )
}

export function RouterComparison() {
  const [activeTab, setActiveTab] = useState<'tanstack' | 'taser'>('taser')
  // Synchronized folder state across both trees
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    posts: true,
    auth: true,
  })

  const toggleFolder = (folderKey: 'posts' | 'auth') => {
    setOpenFolders(prev => ({ ...prev, [folderKey]: !prev[folderKey] }))
  }

  return (
    <div className="space-y-6">
      {/* Mobile Tab Switcher */}
      <div className="flex items-center justify-center md:hidden">
        <div className="inline-flex rounded-xl border border-fd-border bg-fd-muted/30 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('tanstack')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'tanstack'
                ? 'bg-fd-background text-fd-foreground shadow-xs'
                : 'text-fd-muted-foreground hover:text-fd-foreground',
            )}
          >
            <Monitor className="size-3.5 text-purple-500" />
            TanStack Router
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('taser')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'taser'
                ? 'bg-fd-background text-fd-foreground shadow-xs'
                : 'text-fd-muted-foreground hover:text-fd-foreground',
            )}
          >
            <Server className="size-3.5 text-orange-500" />
            Taser REST Router
          </button>
        </div>
      </div>

      {/* Side by Side Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* TanStack Router Card */}
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-lg shadow-black/5 dark:shadow-black/30 transition-all',
            activeTab !== 'tanstack' ? 'hidden md:block' : 'block',
          )}
        >
          {/* Window Chrome Header */}
          <div className="flex items-center justify-between border-b border-fd-border bg-fd-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-green-500/80" />
              <span className="ml-2 font-mono text-xs font-semibold text-fd-foreground">
                TanStack Router
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400">
              <Monitor className="size-3" />
              Client UI Routing
            </span>
          </div>

          {/* Column Subheader */}
          <div className="flex items-center gap-2 sm:gap-3 border-b border-fd-border/60 bg-fd-muted/20 px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-fd-muted-foreground">
            <span className="flex-1 min-w-0">File Structure</span>
            <span className="w-14 shrink-0 text-center">Type</span>
            <span className="w-32 sm:w-36 shrink-0 text-left">Matched Route</span>
            <span className="hidden w-24 sm:w-28 shrink-0 text-right lg:block">Role</span>
          </div>

          {/* File Tree Rows */}
          <div className="space-y-0.5 p-2 sm:p-2.5 overflow-x-auto">
            <TreeItem
              name="_root.tsx"
              route="/*"
              badge="LAYOUT"
              role="Root Layout"
            />
            <TreeItem
              name="index.tsx"
              route="/"
              badge="PAGE"
              role="Home Page"
            />
            <TreeItem
              name="posts.tsx"
              route="/posts/*"
              badge="LAYOUT"
              role="Posts Layout"
            />

            <TreeItem
              name="posts"
              route="/posts"
              isFolder
              isOpen={openFolders.posts}
              onToggle={() => toggleFolder('posts')}
            >
              <TreeItem
                name="index.tsx"
                route="/posts"
                badge="PAGE"
                role="Posts Index"
                depth={1}
              />
              <TreeItem
                name="create.tsx"
                route="/posts/create"
                badge="PAGE"
                role="Create Post"
                depth={1}
              />
              <TreeItem
                name="$postId.tsx"
                route="/posts/$postId"
                badge="PAGE"
                role="Post Detail"
                depth={1}
              />
              <TreeItem
                name="_auth.tsx"
                route="/posts/*(_auth)"
                badge="LAYOUT"
                role="Auth Layout"
                depth={1}
              />

              <TreeItem
                name="_auth"
                route="/posts"
                isFolder
                depth={1}
                isOpen={openFolders.auth}
                onToggle={() => toggleFolder('auth')}
              >
                <TreeItem
                  name="$postId.edit.tsx"
                  route="/posts/$postId/edit"
                  badge="PAGE"
                  role="Edit Post"
                  depth={2}
                />
                <TreeItem
                  name="$postId.delete.tsx"
                  route="/posts/$postId/delete"
                  badge="PAGE"
                  role="Delete Post"
                  depth={2}
                />
              </TreeItem>
            </TreeItem>
          </div>
        </div>

        {/* Taser Card */}
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-fd-border bg-fd-card shadow-lg shadow-black/5 dark:shadow-black/30 ring-1 ring-orange-500/20 transition-all',
            activeTab !== 'taser' ? 'hidden md:block' : 'block',
          )}
        >
          {/* Window Chrome Header */}
          <div className="flex items-center justify-between border-b border-fd-border bg-fd-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-red-500/80" />
              <span className="size-3 rounded-full bg-yellow-500/80" />
              <span className="size-3 rounded-full bg-green-500/80" />
              <span className="ml-2 font-mono text-xs font-semibold text-fd-foreground">
                Taser Router
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 dark:text-orange-400">
              <Server className="size-3" />
              Backend REST API
            </span>
          </div>

          {/* Column Subheader */}
          <div className="flex items-center gap-2 sm:gap-3 border-b border-fd-border/60 bg-fd-muted/20 px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-fd-muted-foreground">
            <span className="flex-1 min-w-0">File Structure</span>
            <span className="w-14 shrink-0 text-center">Type</span>
            <span className="w-32 sm:w-36 shrink-0 text-left">Matched Endpoint</span>
            <span className="hidden w-24 sm:w-28 shrink-0 text-right lg:block">Role</span>
          </div>

          {/* File Tree Rows */}
          <div className="space-y-0.5 p-2 sm:p-2.5 overflow-x-auto">
            <TreeItem
              name="$.ts"
              route="/*"
              badge="MW"
              role="Root Middleware"
            />
            <TreeItem
              name="index.get.ts"
              route="/"
              badge="GET"
              role="Index Handler"
            />
            <TreeItem
              name="posts.ts"
              route="/posts/*"
              badge="MW"
              role="Posts Middleware"
            />

            <TreeItem
              name="posts"
              route="/posts"
              isFolder
              isOpen={openFolders.posts}
              onToggle={() => toggleFolder('posts')}
            >
              <TreeItem
                name="index.get.ts"
                route="/posts"
                badge="GET"
                role="List Posts"
                depth={1}
              />
              <TreeItem
                name="create.post.ts"
                route="/posts"
                badge="POST"
                role="Create Post"
                depth={1}
              />
              <TreeItem
                name="$postId.get.ts"
                route="/posts/$postId"
                badge="GET"
                role="Get Post"
                depth={1}
              />
              <TreeItem
                name="_auth.ts"
                route="/posts/*"
                badge="MW"
                role="Auth Middleware"
                depth={1}
              />

              <TreeItem
                name="_auth"
                route="/posts"
                isFolder
                depth={1}
                isOpen={openFolders.auth}
                onToggle={() => toggleFolder('auth')}
              >
                <TreeItem
                  name="$postId.put.ts"
                  route="/posts/$postId"
                  badge="PUT"
                  role="Update Post"
                  depth={2}
                />
                <TreeItem
                  name="$postId.delete.ts"
                  route="/posts/$postId"
                  badge="DELETE"
                  role="Delete Post"
                  depth={2}
                />
              </TreeItem>
            </TreeItem>
          </div>
        </div>
      </div>

      {/* Paradigm Translation Breakdown Callout */}
      <div className="relative overflow-hidden rounded-2xl border border-fd-border bg-linear-to-b from-fd-muted/30 to-fd-muted/10 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Sparkles className="size-4" />
              </div>
              <h4 className="text-base font-semibold tracking-tight text-fd-foreground">
                How the mental model translates to the backend
              </h4>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-fd-muted-foreground">
              In Taser Router, files are treated differently depending on their suffix:
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Verb files card */}
          <div className="rounded-xl border border-fd-border/70 bg-fd-card/60 p-4 transition-colors hover:border-orange-500/30">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-fd-foreground">
              <span className="flex size-5 items-center justify-center rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Code2 className="size-3.5" />
              </span>
              <span>HTTP Verb Files</span>
              <span className="font-normal text-fd-muted-foreground">(Handlers)</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
              Endpoints are segregated by method suffixes: <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">.get.ts</code>, <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">.post.ts</code>, <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">.put.ts</code>, <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">.delete.ts</code>, <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">.patch.ts</code>, and all standard HTTP verbs.
            </p>
          </div>

          {/* Middleware files card */}
          <div className="rounded-xl border border-fd-border/70 bg-fd-card/60 p-4 transition-colors hover:border-purple-500/30">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-fd-foreground">
              <span className="flex size-5 items-center justify-center rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Layers className="size-3.5" />
              </span>
              <span>Non-Verb Files</span>
              <span className="font-normal text-fd-muted-foreground">(Middleware)</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-fd-muted-foreground">
              Files without a verb (e.g. <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">$.ts</code>, <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">posts.ts</code>, <code className="rounded bg-fd-muted px-1 py-0.5 font-mono text-[11px] text-fd-foreground">_auth.ts</code>) act as scoped middleware. They run before child handlers and cascade typed context down the folder tree.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
