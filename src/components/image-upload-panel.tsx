'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePlus, X, GripVertical, Trash2, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { ImageItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ImageUploadPanelProps {
  images: ImageItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClear: () => void;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSavedRatio(original: number, compressed: number): string {
  if (original <= 0 || compressed <= 0 || compressed >= original) {
    return '已保留原图质感';
  }

  return `约节省 ${Math.round(((original - compressed) / original) * 100)}% 体积`;
}

function getFilePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

function withRelativePath(file: File, relativePath: string): File {
  try {
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: relativePath,
    });
  } catch {
    // Ignore if the browser does not allow redefining the property.
  }
  return file;
}

function supportsDirectoryInput(input: HTMLInputElement | null): boolean {
  if (!input) {
    return false;
  }

  return 'webkitdirectory' in input || 'webkitEntries' in input || 'directory' in input;
}

export function ImageUploadPanel({
  images, onAdd, onRemove, onReorder, onClear, disabled,
}: ImageUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);

  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  const sortFiles = useCallback((files: File[]) => {
    return [...files].sort((a, b) => {
      const pathA = getFilePath(a);
      const pathB = getFilePath(b);
      return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const files = sortFiles(Array.from(fileList).filter((f) => f.type.startsWith('image/')));
      if (files.length > 0) onAdd(files);
    },
    [onAdd, sortFiles]
  );

  const openFilePicker = useCallback(() => {
    const input = fileInputRef.current;
    if (!input || disabled) return;
    input.value = '';
    input.click();
  }, [disabled]);

  const collectDirectoryFiles = useCallback(async (directoryHandle: FileSystemDirectoryHandle, parentPath = ''): Promise<File[]> => {
    const files: File[] = [];
    const entries = (directoryHandle as FileSystemDirectoryHandle & {
      values: () => AsyncIterable<
        FileSystemDirectoryHandle | (FileSystemFileHandle & { kind: 'file'; name: string })
      >;
    }).values();

    for await (const entry of entries) {
      const relativePath = `${parentPath}${entry.name}`;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        if (file.type.startsWith('image/')) {
          files.push(withRelativePath(file, relativePath));
        }
        continue;
      }

      files.push(...await collectDirectoryFiles(entry, `${relativePath}/`));
    }

    return files;
  }, []);

  const openFolderPicker = useCallback(async () => {
    if (disabled) return;

    const canUseDirectoryPicker = typeof window !== 'undefined'
      && typeof (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker === 'function';

    if (canUseDirectoryPicker) {
      try {
        const directoryHandle = await (window as unknown as {
          showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
        }).showDirectoryPicker();
        const files = sortFiles(await collectDirectoryFiles(directoryHandle));
        if (files.length === 0) {
          toast.warning('所选文件夹中没有可用图片');
          return;
        }
        onAdd(files);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        toast.error(error instanceof Error ? error.message : '读取文件夹失败');
      }
      return;
    }

    const input = folderInputRef.current;
    if (input && supportsDirectoryInput(input)) {
      input.value = '';
      input.click();
      return;
    }

    toast.info('当前浏览器不支持直接选择文件夹，已切换为多图上传。手机端建议优先尝试较新的 Chrome、Edge 或 Firefox。');
    openFilePicker();
  }, [collectDirectoryFiles, disabled, onAdd, openFilePicker, sortFiles]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  // 排序拖拽
  const handleItemDragStart = (index: number) => setDragIndex(index);
  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      onReorder(dragIndex, index);
      setDragIndex(index);
    }
  };
  const handleItemDragEnd = () => setDragIndex(null);
  const previewImage = previewImageId ? images.find((image) => image.id === previewImageId) || null : null;
  const readyCount = useMemo(() => images.filter((image) => image.status === 'ready').length, [images]);
  const processingCount = useMemo(() => images.filter((image) => image.status === 'processing').length, [images]);
  const totalOriginalSize = useMemo(() => images.reduce((sum, image) => sum + image.originalSize, 0), [images]);
  const totalCompressedSize = useMemo(() => {
    return images.reduce((sum, image) => sum + (image.compressedSize || image.originalSize), 0);
  }, [images]);
  const leadImage = images[0] || null;
  const lastImage = images[images.length - 1] || null;

  return (
    <Card className="border-border/75 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(248,242,233,0.82))] dark:bg-[linear-gradient(180deg,rgba(24,22,19,0.96),rgba(19,18,16,0.92))]">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="editorial-kicker">Material Desk</div>
            <CardTitle className="flex items-center gap-2 font-serif text-lg">
              <ImagePlus className="h-4 w-4" />
              漫画图片
            </CardTitle>
            <CardDescription className="max-w-2xl text-[13px] leading-6 text-muted-foreground/90">
              把整话画稿按阅读顺序整理进素材台。这里既是上传入口，也是后续逐页分析与章节拆分的原始页序基线。
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">已载入 {images.length} 张</Badge>
            {images.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={disabled}
                className="h-8 px-2.5"
                data-action="clear-images"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                清空
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div
            className={cn(
              'rounded-[1.35rem] border-2 border-dashed p-6 transition-all cursor-pointer',
              isDragOver
                ? 'border-primary bg-primary/7 shadow-[0_18px_40px_rgba(37,71,184,0.12)]'
                : 'border-border/80 bg-background/55 hover:border-primary/40 hover:bg-background/72',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={(event) => {
              if (disabled) return;
              const target = event.target as HTMLElement;
              if (target.closest('[data-picker-control="true"]')) return;
              openFilePicker();
            }}
          >
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.1rem] border border-border/70 bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <ImagePlus className="h-6 w-6 text-primary" />
              </div>
              <div className="font-serif text-[1.22rem] font-semibold text-foreground">
                把整话画稿拖进素材台，建立这次书稿的页序。
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                支持 JPG / PNG / WebP。你可以一次性拖入多张图片，也可以直接选择整个文件夹；后续排序会决定逐页分析和章节生成的基准顺序。
              </p>
              <div
                className="mt-4 flex flex-wrap items-center justify-center gap-2"
                data-picker-control="true"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  type="button"
                  size="sm"
                  disabled={disabled}
                  onClick={openFilePicker}
                  data-action="upload-images"
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  上传图片
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    void openFolderPicker();
                  }}
                  data-action="upload-folder"
                >
                  <FolderOpen className="mr-1 h-3.5 w-3.5" />
                  上传文件夹
                </Button>
              </div>
              <div className="mt-5 grid gap-2.5 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/68 px-3 py-3">
                  <div className="text-[11px] tracking-[0.12em] text-muted-foreground">页序规则</div>
                  <div className="mt-1 text-sm leading-6 text-foreground/90">按文件名自然排序，可拖拽微调顺序。</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/68 px-3 py-3">
                  <div className="text-[11px] tracking-[0.12em] text-muted-foreground">移动端兼容</div>
                  <div className="mt-1 text-sm leading-6 text-foreground/90">手机能否直选文件夹取决于浏览器，上传单图同样可用。</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/68 px-3 py-3">
                  <div className="text-[11px] tracking-[0.12em] text-muted-foreground">后续用途</div>
                  <div className="mt-1 text-sm leading-6 text-foreground/90">这些页会进入逐页分析、整书综合和章节拆分。</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/75 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="text-[11px] tracking-[0.12em] text-muted-foreground">MATERIAL OVERVIEW</div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
              <div className="story-stat py-3">
                <div className="story-stat-label">总页数</div>
                <div className="story-stat-value text-[1.35rem]">{images.length || '0'}</div>
              </div>
              <div className="story-stat py-3">
                <div className="story-stat-label">已就绪页</div>
                <div className="story-stat-value text-[1.35rem]">{readyCount}</div>
              </div>
              <div className="story-stat py-3">
                <div className="story-stat-label">处理中</div>
                <div className="story-stat-value text-[1.35rem]">{processingCount}</div>
              </div>
              <div className="story-stat py-3">
                <div className="story-stat-label">素材体积</div>
                <div className="story-stat-value text-[1.1rem]">{images.length > 0 ? formatSize(totalOriginalSize) : '--'}</div>
                <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {images.length > 0 ? formatSavedRatio(totalOriginalSize, totalCompressedSize) : '上传后会在这里显示体积信息'}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.1rem] border border-border/70 bg-muted/30 px-4 py-3">
              <div className="text-[11px] tracking-[0.12em] text-muted-foreground">页序锚点</div>
              {leadImage ? (
                <div className="mt-2 space-y-2 text-sm leading-6 text-foreground/90">
                  <div>起始页：{getFilePath(leadImage.file)}</div>
                  <div>末尾页：{lastImage ? getFilePath(lastImage.file) : getFilePath(leadImage.file)}</div>
                </div>
              ) : (
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  还没有素材。建议整话一次性上传，这样后续章节节奏会更稳定。
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={disabled}
            data-input="image-upload"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={disabled}
            data-input="folder-upload"
          />
        </div>

        {images.length > 0 && (
          <>
            <div className="rounded-[1.2rem] border border-border/75 bg-background/58 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] tracking-[0.12em] text-muted-foreground">PAGE STRIP</div>
                  <div className="mt-1 text-sm text-foreground/90">点击缩略图查看大图，拖拽下方列表可微调阅读顺序。</div>
                </div>
                <Badge variant="outline">首尾顺序已锁定在当前列表</Badge>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, index) => (
                  <button
                    key={`strip-${img.id}`}
                    type="button"
                    className="group min-w-[84px] rounded-[1rem] border border-border/70 bg-background/75 p-2 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_10px_24px_rgba(37,71,184,0.08)]"
                    onClick={() => setPreviewImageId(img.id)}
                  >
                    <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/20">
                      <Image
                        src={img.previewUrl}
                        alt={`第${index + 1}页`}
                        width={160}
                        height={224}
                        unoptimized
                        className="h-20 w-full object-cover transition group-hover:scale-[1.02]"
                        draggable={false}
                      />
                    </div>
                    <div className="mt-2 text-[11px] tracking-[0.12em] text-muted-foreground">#{index + 1}</div>
                    <div className="truncate text-xs text-foreground/88" title={getFilePath(img.file)}>{getFilePath(img.file)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto overscroll-contain pr-2">
              <div className="space-y-2">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  className={cn(
                    'group rounded-[1.15rem] border border-border/75 bg-background/68 p-3 transition hover:border-primary/25 hover:bg-background/88',
                    dragIndex === index && 'border-primary/35 bg-primary/6'
                  )}
                  draggable={!disabled}
                  onDragStart={() => handleItemDragStart(index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDragEnd={handleItemDragEnd}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 sm:min-w-[15rem]">
                      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5 cursor-grab" />
                        第 {index + 1} 页
                      </div>
                      <button
                        type="button"
                        className="shrink-0 overflow-hidden rounded-[0.9rem] border border-border/70 transition hover:border-primary hover:ring-2 hover:ring-primary/15"
                        onClick={() => setPreviewImageId(img.id)}
                        title="点击查看大图"
                        draggable={false}
                      >
                        <Image
                          src={img.previewUrl}
                          alt={`第${index + 1}页`}
                          width={96}
                          height={128}
                          unoptimized
                          className="h-16 w-12 object-cover"
                          draggable={false}
                        />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" title={getFilePath(img.file)}>
                        {getFilePath(img.file)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>原图 {formatSize(img.originalSize)}</span>
                        {img.compressedSize && img.compressedSize !== img.originalSize ? (
                          <span className="text-emerald-700">处理后 {formatSize(img.compressedSize)}</span>
                        ) : null}
                        {img.status === 'ready' && img.compressedSize === img.originalSize ? (
                          <span className="text-sky-700">原图直传</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={
                          img.status === 'ready' ? 'default' :
                          img.status === 'error' ? 'destructive' :
                          img.status === 'processing' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {img.status === 'ready' ? '就绪' :
                         img.status === 'error' ? '错误' :
                         img.status === 'processing' ? '处理中' : '等待'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
                        onClick={() => onRemove(img.id)}
                        disabled={disabled}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImageId(null)}>
        <DialogContent className="w-[min(96vw,72rem)] sm:max-w-5xl">
          {previewImage ? (
            <>
              <DialogHeader>
                <DialogTitle>{getFilePath(previewImage.file)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  原图大小 {formatSize(previewImage.originalSize)}
                  {previewImage.compressedSize && previewImage.compressedSize !== previewImage.originalSize
                    ? ` · 处理后 ${formatSize(previewImage.compressedSize)}`
                    : ''}
                </div>
                <div className="overflow-hidden rounded-lg border bg-muted/20">
                  <Image
                    src={previewImage.previewUrl}
                    alt={getFilePath(previewImage.file)}
                    width={1600}
                    height={2200}
                    unoptimized
                    className="max-h-[75vh] w-full object-contain"
                  />
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
