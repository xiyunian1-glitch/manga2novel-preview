'use client';

import { useCallback, useState } from 'react';
import { BookOpen, Check, Copy, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TaskState } from '@/lib/types';

interface NovelPreviewProps {
  taskState: TaskState;
  onExport: (format?: 'txt' | 'md') => void;
}

export function NovelPreview({ taskState, onExport }: NovelPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(taskState.fullNovel);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [taskState.fullNovel]);

  const visibleSections = taskState.novelSections.filter((section) => (
    section.status !== 'error' && Boolean(section.markdownBody?.trim())
  ));
  const pendingSections = taskState.novelSections.filter((section) => (
    section.status === 'pending' && Boolean(section.markdownBody?.trim())
  ));
  const hasFinalPolish = taskState.finalPolish.status === 'success' && Boolean(taskState.finalPolish.markdownBody?.trim());
  const previewHeightClass = 'h-[52vh] min-h-[320px] md:h-[58vh] xl:h-[calc(100vh-13.5rem)]';

  return (
    <Card
      className="flex h-full flex-col xl:sticky xl:top-[5.5rem] xl:max-h-[calc(100vh-6.5rem)]"
      data-panel="novel-preview"
      data-preview-mode={hasFinalPolish ? 'final-polish' : visibleSections.length > 0 ? 'sections' : 'empty'}
    >
      <CardHeader className="shrink-0 space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          小说预览
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {hasFinalPolish ? (
                <Badge variant="default">全书统稿版</Badge>
              ) : visibleSections.length > 0 ? (
                <Badge variant="secondary">章节实时预览</Badge>
              ) : (
                <Badge variant="outline">等待正文生成</Badge>
              )}
              {visibleSections.length > 0 ? (
                <Badge variant="outline">可预览 {visibleSections.length} 节</Badge>
              ) : null}
              {pendingSections.length > 0 ? (
                <Badge variant="outline">含待刷新章节</Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleCopy}
              disabled={!taskState.fullNovel}
              data-action="copy-novel-preview"
            >
              {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
              {copied ? '已复制' : '复制'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onExport('txt')}
              disabled={!taskState.fullNovel}
              data-action="export-novel-txt"
            >
              <Download className="mr-1 h-3 w-3" />
              下载 TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onExport('md')}
              disabled={!taskState.fullNovel}
              data-action="export-novel-md"
            >
              <Download className="mr-1 h-3 w-3" />
              下载 MD
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pt-0">
        {hasFinalPolish ? (
          <ScrollArea className={previewHeightClass}>
            <div className="space-y-4 pr-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  全书统稿版
                </span>
                <Separator className="flex-1" />
              </div>
              <div className="whitespace-pre-wrap text-sm leading-7">
                {taskState.finalPolish.markdownBody}
              </div>
            </div>
          </ScrollArea>
        ) : visibleSections.length > 0 ? (
          <ScrollArea className={previewHeightClass}>
            <div className="space-y-4 pr-4">
              {visibleSections.map((section) => (
                <div key={section.index}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      第 {section.index + 1} 节
                    </span>
                    <span className="truncate text-sm font-medium">{section.title}</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-7">
                    {section.markdownBody}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground xl:h-[calc(100vh-20rem)]">
            <div className="text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm">章节写作结果会在这里实时预览</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
