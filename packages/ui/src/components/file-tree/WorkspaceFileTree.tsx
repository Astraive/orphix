import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef } from "react";
import { type FileTreeIcons, type FileTreeRowDecorationRenderer, type FileTreeSearchMode, type GitStatusEntry, type TreeThemeInput, themeToTreeStyles } from "@pierre/trees";
import { FileTree as ReactFileTree, useFileTree, useFileTreeSearch, useFileTreeSelection, useFileTreeSelector } from "@pierre/trees/react";
import { ChevronDown, ChevronUp, Copy, FilePlus2, FolderPlus, FolderSearch, Grip, Lock, Pencil, RefreshCw, Scissors, Search, Trash2, Unlock, X } from "lucide-react";
import { buildPreparedTreeData, isAncestorPath, joinAbsolutePath, renameAbsolutePath, toRelativeTreePath, type FileTreeEntry } from "./utils";

export interface WorkspaceFileTreeProps {
  createFileName?: string;
  createFolderName?: string;
  density?: "compact" | "default" | "relaxed" | number;
  emptyMessage?: string;
  extraToolbarActions?: ReactNode;
  fileTreeSearchMode?: FileTreeSearchMode;
  fontFamily?: string;
  gitStatus?: readonly GitStatusEntry[];
  icons?: FileTreeIcons;
  initialVisibleRowCount?: number;
  isLocked?: boolean;
  loadingMessage?: string;
  onCopy?: (path: string) => void;
  onCreateFile?: (path: string) => Promise<void> | void;
  onCreateFolder?: (path: string) => Promise<void> | void;
  onCut?: (path: string) => void;
  onDelete?: (path: string) => Promise<void> | void;
  onMove?: (moves: { from: string; to: string }[]) => Promise<void> | void;
  onOpenFile?: (path: string) => void;
  onPaste?: (path: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onRename?: (oldPath: string, newPath: string) => Promise<void> | void;
  onSelectionChange?: (paths: string[]) => void;
  onToggleLocked?: () => void;
  overscan?: number;
  renderRowDecoration?: FileTreeRowDecorationRenderer;
  renderAdditionalContextActions?: (args: { close: () => void; isDir: boolean; path: string }) => ReactNode;
  rootPath: string | null;
  searchPlaceholder?: string;
  showSearch?: boolean;
  theme?: TreeThemeInput;
  title?: string;
  treeEntries: FileTreeEntry[];
  unsafeCSS?: string;
}

function ToolbarIconButton({
  active,
  disabled,
  icon: Icon,
  onClick,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: typeof RefreshCw;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      } disabled:pointer-events-none disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function WorkspaceFileTree({
  createFileName = "new-file.txt",
  createFolderName = "new-folder",
  density = "compact",
  emptyMessage = "Empty directory",
  extraToolbarActions,
  fileTreeSearchMode = "hide-non-matches",
  fontFamily,
  gitStatus,
  icons = { set: "complete", colored: false },
  initialVisibleRowCount = 14,
  isLocked = false,
  loadingMessage = "Loading...",
  onCopy,
  onCreateFile,
  onCreateFolder,
  onCut,
  onDelete,
  onMove,
  onOpenFile,
  onPaste,
  onRefresh,
  onRename,
  onSelectionChange,
  onToggleLocked,
  overscan = 8,
  renderRowDecoration,
  renderAdditionalContextActions,
  rootPath,
  searchPlaceholder = "Search files",
  showSearch = true,
  theme,
  title = "Explorer",
  treeEntries,
  unsafeCSS,
}: WorkspaceFileTreeProps) {
  const callbacksRef = useRef({
    onMove,
    onOpenFile,
    onRename,
    onSelectionChange,
  });
  callbacksRef.current = { onMove, onOpenFile, onRename, onSelectionChange };

  const treeData = useMemo(() => {
    if (!rootPath) {
      return buildPreparedTreeData("/", []);
    }
    return buildPreparedTreeData(rootPath, treeEntries);
  }, [rootPath, treeEntries]);
  const treeDataRef = useRef(treeData);
  treeDataRef.current = treeData;

  const { model } = useFileTree({
    density,
    dragAndDrop: onMove && rootPath ? {
      canDrop: ({ draggedPaths, target }) => {
        const absoluteTarget = target.directoryPath ? treeDataRef.current.absoluteByRelative.get(target.directoryPath)?.path : rootPath;
        if (!absoluteTarget) return false;
        return draggedPaths.every((path) => {
          const sourceEntry = treeDataRef.current.absoluteByRelative.get(path);
          if (!sourceEntry) return false;
          if (sourceEntry.path === absoluteTarget) return false;
          return !isAncestorPath(sourceEntry.path, absoluteTarget);
        });
      },
      canDrag: (paths) => paths.length > 0,
      onDropComplete: ({ draggedPaths, target }) => {
        const absoluteTarget = target.directoryPath ? treeDataRef.current.absoluteByRelative.get(target.directoryPath)?.path : rootPath;
        if (!absoluteTarget || !callbacksRef.current.onMove) return;

        const moves = draggedPaths
          .map((path) => treeDataRef.current.absoluteByRelative.get(path))
          .filter((entry): entry is FileTreeEntry => Boolean(entry))
          .map((entry) => ({
            from: entry.path,
            to: joinAbsolutePath(absoluteTarget, entry.name),
          }))
          .filter((move) => move.from !== move.to);

        if (moves.length === 0) return;
        void runAction(async () => {
          await callbacksRef.current.onMove?.(moves);
        });
      },
      onDropError: (error) => {
        console.warn("File tree drag/drop failed:", error);
      },
    } : false,
    fileTreeSearchMode,
    gitStatus,
    preparedInput: treeData.preparedInput,
    icons,
    initialVisibleRowCount,
    overscan,
    renderRowDecoration,
    search: showSearch,
    searchFakeFocus: true,
    unsafeCSS,
    renaming: onRename ? {
      onRename: ({ destinationPath, sourcePath }) => {
        const sourceEntry = treeDataRef.current.absoluteByRelative.get(sourcePath);
        if (!sourceEntry || !callbacksRef.current.onRename) return;
        const destinationAbsolute = renameAbsolutePath(sourceEntry.path, destinationPath.split("/").pop() ?? destinationPath);
        void callbacksRef.current.onRename(sourceEntry.path, destinationAbsolute);
      },
    } : false,
    onSelectionChange: (selectedPaths) => {
      const absolutePaths = selectedPaths
        .map((path) => treeDataRef.current.absoluteByRelative.get(path)?.path)
        .filter((path): path is string => Boolean(path));
      callbacksRef.current.onSelectionChange?.(absolutePaths);

      const latest = selectedPaths[selectedPaths.length - 1];
      const entry = latest ? treeDataRef.current.absoluteByRelative.get(latest) : undefined;
      if (entry && !entry.isDir) callbacksRef.current.onOpenFile?.(entry.path);
    },
  });

  const search = useFileTreeSearch(model);
  const selectedPaths = useFileTreeSelection(model);
  const focusedPath = useFileTreeSelector(model, (m) => m.getFocusedPath());

  useEffect(() => {
    if (treeData.relativePaths.length > 0) {
      model.resetPaths(treeData.relativePaths, { preparedInput: treeData.preparedInput });
    }
  }, [model, treeData]);

  useEffect(() => {
    model.setGitStatus(gitStatus);
  }, [gitStatus, model]);

  useEffect(() => {
    model.setIcons(icons);
  }, [icons, model]);

  const themedHostStyle = useMemo(() => {
    const baseStyles = theme ? themeToTreeStyles(theme) : {};
    return {
      ...baseStyles,
      height: "100%",
      width: "100%",
      "--trees-font-family-override": fontFamily || "var(--orphix-font-code, var(--orphix-font-mono, ui-monospace, monospace))",
      "--trees-item-height": "20px",
      "--trees-font-size-override": "11px",
      "--trees-item-padding-x-override": "6px",
    } as CSSProperties;
  }, [theme, fontFamily]);

  const runAction = async (action: () => Promise<void> | void) => {
    try {
      await action();
      await onRefresh?.();
    } catch {
      // action handler should surface errors
    }
  };

  const createAndRename = async (basePath: string, kind: "file" | "folder") => {
    const nextName = kind === "folder" ? createFolderName : createFileName;
    const creator = kind === "folder" ? onCreateFolder : onCreateFile;
    if (!creator) return;
    const absolutePath = joinAbsolutePath(basePath, nextName);
    await runAction(async () => {
      await creator(absolutePath);
    });
    const relativePath = rootPath ? toRelativeTreePath(rootPath, absolutePath) : absolutePath;
    model.startRenaming(relativePath, { removeIfCanceled: false });
  };

  const renderEmptyState = rootPath && treeEntries.length === 0;
  const absoluteSelectedPaths = selectedPaths
    .map((path) => treeData.absoluteByRelative.get(path)?.path)
    .filter((path): path is string => Boolean(path));
  const absoluteFocusedPath = focusedPath ? treeData.absoluteByRelative.get(focusedPath)?.path ?? null : null;
  const focusedLabel = absoluteFocusedPath?.split(/[\\/]/).pop() ?? absoluteFocusedPath;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{title}</span>
        <div className="flex items-center gap-1">
          {showSearch && (
            <ToolbarIconButton
              active={search.isOpen}
              icon={Search}
              onClick={() => {
                if (search.isOpen) search.close();
                else search.open();
              }}
              title={search.isOpen ? "Close search" : "Search"}
            />
          )}
          {onToggleLocked && (
            <ToolbarIconButton
              active={isLocked}
              icon={isLocked ? Lock : Unlock}
              onClick={onToggleLocked}
              title={isLocked ? "Unlock path following" : "Lock current path"}
            />
          )}
          {onCreateFile && (
            <ToolbarIconButton disabled={!rootPath} icon={FilePlus2} onClick={() => rootPath && void createAndRename(rootPath, "file")} title="New file" />
          )}
          {onCreateFolder && (
            <ToolbarIconButton disabled={!rootPath} icon={FolderPlus} onClick={() => rootPath && void createAndRename(rootPath, "folder")} title="New folder" />
          )}
          {onRefresh && (
            <ToolbarIconButton icon={RefreshCw} onClick={() => void runAction(async () => { await onRefresh(); })} title="Refresh" />
          )}
          {extraToolbarActions}
        </div>
      </div>

      {rootPath && (
        <div className="truncate border-b border-border/40 px-3 py-1 text-[10px] font-mono text-muted-foreground">
          {rootPath}
        </div>
      )}

      {showSearch && search.isOpen && (
        <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background/80 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              onChange={(event) => search.setValue(event.target.value)}
              placeholder={searchPlaceholder}
              value={search.value}
            />
            <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
              {search.matchingPaths.length}
            </span>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => search.focusPreviousMatch()} title="Previous match" type="button">
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => search.focusNextMatch()} title="Next match" type="button">
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => search.close()} title="Close search" type="button">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {!rootPath ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">{loadingMessage}</div>
        ) : renderEmptyState ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyMessage}</div>
        ) : (
          <ReactFileTree
            className="h-full min-h-0 w-full overflow-hidden border-0 bg-transparent"
            model={model}
            renderContextMenu={onCopy || onCut || onPaste || onDelete || onRename || onCreateFile || onCreateFolder || renderAdditionalContextActions ? (item, context) => {
              const absolutePath = treeData.absoluteByRelative.get(item.path)?.path;
              if (!absolutePath) return null;

              return (
                <div className="min-w-48 rounded-lg border border-border bg-popover p-1.5 shadow-xl">
                  {item.kind === "directory" && onCreateFile && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { context.close({ restoreFocus: false }); void createAndRename(absolutePath, "file"); }} type="button">
                      <FilePlus2 className="h-4 w-4" /> New File
                    </button>
                  )}
                  {item.kind === "directory" && onCreateFolder && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { context.close({ restoreFocus: false }); void createAndRename(absolutePath, "folder"); }} type="button">
                      <FolderPlus className="h-4 w-4" /> New Folder
                    </button>
                  )}
                  {onRename && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { context.close({ restoreFocus: false }); model.startRenaming(item.path); }} type="button">
                      <Pencil className="h-4 w-4" /> Rename
                    </button>
                  )}
                  {onCopy && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { context.close(); onCopy(absolutePath); }} type="button">
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                  )}
                  {onCut && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { context.close(); onCut(absolutePath); }} type="button">
                      <Scissors className="h-4 w-4" /> Cut
                    </button>
                  )}
                  {onPaste && item.kind === "directory" && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent" onClick={() => { context.close(); void runAction(async () => { await onPaste(absolutePath); }); }} type="button">
                      <FolderSearch className="h-4 w-4" /> Paste
                    </button>
                  )}
                  {onMove && (
                    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                      <Grip className="h-4 w-4" /> Drag to move
                    </div>
                  )}
                  {onDelete && (
                    <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10" onClick={() => { context.close(); void runAction(async () => { await onDelete(absolutePath); }); }} type="button">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                  {renderAdditionalContextActions?.({
                    close: () => context.close(),
                    isDir: item.kind === "directory",
                    path: absolutePath,
                  })}
                </div>
              );
            } : undefined}
            style={themedHostStyle}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/40 px-3 py-1 text-[10px] font-mono text-muted-foreground">
        <span>{absoluteSelectedPaths.length} sel</span>
        <span className="truncate">{focusedLabel ?? "-"}</span>
      </div>
    </div>
  );
}
