'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getTroubleshootingAdvice } from '@/lib/error-hints';
import type { ChunkStatus, PipelineStage, RequestStage, TaskState } from '@/lib/types';
import { WORKFLOW_MODE_LABELS } from '@/lib/types';

interface ProgressPanelProps {
  taskState: TaskState;
  onRegenerateItem?: (stage: RequestStage, itemIndex: number) => Promise<void>;
}

type StageCard = {
  stage: RequestStage;
  title: string;
  value: string;
  hint: string;
  secondary?: string;
};

type ProgressItem = {
  key: string;
  stage: RequestStage;
  itemIndex: number;
  label: string;
  meta: string;
  status: ChunkStatus;
  runtimeMs: number;
  runtimeStartedAt?: string;
  preview: string;
  detail: string;
  error?: string;
};

function isSplitDraftMode(taskState: TaskState): boolean {
  return taskState.config.workflowMode === 'split-draft';
}

function countCompleted(items: Array<{ status: ChunkStatus }>): number {
  return items.filter((item) => item.status === 'success' || item.status === 'skipped').length;
}

function statusLabel(status: ChunkStatus): string {
  switch (status) {
    case 'processing':
      return '处理中';
    case 'success':
      return '完成';
    case 'error':
      return '失败';
    case 'skipped':
      return '已跳过';
    default:
      return '等待中';
  }
}

function formatRuntime(runtimeMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(runtimeMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getLiveRuntimeMs(runtimeMs: number, runtimeStartedAt: string | undefined, nowMs: number): number {
  const startedAtMs = runtimeStartedAt ? Date.parse(runtimeStartedAt) : Number.NaN;
  return runtimeMs + (
    Number.isFinite(startedAtMs)
      ? Math.max(0, nowMs - startedAtMs)
      : 0
  );
}

function hasAnyItemRuntimeInProgress(taskState: TaskState): boolean {
  return taskState.pageAnalyses.some((page) => Boolean(page.runtimeStartedAt))
    || taskState.chunkSyntheses.some((chunk) => Boolean(chunk.runtimeStartedAt))
    || Boolean(taskState.globalSynthesis.runtimeStartedAt)
    || Boolean(taskState.writingPreparation.runtimeStartedAt)
    || taskState.novelSections.some((section) => Boolean(section.runtimeStartedAt))
    || Boolean(taskState.finalPolish.runtimeStartedAt);
}

function formatItemRuntimeLabel(item: ProgressItem, nowMs: number): string | null {
  const runtimeMs = getLiveRuntimeMs(item.runtimeMs, item.runtimeStartedAt, nowMs);
  if (runtimeMs <= 0) {
    return null;
  }

  return `${item.status === 'processing' ? '运行时间' : '用时'} ${formatRuntime(runtimeMs)}`;
}

function StatusIcon({ status }: { status: ChunkStatus }) {
  switch (status) {
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 text-amber-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function stageLabel(stage: PipelineStage, taskState: TaskState): string {
  if (stage === 'idle') {
    return '空闲';
  }

  const labels: Record<RequestStage, string> = {
    'analyze-pages': '逐页分析',
    'synthesize-chunks': isSplitDraftMode(taskState) ? WORKFLOW_MODE_LABELS['split-draft'] : '分块综合',
    'synthesize-story': '整书综合',
    'write-sections': isSplitDraftMode(taskState) ? '完整正文生成' : '章节写作',
    'polish-novel': '全书统稿',
  };

  return labels[stage];
}

function getDisplayStage(taskState: TaskState): RequestStage {
  if (taskState.currentStage !== 'idle') {
    return taskState.currentStage;
  }

  return isSplitDraftMode(taskState) ? 'synthesize-chunks' : 'analyze-pages';
}

function formatPageRange(pageNumbers: number[]): string {
  if (pageNumbers.length === 0) {
    return '无页码';
  }

  const sorted = [...pageNumbers].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return first === last ? `第 ${first} 页` : `第 ${first}-${last} 页`;
}

function extractPreview(text: string | undefined, maxLength = 180): string {
  const normalized = String(text || '').trim().replace(/\n{3,}/g, '\n\n');
  if (!normalized) {
    return '暂无';
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function joinValues(values: Array<string | undefined>, fallback = '无'): string {
  const normalized = values.map((value) => String(value || '').trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(' / ') : fallback;
}

function buildChunkPreview(
  chunk: TaskState['chunkSyntheses'][number],
  splitDraftMode: boolean
): string {
  const primaryLine = chunk.summary?.trim()
    ? `摘要：${chunk.summary}`
    : chunk.draftText?.trim()
      ? `草稿片段：${extractPreview(chunk.draftText, splitDraftMode ? 90 : 140)}`
      : '';
  const previewLines = [
    primaryLine,
    chunk.keyDevelopments.length > 0 ? `推进：${joinValues(chunk.keyDevelopments)}` : '',
    chunk.continuitySummary?.trim() ? `承接：${chunk.continuitySummary}` : '',
  ].filter(Boolean);

  if (previewLines.length > 0) {
    return previewLines.slice(0, splitDraftMode ? 2 : 3).join('\n');
  }

  switch (chunk.status) {
    case 'processing':
      return '这一部分正在生成中，完成后会在这里显示摘要。';
    case 'error':
      return '这一部分生成失败，可点“详情”查看原因。';
    case 'success':
      return '这一部分已生成，可点“详情”查看内容。';
    default:
      return splitDraftMode
        ? '这一部分开始生成后，会在这里显示摘要。'
        : '等待生成后显示摘要。';
  }
}

function buildPageItem(taskState: TaskState): ProgressItem[] {
  return taskState.pageAnalyses.map((page) => ({
    key: `page-${page.index}`,
    stage: 'analyze-pages',
    itemIndex: page.index,
    label: `第 ${page.pageNumber} 页`,
    meta: [page.location, page.timeHint].filter(Boolean).join(' / ') || '等待提取场景信息',
    status: page.status,
    runtimeMs: page.runtimeMs,
    runtimeStartedAt: page.runtimeStartedAt,
    error: page.error,
    preview: [
      `摘要：${page.summary || '暂无'}`,
      `关键事件：${joinValues(page.keyEvents)}`,
      `角色：${joinValues(page.characters.map((character) => character.name))}`,
    ].join('\n'),
    detail: [
      `页码：第 ${page.pageNumber} 页`,
      `摘要：${page.summary || '暂无'}`,
      `地点：${page.location || '未知'}`,
      `时间：${page.timeHint || '未知'}`,
      `关键事件：${joinValues(page.keyEvents)}`,
      `对白：${page.dialogue.map((line) => `${line.speaker}：${line.text}`).join('\n') || '无'}`,
      `画面文字：${page.visualText.join('\n') || '无'}`,
      page.error ? `错误：${page.error}` : '',
    ].filter(Boolean).join('\n\n'),
  }));
}

function buildChunkItems(taskState: TaskState): ProgressItem[] {
  return taskState.chunkSyntheses.map((chunk) => {
    const label = chunk.title || (isSplitDraftMode(taskState) ? `第 ${chunk.index + 1} 部分` : `第 ${chunk.index + 1} 块`);
    return {
      key: `chunk-${chunk.index}`,
      stage: 'synthesize-chunks',
      itemIndex: chunk.index,
      label,
      meta: `${formatPageRange(chunk.pageNumbers)} · ${chunk.pageNumbers.length} 页`,
      status: chunk.status,
      runtimeMs: chunk.runtimeMs,
      runtimeStartedAt: chunk.runtimeStartedAt,
      error: chunk.error,
      preview: buildChunkPreview(chunk, isSplitDraftMode(taskState)),
      detail: [
        `范围：${formatPageRange(chunk.pageNumbers)}`,
        `摘要：${chunk.summary || '暂无'}`,
        chunk.draftText ? `分段草稿：\n${chunk.draftText}` : '',
        `推进：${joinValues(chunk.keyDevelopments)}`,
        `承接：${chunk.continuitySummary || '暂无'}`,
        chunk.error ? `错误：${chunk.error}` : '',
      ].filter(Boolean).join('\n\n'),
    };
  });
}

function buildStoryItem(taskState: TaskState): ProgressItem[] {
  return [{
    key: 'story-synthesis',
    stage: 'synthesize-story',
    itemIndex: 0,
    label: '整书综合',
    meta: `${taskState.chunkSyntheses.length} 个分段 / ${taskState.globalSynthesis.sceneOutline.length} 个场景`,
    status: taskState.globalSynthesis.status,
    runtimeMs: taskState.globalSynthesis.runtimeMs,
    runtimeStartedAt: taskState.globalSynthesis.runtimeStartedAt,
    error: taskState.globalSynthesis.error,
    preview: [
      `故事概览：${extractPreview(taskState.globalSynthesis.storyOverview, 220)}`,
      `人物关系：${extractPreview(taskState.globalSynthesis.characterGuide, 180)}`,
      `写作约束：${joinValues(taskState.globalSynthesis.writingConstraints)}`,
    ].join('\n'),
    detail: [
      `故事概览：${taskState.globalSynthesis.storyOverview || '暂无'}`,
      `世界说明：${taskState.globalSynthesis.worldGuide || '暂无'}`,
      `人物说明：${taskState.globalSynthesis.characterGuide || '暂无'}`,
      `场景大纲：${
        taskState.globalSynthesis.sceneOutline.map((scene) => (
          `\n- ${scene.title}（分段 ${scene.chunkIndexes.map((index) => index + 1).join(' / ')}）`
        )).join('')
        || '\n- 暂无'
      }`,
      `写作约束：${joinValues(taskState.globalSynthesis.writingConstraints)}`,
      taskState.globalSynthesis.error ? `错误：${taskState.globalSynthesis.error}` : '',
    ].filter(Boolean).join('\n\n'),
  }];
}

function buildSectionItems(taskState: TaskState): ProgressItem[] {
  const preparation: ProgressItem = {
    key: 'writing-preparation',
    stage: 'write-sections',
    itemIndex: -1,
    label: '写作前准备',
    meta: taskState.writingPreparation.voiceGuide?.trim() ? '已生成统一写作指引' : '等待生成写作指引',
    status: taskState.writingPreparation.status,
    runtimeMs: taskState.writingPreparation.runtimeMs,
    runtimeStartedAt: taskState.writingPreparation.runtimeStartedAt,
    error: taskState.writingPreparation.error,
    preview: extractPreview(taskState.writingPreparation.voiceGuide, 240),
    detail: taskState.writingPreparation.voiceGuide || '暂无写作指引',
  };

  const sections = taskState.novelSections.map((section) => ({
    key: `section-${section.index}`,
    stage: 'write-sections' as const,
    itemIndex: section.index,
    label: section.title || (isSplitDraftMode(taskState) ? '完整正文' : `第 ${section.index + 1} 节`),
    meta: isSplitDraftMode(taskState)
      ? `${section.chunkIndexes.length} 个分段合成`
      : `关联 ${section.chunkIndexes.length} 个分块`,
    status: section.status,
    runtimeMs: section.runtimeMs,
    runtimeStartedAt: section.runtimeStartedAt,
    error: section.error,
    preview: [
      `正文：${extractPreview(section.markdownBody, 220)}`,
      section.continuitySummary ? `承接：${extractPreview(section.continuitySummary, 120)}` : '',
    ].filter(Boolean).join('\n'),
    detail: [
      section.markdownBody || '暂无正文',
      section.continuitySummary ? `承接摘要：${section.continuitySummary}` : '',
      section.error ? `错误：${section.error}` : '',
    ].filter(Boolean).join('\n\n'),
  }));

  return [preparation, ...sections];
}

function buildPolishItem(taskState: TaskState): ProgressItem[] {
  const body = taskState.finalPolish.markdownBody || '';
  return [{
    key: 'final-polish',
    stage: 'polish-novel',
    itemIndex: 0,
    label: '全书统稿',
    meta: body.trim() ? '已生成统稿结果' : '等待全书统稿',
    status: taskState.finalPolish.status,
    runtimeMs: taskState.finalPolish.runtimeMs,
    runtimeStartedAt: taskState.finalPolish.runtimeStartedAt,
    error: taskState.finalPolish.error,
    preview: extractPreview(body, 280),
    detail: [
      body || '暂无统稿正文',
      taskState.finalPolish.error ? `错误：${taskState.finalPolish.error}` : '',
    ].filter(Boolean).join('\n\n'),
  }];
}

function buildStageItems(taskState: TaskState, stage: RequestStage): ProgressItem[] {
  switch (stage) {
    case 'analyze-pages':
      return buildPageItem(taskState);
    case 'synthesize-chunks':
      return buildChunkItems(taskState);
    case 'synthesize-story':
      return buildStoryItem(taskState);
    case 'write-sections':
      return buildSectionItems(taskState);
    case 'polish-novel':
      return buildPolishItem(taskState);
    default:
      return [];
  }
}

function buildStageCards(taskState: TaskState): StageCard[] {
  const cards: StageCard[] = [];

  if (!isSplitDraftMode(taskState)) {
    cards.push({
      stage: 'analyze-pages',
      title: '逐页分析',
      value: `${countCompleted(taskState.pageAnalyses)} / ${taskState.pageAnalyses.length}`,
      hint: '查看每页识别结果',
    });
  }

  cards.push({
    stage: 'synthesize-chunks',
    title: isSplitDraftMode(taskState) ? WORKFLOW_MODE_LABELS['split-draft'] : '分块综合',
    value: `${countCompleted(taskState.chunkSyntheses)} / ${taskState.chunkSyntheses.length}`,
    hint: isSplitDraftMode(taskState) ? '查看每一部分的生成结果' : '查看每一块的综合结果',
  });

  cards.push({
    stage: 'synthesize-story',
    title: '整书综合',
    value: statusLabel(taskState.globalSynthesis.status),
    secondary: taskState.globalSynthesis.outlineConfirmed ? '场景大纲已确认' : '场景大纲待确认',
    hint: '查看全书故事综合',
  });

  cards.push({
    stage: 'write-sections',
    title: isSplitDraftMode(taskState) ? '完整正文生成' : '章节写作',
    value: `${countCompleted(taskState.novelSections)} / ${taskState.novelSections.length}`,
    secondary: taskState.writingPreparation.voiceGuide?.trim() ? '写作前准备已完成' : undefined,
    hint: isSplitDraftMode(taskState) ? '查看最终正文生成' : '查看各章节正文',
  });

  if (taskState.config.enableFinalPolish) {
    cards.push({
      stage: 'polish-novel',
      title: '全书统稿',
      value: statusLabel(taskState.finalPolish.status),
      hint: '查看统稿结果',
    });
  }

  return cards;
}

function canRegenerate(
  item: ProgressItem | null,
  taskState: TaskState,
  onRegenerateItem?: (stage: RequestStage, itemIndex: number) => Promise<void>
): item is ProgressItem {
  return Boolean(
    item
    && item.itemIndex >= 0
    && item.status !== 'processing'
    && taskState.status !== 'running'
    && taskState.status !== 'preparing'
    && onRegenerateItem
  );
}

export function ProgressPanel({ taskState, onRegenerateItem }: ProgressPanelProps) {
  const [selectedStage, setSelectedStage] = useState<RequestStage | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProgressItem | null>(null);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!selectedStage) {
      setSelectedStage(getDisplayStage(taskState));
    }
  }, [selectedStage, taskState]);

  useEffect(() => {
    if (!hasAnyItemRuntimeInProgress(taskState)) {
      return;
    }

    setNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [taskState]);

  const stageCards = useMemo(() => buildStageCards(taskState), [taskState]);
  const displayStage = selectedStage || getDisplayStage(taskState);
  const activeStageItems = useMemo(() => (
    taskState.currentStage === 'idle' ? [] : buildStageItems(taskState, taskState.currentStage)
  ), [taskState]);
  const items = useMemo(() => buildStageItems(taskState, displayStage), [displayStage, taskState]);
  const useCompactChunkCards = isSplitDraftMode(taskState) && displayStage === 'synthesize-chunks';
  const useDenseListLayout = useCompactChunkCards || items.length > 1;
  const activeRuntimeItem = activeStageItems.find((item) => item.status === 'processing') || null;
  const activeRuntimeLabel = activeRuntimeItem
    ? formatRuntime(getLiveRuntimeMs(activeRuntimeItem.runtimeMs, activeRuntimeItem.runtimeStartedAt, nowMs))
    : null;

  const includePageStage = !isSplitDraftMode(taskState);
  const totalUnits = (includePageStage ? taskState.pageAnalyses.length : 0)
    + taskState.chunkSyntheses.length
    + 1
    + (taskState.novelSections.length > 0 ? 1 : 0)
    + taskState.novelSections.length
    + (taskState.config.enableFinalPolish ? 1 : 0);
  const completedUnits = (includePageStage ? countCompleted(taskState.pageAnalyses) : 0)
    + countCompleted(taskState.chunkSyntheses)
    + (taskState.globalSynthesis.status === 'success' || taskState.globalSynthesis.status === 'skipped' ? 1 : 0)
    + (
      taskState.novelSections.length > 0
      && (taskState.writingPreparation.status === 'success' || taskState.writingPreparation.status === 'skipped')
        ? 1
        : 0
    )
    + countCompleted(taskState.novelSections)
    + (
      taskState.config.enableFinalPolish
      && (taskState.finalPolish.status === 'success' || taskState.finalPolish.status === 'skipped')
        ? 1
        : 0
    );
  const progress = totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;

  const currentErrorItem = items.find((item) => item.status === 'error' && item.error);
  const currentErrorAdvice = currentErrorItem?.error ? getTroubleshootingAdvice(currentErrorItem.error) : null;

  const handleRegenerate = async (item: ProgressItem) => {
    if (!onRegenerateItem || item.itemIndex < 0) {
      return;
    }

    setRegeneratingKey(item.key);
    try {
      await onRegenerateItem(item.stage, item.itemIndex);
      setSelectedItem(null);
    } finally {
      setRegeneratingKey(null);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-2.5 pb-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">处理进度</CardTitle>
          <Badge variant={taskState.status === 'completed' ? 'default' : 'outline'}>
            {taskState.status === 'completed' ? '全部完成' : stageLabel(taskState.currentStage, taskState)}
          </Badge>
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>{Math.round(progress)}%</span>
            <span className="max-w-[15rem] truncate text-center sm:max-w-[20rem]" title={activeRuntimeItem ? `当前项：${activeRuntimeItem.label}` : '当前没有正在处理的条目'}>
              {activeRuntimeItem ? `当前项：${activeRuntimeItem.label} · ${activeRuntimeLabel}` : '当前项用时 --'}
            </span>
            <span>{completedUnits} / {totalUnits || 0}</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {currentErrorItem ? (
          <div className="rounded-lg border border-red-200 bg-red-50/70 p-2.5 text-sm">
            <div className="font-medium text-red-700">{currentErrorItem.label}</div>
            <div className="mt-1.5 whitespace-pre-wrap text-red-700">{currentErrorItem.error}</div>
            {currentErrorAdvice ? (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                <div className="font-medium">{currentErrorAdvice.title}</div>
                <div className="mt-1 text-sm">{currentErrorAdvice.summary}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-4">
          {stageCards.map((card) => (
            <button
              key={card.stage}
              type="button"
              className={`rounded-lg border p-2.5 text-left transition ${
                displayStage === card.stage
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/30'
              }`}
              onClick={() => setSelectedStage(card.stage)}
            >
              <div className="text-sm font-medium">{card.title}</div>
              <div className="mt-0.5 text-base font-semibold">{card.value}</div>
              {card.secondary ? (
                <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{card.secondary}</div>
              ) : null}
              <div className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{card.hint}</div>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <div className="text-sm font-medium">{stageLabel(displayStage, taskState)}</div>
              <div className="text-[11px] leading-4 text-muted-foreground">
                {isSplitDraftMode(taskState) && displayStage === 'synthesize-chunks'
                  ? '均分后的各部分会分别在这里展示'
                  : '点击条目可查看详情'}
              </div>
            </div>
          </div>
          <div className="max-h-[min(460px,calc(100vh-19rem))] overflow-y-auto overscroll-contain">
            <div className={useDenseListLayout ? 'space-y-2 p-2.5' : 'space-y-2.5 p-3'}>
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  当前阶段还没有可展示的内容。
                </div>
              ) : items.map((item) => (
                <div key={item.key} className={useDenseListLayout ? 'rounded-lg border p-2.5' : 'rounded-xl border p-3'}>
                  <div className={useDenseListLayout ? 'flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between' : 'flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between'}>
                    <div className={useDenseListLayout ? 'min-w-0 flex-1 space-y-0.5' : 'min-w-0 flex-1 space-y-1'}>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusIcon status={item.status} />
                        <span className="font-medium">{item.label}</span>
                        <Badge variant="outline">{statusLabel(item.status)}</Badge>
                      </div>
                      <div className="text-[11px] leading-4 text-muted-foreground">{item.meta}</div>
                      {formatItemRuntimeLabel(item, nowMs) ? (
                        <div className="text-[11px] leading-4 text-muted-foreground">
                          {formatItemRuntimeLabel(item, nowMs)}
                        </div>
                      ) : null}
                      <div
                        className={useDenseListLayout
                          ? 'max-h-11 overflow-hidden whitespace-pre-wrap text-xs leading-5 text-muted-foreground'
                          : 'whitespace-pre-wrap text-sm leading-6 text-muted-foreground'}
                      >
                        {item.preview}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        详情
                      </Button>
                      {canRegenerate(item, taskState, onRegenerateItem) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5"
                          onClick={() => handleRegenerate(item)}
                          disabled={regeneratingKey === item.key}
                        >
                          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${regeneratingKey === item.key ? 'animate-spin' : ''}`} />
                          重跑
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {item.error ? (
                    <>
                      <Separator className="my-2" />
                      <div className="text-xs leading-5 text-red-600">{item.error}</div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-3xl">
          {selectedItem ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <DialogTitle>{selectedItem.label}</DialogTitle>
                    <div className="text-xs text-muted-foreground">{selectedItem.meta}</div>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="whitespace-pre-wrap text-sm leading-6">{selectedItem.detail}</div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
