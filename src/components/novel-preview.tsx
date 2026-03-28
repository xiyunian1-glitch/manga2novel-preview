'use client';

import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronUp, Copy, Download, Expand } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TaskState } from '@/lib/types';

interface NovelPreviewProps {
  taskState: TaskState;
  onExport: (format?: 'txt' | 'md') => void;
}

export function NovelPreview({ taskState, onExport }: NovelPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

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
  const previewHeightClass = 'h-[54vh] min-h-[360px] md:h-[60vh] xl:h-[calc(100vh-17.25rem)]';
  const fullscreenHeightClass = 'h-[72vh] min-h-[420px]';
  const previewSummary = useMemo(() => {
    if (hasFinalPolish && taskState.finalPolish.markdownBody?.trim()) {
      return '已生成全书润色版，点击展开即可阅读全文。';
    }

    if (visibleSections.length > 0) {
      const lastSection = visibleSections[visibleSections.length - 1];
      const excerpt = String(lastSection?.markdownBody || '')
        .trim()
        .replace(/\n{2,}/g, '\n')
        .slice(0, 140);
      return excerpt ? `${excerpt}${excerpt.length >= 140 ? '...' : ''}` : '已生成章节内容，点击展开即可继续阅读。';
    }

    return '章节写作结果会在这里实时预览。';
  }, [hasFinalPolish, taskState.finalPolish.markdownBody, visibleSections]);
  const previewLead = useMemo(() => {
    if (hasFinalPolish && taskState.finalPolish.markdownBody?.trim()) {
      return '终稿已经整理成统一文风的书稿排版，可以直接通读、复制或导出。';
    }

    if (visibleSections.length > 0) {
      const latestSection = visibleSections[visibleSections.length - 1];
      return latestSection?.title
        ? `当前已写到「${latestSection.title}」，右侧会持续滚动显示最新章节。`
        : '章节正文会随着流程推进在这里累积成稿。';
    }

    return '这里会像编辑校样一样实时堆叠章节，方便边跑边读边检查。';
  }, [hasFinalPolish, taskState.finalPolish.markdownBody, visibleSections]);

  const renderManuscript = (content: string) => (
    <div className="preview-prose whitespace-pre-wrap text-[15px] text-foreground/92 leading-[2.05]">
      {content}
    </div>
  );

  const renderPreviewBody = (heightClass: string) => {
    if (hasFinalPolish) {
      return (
        <ScrollArea className={heightClass}>
            <div className="space-y-4 pr-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  全书润色版
                </span>
                <Separator className="flex-1" />
              </div>
              {renderManuscript(taskState.finalPolish.markdownBody || '')}
            </div>
          </ScrollArea>
        );
    }

    if (visibleSections.length > 0) {
      return (
        <ScrollArea className={heightClass}>
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
                {renderManuscript(section.markdownBody || '')}
              </div>
            ))}
          </div>
        </ScrollArea>
      );
    }

    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground">
        <div className="text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm">章节写作结果会在这里实时预览</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card
        className="flex flex-col overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(249,242,232,0.9))] shadow-[0_24px_70px_rgba(44,33,24,0.12)] xl:sticky xl:top-[6.8rem] xl:max-h-[calc(100vh-7.8rem)] dark:bg-[linear-gradient(180deg,rgba(24,22,19,0.96),rgba(19,18,16,0.92))]"
        data-panel="novel-preview"
        data-preview-mode={hasFinalPolish ? 'final-polish' : visibleSections.length > 0 ? 'sections' : 'empty'}
      >
        <CardHeader className="shrink-0 space-y-4 border-b border-border/70 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="editorial-kicker">Live Manuscript</div>
              <CardTitle className="flex items-center gap-2 text-lg font-serif">
                <BookOpen className="h-4 w-4" />
                小说预览
              </CardTitle>
              <CardDescription className="max-w-md text-[13px] leading-6 text-muted-foreground/90">
                {previewLead}
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                {hasFinalPolish ? (
                  <Badge variant="default">全书润色版</Badge>
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
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-background/70"
                onClick={() => setExpanded((prev) => !prev)}
                data-action="toggle-novel-preview"
                data-expanded={expanded ? 'true' : 'false'}
              >
                {expanded ? <ChevronUp className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                {expanded ? '收起预览' : '展开预览'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-background/70"
                onClick={() => setFullscreenOpen(true)}
                disabled={!taskState.fullNovel}
                data-action="open-novel-preview-fullscreen"
              >
                <Expand className="mr-1 h-3 w-3" />
                全屏查看
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-background/70"
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
                className="h-8 bg-background/70"
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
                className="h-8 bg-background/70"
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
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="story-stat py-3">
              <div className="story-stat-label">已生成章节</div>
              <div className="story-stat-value text-[1.3rem]">{visibleSections.length || '0'}</div>
            </div>
            <div className="story-stat py-3">
              <div className="story-stat-label">稿件状态</div>
              <div className="story-stat-value text-[1.15rem]">{hasFinalPolish ? '终稿' : visibleSections.length > 0 ? '连载中' : '待生成'}</div>
            </div>
          </div>
          {!expanded ? (
            <div className="rounded-[1.2rem] border border-border/70 bg-background/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <div className="text-sm leading-7 text-muted-foreground">{previewSummary}</div>
            </div>
          ) : renderPreviewBody(previewHeightClass)}
        </CardContent>
      </Card>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden border-border/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(249,242,232,0.95))] dark:bg-[linear-gradient(180deg,rgba(24,22,19,0.98),rgba(19,18,16,0.95))]">
          <DialogHeader>
            <DialogTitle>小说预览</DialogTitle>
          </DialogHeader>
          {renderPreviewBody(fullscreenHeightClass)}
        </DialogContent>
      </Dialog>
    </>
  );
}
