"use client";

import * as React from "react";

import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderPlusIcon,
  HardDriveIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { WorkspaceEntry, WorkspaceFile } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function fmtTime(ms: number, locale: string): string {
  const dateLocale = ({ zh: "zh-CN", pt: "pt-BR" } as Record<string, string>)[locale] ?? "en-US";
  return new Date(ms).toLocaleString(dateLocale, {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type EditState = {
  file: WorkspaceFile;
  content: string;
  dirty: boolean;
  saving: boolean;
};

export default function WorkspacePage() {
  const { locale } = useI18n();
  const [path, setPath] = React.useState("");
  const [entries, setEntries] = React.useState<WorkspaceEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [edit, setEdit] = React.useState<EditState | null>(null);
  const [mkdirOpen, setMkdirOpen] = React.useState(false);
  const [mkdirName, setMkdirName] = React.useState("");
  const uploadRef = React.useRef<HTMLInputElement>(null);

  const strings = React.useMemo(() => {
    if (locale === "pt") {
      return {
        workspaceRoot: "Espaço de Trabalho",
        readDirFailed: (msg: string) => `Falha ao ler diretório: ${msg}`,
        openFileFailed: (msg: string) => `Falha ao abrir arquivo: ${msg}`,
        savedSuccess: "Salvo com sucesso",
        saveFailed: (msg: string) => `Falha ao salvar: ${msg}`,
        confirmDelete: (isDir: boolean, name: string) =>
          `Confirmar exclusão ${isDir ? "do diretório" : "do arquivo"} "${name}"?${isDir ? " (incluindo todo o seu conteúdo)" : ""}`,
        deletedSuccess: "Excluído",
        deleteFailed: (msg: string) => `Falha na exclusão: ${msg}`,
        uploadedSuccess: (n: number) => `Enviado(s) ${n} arquivo(s)`,
        uploadFailed: (msg: string) => `Falha no envio: ${msg}`,
        createdDirSuccess: "Diretório criado",
        createDirFailed: (msg: string) => `Falha na criação: ${msg}`,
        newFolder: "Nova Pasta",
        upload: "Enviar",
        refresh: "Atualizar",
        nameCol: "Nome",
        sizeCol: "Tamanho",
        mtimeCol: "Data de Modificação",
        actionsCol: "Ações",
        loading: "Carregando…",
        emptyDir: "Diretório vazio",
        download: "Baixar",
        delete: "Excluir",
        downloadFailed: (msg: string) => `Falha no download: ${msg}`,
        fileTooLarge: "Arquivo muito grande, pré-visualização e edição online indisponíveis.",
        binaryFile: "Arquivo binário, pré-visualização e edição online indisponíveis.",
        downloadFile: "Baixar Arquivo",
        unsavedChanges: "Alterações não salvas",
        synced: "Sincronizado",
        save: "Salvar",
        saving: "Salvando…",
        newFolderTitle: "Nova Pasta",
        folderNamePlaceholder: "Nome da pasta",
        cancel: "Cancelar",
        create: "Criar",
      };
    }
    if (locale === "zh") {
      return {
        workspaceRoot: "工作空间",
        readDirFailed: (msg: string) => `读取目录失败：${msg}`,
        openFileFailed: (msg: string) => `打开文件失败：${msg}`,
        savedSuccess: "已保存",
        saveFailed: (msg: string) => `保存失败：${msg}`,
        confirmDelete: (isDir: boolean, name: string) =>
          `确认删除 ${isDir ? "目录" : "文件"} “${name}”？${isDir ? "（含其下所有内容）" : ""}`,
        deletedSuccess: "已删除",
        deleteFailed: (msg: string) => `删除失败：${msg}`,
        uploadedSuccess: (n: number) => `已上传 ${n} 个文件`,
        uploadFailed: (msg: string) => `上传失败：${msg}`,
        createdDirSuccess: "已创建目录",
        createDirFailed: (msg: string) => `创建失败：${msg}`,
        newFolder: "新建文件夹",
        upload: "上传",
        refresh: "刷新",
        nameCol: "名称",
        sizeCol: "大小",
        mtimeCol: "修改时间",
        actionsCol: "操作",
        loading: "加载中…",
        emptyDir: "空目录",
        download: "下载",
        delete: "删除",
        downloadFailed: (msg: string) => `下载失败：${msg}`,
        fileTooLarge: "文件过大，不支持在线预览/编辑。",
        binaryFile: "二进制文件，不支持在线预览/编辑。",
        downloadFile: "下载文件",
        unsavedChanges: "未保存的修改",
        synced: "已同步",
        save: "保存",
        saving: "保存中…",
        newFolderTitle: "新建文件夹",
        folderNamePlaceholder: "文件夹名称",
        cancel: "取消",
        create: "创建",
      };
    }
    return {
      workspaceRoot: "Workspace",
      readDirFailed: (msg: string) => `Failed to read directory: ${msg}`,
      openFileFailed: (msg: string) => `Failed to open file: ${msg}`,
      savedSuccess: "Saved successfully",
      saveFailed: (msg: string) => `Save failed: ${msg}`,
      confirmDelete: (isDir: boolean, name: string) =>
        `Confirm deletion of ${isDir ? "directory" : "file"} "${name}"?${isDir ? " (including all contents)" : ""}`,
      deletedSuccess: "Deleted",
      deleteFailed: (msg: string) => `Deletion failed: ${msg}`,
      uploadedSuccess: (n: number) => `Uploaded ${n} file(s)`,
      uploadFailed: (msg: string) => `Upload failed: ${msg}`,
      createdDirSuccess: "Directory created",
      createDirFailed: (msg: string) => `Creation failed: ${msg}`,
      newFolder: "New Folder",
      upload: "Upload",
      refresh: "Refresh",
      nameCol: "Name",
      sizeCol: "Size",
      mtimeCol: "Modified Time",
      actionsCol: "Actions",
      loading: "Loading…",
      emptyDir: "Empty directory",
      download: "Download",
      delete: "Delete",
      downloadFailed: (msg: string) => `Download failed: ${msg}`,
      fileTooLarge: "File too large, online preview and editing unavailable.",
      binaryFile: "Binary file, online preview and editing unavailable.",
      downloadFile: "Download File",
      unsavedChanges: "Unsaved changes",
      synced: "Synchronized",
      save: "Save",
      saving: "Saving…",
      newFolderTitle: "New Folder",
      folderNamePlaceholder: "Folder name",
      cancel: "Cancel",
      create: "Create",
    };
  }, [locale]);

  const load = React.useCallback(
    (p: string) => {
      setLoading(true);
      api
        .workspaceList(p)
        .then((r) => {
          setEntries(r.entries);
          setPath(r.path);
        })
        .catch((e) => toast.error(strings.readDirFailed((e as Error).message)))
        .finally(() => setLoading(false));
    },
    [strings],
  );

  React.useEffect(() => {
    load("");
  }, [load]);

  const crumbs = React.useMemo(() => {
    const parts = path ? path.split("/") : [];
    const acc: { name: string; path: string }[] = [{ name: strings.workspaceRoot, path: "" }];
    let cur = "";
    for (const part of parts) {
      cur = cur ? `${cur}/${part}` : part;
      acc.push({ name: part, path: cur });
    }
    return acc;
  }, [path, strings.workspaceRoot]);

  const openFile = (e: WorkspaceEntry) => {
    api
      .workspaceRead(e.path)
      .then((f) => setEdit({ file: f, content: f.content ?? "", dirty: false, saving: false }))
      .catch((err) => toast.error(strings.openFileFailed((err as Error).message)));
  };

  const saveFile = () => {
    if (!edit) return;
    setEdit({ ...edit, saving: true });
    api
      .workspaceWrite(edit.file.path, edit.content)
      .then(() => {
        toast.success(strings.savedSuccess);
        setEdit((cur) => (cur ? { ...cur, dirty: false, saving: false } : cur));
        load(path);
      })
      .catch((err) => {
        toast.error(strings.saveFailed((err as Error).message));
        setEdit((cur) => (cur ? { ...cur, saving: false } : cur));
      });
  };

  const del = (e: WorkspaceEntry) => {
    if (!window.confirm(strings.confirmDelete(Boolean(e.dir), e.name))) return;
    api
      .workspaceDelete(e.path)
      .then(() => {
        toast.success(strings.deletedSuccess);
        load(path);
      })
      .catch((err) => toast.error(strings.deleteFailed((err as Error).message)));
  };

  const doUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    api
      .workspaceUpload(path, Array.from(files))
      .then((r) => {
        toast.success(strings.uploadedSuccess(r.uploaded));
        load(path);
      })
      .catch((err) => toast.error(strings.uploadFailed((err as Error).message)))
      .finally(() => {
        if (uploadRef.current) uploadRef.current.value = "";
      });
  };

  const doMkdir = () => {
    const name = mkdirName.trim();
    if (!name) return;
    const target = path ? `${path}/${name}` : name;
    api
      .workspaceMkdir(target)
      .then(() => {
        toast.success(strings.createdDirSuccess);
        setMkdirOpen(false);
        setMkdirName("");
        load(path);
      })
      .catch((err) => toast.error(strings.createDirFailed((err as Error).message)));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header: Breadcrumbs + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 text-sm">
          <HardDriveIcon className="text-muted-foreground mr-1 size-4 shrink-0" />
          {crumbs.map((c, i) => (
            <React.Fragment key={c.path}>
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                type="button"
                onClick={() => load(c.path)}
                className={cn(
                  "max-w-[160px] truncate rounded px-1.5 py-0.5 hover:bg-accent",
                  i === crumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {c.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMkdirOpen(true)}>
            <FolderPlusIcon /> {strings.newFolder}
          </Button>
          <Button variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
            <UploadIcon /> {strings.upload}
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => load(path)} title={strings.refresh}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <input ref={uploadRef} type="file" multiple className="hidden" onChange={(e) => doUpload(e.target.files)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{strings.nameCol}</TableHead>
                <TableHead className="w-28 text-right">{strings.sizeCol}</TableHead>
                <TableHead className="w-40">{strings.mtimeCol}</TableHead>
                <TableHead className="w-24 text-right">{strings.actionsCol}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-10 text-center text-sm">
                    {loading ? strings.loading : strings.emptyDir}
                  </TableCell>
                </TableRow>
              )}
              {entries.map((e) => (
                <TableRow key={e.path}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => (e.dir ? load(e.path) : openFile(e))}
                      className="flex items-center gap-2 text-left hover:underline"
                    >
                      {e.dir ? (
                        <FolderIcon className="size-4 shrink-0 text-blue-500" />
                      ) : (
                        <FileIcon className="text-muted-foreground size-4 shrink-0" />
                      )}
                      <span className="truncate font-mono text-sm">{e.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right font-mono text-xs">
                    {e.dir ? "—" : fmtSize(e.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{fmtTime(e.mtime, locale)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!e.dir && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title={strings.download}
                          onClick={() =>
                            api
                              .workspaceDownload(e.path)
                              .catch((err) => toast.error(strings.downloadFailed((err as Error).message)))
                          }
                        >
                          <DownloadIcon className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive size-7"
                        title={strings.delete}
                        onClick={() => del(e)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* File preview / edit */}
      <Sheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          {edit && (
            <>
              <SheetHeader className="border-b p-4">
                <SheetTitle className="flex items-center gap-2 truncate font-mono text-sm">
                  <FileIcon className="size-4 shrink-0" />
                  <span className="truncate" title={edit.file.path}>
                    {edit.file.path}
                  </span>
                </SheetTitle>
                <span className="text-muted-foreground text-xs">{fmtSize(edit.file.size)}</span>
              </SheetHeader>

              {edit.file.binary || edit.file.too_large ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {edit.file.too_large ? strings.fileTooLarge : strings.binaryFile}
                  </p>
                  <Button variant="outline" onClick={() => api.workspaceDownload(edit.file.path)}>
                    <DownloadIcon /> {strings.downloadFile}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 p-3">
                    <Textarea
                      value={edit.content}
                      onChange={(ev) => setEdit({ ...edit, content: ev.target.value, dirty: true })}
                      spellCheck={false}
                      className="h-full min-h-[50vh] resize-none font-mono text-xs leading-relaxed"
                    />
                  </div>
                  <SheetFooter className="flex-row items-center justify-between border-t p-3">
                    <span className="text-muted-foreground text-xs">
                      {edit.dirty ? strings.unsavedChanges : strings.synced}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => api.workspaceDownload(edit.file.path)}>
                        <DownloadIcon /> {strings.download}
                      </Button>
                      <Button onClick={saveFile} disabled={!edit.dirty || edit.saving}>
                        <SaveIcon /> {edit.saving ? strings.saving : strings.save}
                      </Button>
                    </div>
                  </SheetFooter>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New folder dialog */}
      <Dialog open={mkdirOpen} onOpenChange={setMkdirOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{strings.newFolderTitle}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={mkdirName}
            onChange={(e) => setMkdirName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doMkdir()}
            placeholder={strings.folderNamePlaceholder}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMkdirOpen(false)}>
              {strings.cancel}
            </Button>
            <Button onClick={doMkdir} disabled={!mkdirName.trim()}>
              {strings.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
