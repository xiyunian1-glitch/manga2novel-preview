'use client';

import { useMemo, useState } from 'react';
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  SkipForward,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { APIConfigPanel } from '@/components/api-config-panel';
import { CreativeSettingsPanel } from '@/components/creative-settings-panel';
import { ImageUploadPanel } from '@/components/image-upload-panel';
import { NovelPreview } from '@/components/novel-preview';
import { OrchestratorConfigPanel } from '@/components/orchestrator-config-panel';
import { ProgressPanel } from '@/components/progress-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getTroubleshootingAdvice } from '@/lib/error-hints';
import type { APIConfig, LastAIRequest, OrchestratorConfig, RequestStage } from '@/lib/types';
import {
  getEnabledRequestStages,
  resolveStageAPIConfig,
  resolveStageModel,
  WORKFLOW_MODE_LABELS,
  WRITING_MODE_LABELS,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { useManga2Novel } from '@/hooks/use-manga2novel';

function appStatusLabel(status: string): string {
  switch (status) {
    case 'preparing':
      return '准备中';
    case 'running':
      return '进行中';
    case 'paused':
      return '已暂停';
    case 'completed':
      return '已完成';
    case 'error':
      return '异常';
    default:
      return '待开始';
  }
}

function pipelineStageLabel(stage: string): string {
  switch (stage) {
    case 'analyze-pages':
      return '逐页分析';
    case 'synthesize-chunks':
      return '分块综合';
    case 'synthesize-story':
      return '整书综合';
    case 'write-sections':
      return '章节写作';
    case 'polish-novel':
      return '全书润色';
    default:
      return '尚未启动';
  }
}

function hasResolvedModels(
  config: APIConfig,
  orchestratorConfig: Pick<OrchestratorConfig, 'enableFinalPolish' | 'workflowMode'>
): boolean {
  return getEnabledRequestStages(orchestratorConfig).every((stage) => Boolean(resolveStageModel(config, stage)));
}

function hasResolvedStageAccess(
  config: APIConfig,
  orchestratorConfig: Pick<OrchestratorConfig, 'enableFinalPolish' | 'workflowMode'>
): boolean {
  return getEnabledRequestStages(orchestratorConfig).every((stage) => {
    const stageConfig = resolveStageAPIConfig(config, stage);
    return Boolean(stageConfig.apiKey.trim() && stageConfig.model.trim());
  });
}

function formatRequestTimestamp(value?: string): string {
  if (!value) {
    return '暂无';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString('zh-CN', { hour12: false });
}

function requestTraceStatusLabel(status?: LastAIRequest['status']): string {
  switch (status) {
    case 'running':
      return '进行中';
    case 'success':
      return '成功';
    case 'error':
      return '失败';
    case 'interrupted':
      return '已中断';
    default:
      return '暂无';
  }
}

function formatRequestImageSummary(request?: LastAIRequest): string {
  if (!request || request.imageCount <= 0 || request.imageNames.length === 0) {
    return '未附带图片';
  }

  if (request.imageNames.length <= 10) {
    return request.imageNames.join('、');
  }

  return `${request.imageNames.slice(0, 10).join('、')} 等 ${request.imageNames.length} 张`;
}

type MobileWorkbenchKey = 'config' | 'material' | 'progress' | 'advanced' | 'preview';

export default function Manga2NovelApp() {
  const [lastRequestOpen, setLastRequestOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFocus, setAdvancedFocus] = useState<'creative' | 'pipeline'>('creative');
  const [mobileWorkbench, setMobileWorkbench] = useState<MobileWorkbenchKey>('config');
  const {
    apiConfig,
    apiProfiles,
    activeApiProfileId,
    creativePresets,
    images,
    taskState,
    configLoaded,
    recoveryNotice,
    saveApiConfig,
    selectApiProfile,
    duplicateApiProfile,
    deleteApiProfile,
    saveCreativePreset,
    deleteCreativePreset,
    saveOrchestratorConfig,
    fetchModels,
    updateCreativeSettings,
    applyCreativePreset,
    addImages,
    removeImage,
    reorderImages,
    clearImages,
    startProcessing,
    pause,
    resume,
    skipCurrent,
    retryCurrent,
    reanalyzePage,
    regenerateChunk,
    regenerateStory,
    regenerateSection,
    regenerateWritingPreparation,
    regenerateFinalPolish,
    updatePageAnalysis,
    updateChunkSynthesis,
    updateStorySynthesis,
    updateWritingPreparation,
    updateNovelSection,
    updateFinalPolish,
    dismissRecoveryNotice,
    reset,
    exportNovel,
  } = useManga2Novel();

  const isRunning = taskState.status === 'running' || taskState.status === 'preparing';
  const isPaused = taskState.status === 'paused';
  const isCompleted = taskState.status === 'completed';
  const hasApiKey = hasResolvedStageAccess(apiConfig, taskState.config);
  const modelReady = hasResolvedModels(apiConfig, taskState.config);
  const hasImages = images.length > 0;
  const canStart = hasApiKey && modelReady && hasImages && !isRunning;
  const lastAIRequest = taskState.lastAIRequest;
  const retryHistoryAttempts = (lastAIRequest?.attempts || []).filter((attempt) => attempt.sequence > 1);
  const hasPreviewContent = taskState.novelSections.some((item) => (
    item.status === 'success' && Boolean(item.markdownBody?.trim())
  )) || Boolean(taskState.finalPolish.markdownBody?.trim());
  const currentPresetName = useMemo(() => {
    return creativePresets.find((preset) => preset.id === taskState.creativeSettings.presetId)?.name || '自定义';
  }, [creativePresets, taskState.creativeSettings.presetId]);
  const currentPresetDisplayName = currentPresetName.startsWith('鑷') ? '自定义' : currentPresetName;
  const legacyAdvancedSummary = useMemo(() => {
    return [
      `风格：${currentPresetName}`,
      `写作模式：${taskState.creativeSettings.writingMode === 'faithful' ? '忠实转写' : '文学改写'}`,
      `逐页分析：${taskState.config.chunkSize === 0 ? '自动（自适应）' : `每组 ${taskState.config.chunkSize} 张`}`,
      `分块综合：${taskState.config.synthesisChunkCount} 块`,
      `全书润色：${taskState.config.enableFinalPolish ? '开' : '关'}`,
      `自动跳过：${taskState.config.autoSkipOnError ? '开' : '关'}`,
    ];
  }, [
    currentPresetName,
    taskState.config.autoSkipOnError,
    taskState.config.chunkSize,
    taskState.config.enableFinalPolish,
    taskState.config.synthesisChunkCount,
    taskState.creativeSettings.writingMode,
  ]);
  void legacyAdvancedSummary;
  const modeAwareAdvancedSummary = useMemo(() => {
    const workflowModeLabel = WORKFLOW_MODE_LABELS[taskState.config.workflowMode];
    const writingModeLabel = WRITING_MODE_LABELS[taskState.creativeSettings.writingMode];
    const workflowSummary = taskState.config.workflowMode === 'split-draft'
      ? `逐页分组：${taskState.config.chunkSize === 0 ? '自动（自适应）' : `每组 ${taskState.config.chunkSize} 张`}`
      : `逐页分组：${taskState.config.chunkSize === 0 ? '自动（自适应）' : `每组 ${taskState.config.chunkSize} 张`}`;
    const synthesisSummary = taskState.config.workflowMode === 'split-draft'
      ? `章节分段：${taskState.config.splitPartCount === 0 ? '自动（每 10 页一章）' : `${taskState.config.splitPartCount} 段`}`
      : `分块综合：${taskState.config.synthesisChunkCount} 段`;

    return [
      `风格：${currentPresetDisplayName}`,
      `写作模式：${writingModeLabel}`,
      `流程模式：${workflowModeLabel}`,
      workflowSummary,
      synthesisSummary,
      `全书润色：${taskState.config.enableFinalPolish ? '开' : '关'}`,
      `自动跳过：${taskState.config.autoSkipOnError ? '开' : '关'}`,
    ];
  }, [
    currentPresetDisplayName,
    taskState.config.autoSkipOnError,
    taskState.config.chunkSize,
    taskState.config.enableFinalPolish,
    taskState.config.splitPartCount,
    taskState.config.synthesisChunkCount,
    taskState.config.workflowMode,
    taskState.creativeSettings.writingMode,
  ]);
  const mobileStartHint = useMemo(() => {
    if (!hasApiKey) {
      return '还差：补全 API 配置';
    }

    if (!modelReady) {
      return '还差：确认模型';
    }

    if (!hasImages) {
      return '还差：上传漫画图片';
    }

    return `已就绪，可开始处理 ${images.length} 张图片`;
  }, [hasApiKey, hasImages, images.length, modelReady]);
  const readySectionCount = useMemo(() => {
    return taskState.novelSections.filter((item) => item.status === 'success' && Boolean(item.markdownBody?.trim())).length;
  }, [taskState.novelSections]);
  const previewStatusLabel = hasPreviewContent
    ? (taskState.finalPolish.markdownBody?.trim() ? '终稿已成' : `已写 ${readySectionCount} 节`)
    : '等待成稿';
  const workbenchStatusLabel = appStatusLabel(taskState.status);
  const dashboardStats = [
    { label: '工作台状态', value: workbenchStatusLabel },
    { label: '当前阶段', value: pipelineStageLabel(taskState.currentStage) },
    { label: '已载入画稿', value: `${images.length} 张` },
    { label: '书稿预览', value: previewStatusLabel },
  ];
  const workbenchSummary = isRunning
    ? `系统正在把这组漫画拆解成可写作的书稿，当前进行到「${pipelineStageLabel(taskState.currentStage)}」。`
    : isPaused
      ? '当前流程已暂停，检查进度卡片后可以继续、跳过或重试。'
      : isCompleted
        ? '这一轮转换已经完成，右侧可以直接通读、复制或导出结果。'
        : '先准备接口、上传画稿，再从这里启动一次更像编辑部排版流程的转换。';
  const advancedSections = useMemo(() => {
    return {
      creative: {
        key: 'creative' as const,
        kicker: 'Writing Direction',
        title: '写作指令面板',
        description: '控制预设、写作模式、语气浓度和提示词层次，决定最后成稿像什么。',
        summary: [
          `当前预设：${currentPresetDisplayName}`,
          `写作模式：${WRITING_MODE_LABELS[taskState.creativeSettings.writingMode]}`,
          `Temperature：${taskState.creativeSettings.temperature.toFixed(2)}`,
        ],
      },
      pipeline: {
        key: 'pipeline' as const,
        kicker: 'Queue Design',
        title: '流水线参数面板',
        description: '控制流程模式、拆分策略、并发和重试，让整条转换流水线更稳。',
        summary: [
          `流程模式：${WORKFLOW_MODE_LABELS[taskState.config.workflowMode]}`,
          `逐页分组：${taskState.config.chunkSize === 0 ? '自动（自适应）' : `每组 ${taskState.config.chunkSize} 张`}`,
          `重试 / 并发：${taskState.config.maxRetries} 次 / ${taskState.config.maxConcurrency} 并发`,
        ],
      },
    };
  }, [
    currentPresetDisplayName,
    taskState.config.chunkSize,
    taskState.config.maxConcurrency,
    taskState.config.maxRetries,
    taskState.config.workflowMode,
    taskState.creativeSettings.temperature,
    taskState.creativeSettings.writingMode,
  ]);
  const mobileWorkbenchSections = useMemo(() => {
    return [
      {
        key: 'config' as const,
        label: '接口',
        title: '配置工作台',
        summary: hasApiKey && modelReady ? '接口已就绪' : mobileStartHint,
        available: true,
      },
      {
        key: 'material' as const,
        label: '素材',
        title: '素材台',
        summary: images.length > 0 ? `已载入 ${images.length} 张` : '等待上传画稿',
        available: true,
      },
      {
        key: 'progress' as const,
        label: '进度',
        title: '流程台',
        summary: taskState.status === 'idle' ? '尚未启动' : `${appStatusLabel(taskState.status)} · ${pipelineStageLabel(taskState.currentStage)}`,
        available: true,
      },
      {
        key: 'advanced' as const,
        label: '高级',
        title: '调优台',
        summary: `${currentPresetDisplayName} · ${WORKFLOW_MODE_LABELS[taskState.config.workflowMode]}`,
        available: true,
      },
      {
        key: 'preview' as const,
        label: '书稿',
        title: '预览台',
        summary: previewStatusLabel,
        available: hasPreviewContent,
      },
    ];
  }, [
    currentPresetDisplayName,
    hasApiKey,
    hasPreviewContent,
    images.length,
    mobileStartHint,
    modelReady,
    previewStatusLabel,
    taskState.config.workflowMode,
    taskState.currentStage,
    taskState.status,
  ]);
  const activeMobileWorkbench = mobileWorkbenchSections.some((section) => section.key === mobileWorkbench && section.available)
    ? mobileWorkbench
    : 'config';

  const currentFailure = useMemo(() => {
    switch (taskState.currentStage) {
      case 'analyze-pages': {
        const failedPage = taskState.pageAnalyses.find(
          (item) => item.analysisBatchIndex === taskState.currentChunkIndex && item.status === 'error' && item.error
        );

        return failedPage
          ? { label: `第 ${failedPage.pageNumber} 页`, error: failedPage.error as string }
          : null;
      }
      case 'synthesize-chunks': {
        const failedChunk = taskState.chunkSyntheses[taskState.currentChunkIndex];

        return failedChunk?.error
          ? { label: failedChunk.title || `第 ${failedChunk.index + 1} 块`, error: failedChunk.error }
          : null;
      }
      case 'synthesize-story':
        return taskState.globalSynthesis.error
          ? { label: '整书综合', error: taskState.globalSynthesis.error }
          : null;
      case 'write-sections': {
        if (taskState.writingPreparation.status === 'error' && taskState.writingPreparation.error) {
          return { label: '写作前全书统稿', error: taskState.writingPreparation.error };
        }

        const failedSection = taskState.novelSections[taskState.currentChunkIndex];

        return failedSection?.error
          ? { label: failedSection.title || `第 ${failedSection.index + 1} 节`, error: failedSection.error }
          : null;
      }
      case 'polish-novel':
        return taskState.finalPolish.error
          ? { label: '全书润色', error: taskState.finalPolish.error }
          : null;
      default:
        return null;
    }
  }, [
    taskState.chunkSyntheses,
    taskState.currentChunkIndex,
    taskState.currentStage,
    taskState.finalPolish.error,
    taskState.globalSynthesis.error,
    taskState.novelSections,
    taskState.pageAnalyses,
    taskState.writingPreparation.error,
    taskState.writingPreparation.status,
  ]);
  const currentFailureAdvice = useMemo(() => getTroubleshootingAdvice(currentFailure?.error), [currentFailure?.error]);
  const showRecoveryResume = recoveryNotice?.type === 'interrupted-task' && isPaused;

  const handleStart = async () => {
    try {
      await startProcessing();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '处理失败');
    }
  };

  const handleResume = async () => {
    try {
      await resume();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '恢复失败');
    }
  };

  const handleSkip = async () => {
    try {
      await skipCurrent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '跳过失败');
    }
  };

  const handleRetry = async () => {
    try {
      await retryCurrent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重试失败');
    }
  };

  const handleRegenerateItem = async (stage: RequestStage, itemIndex: number) => {
    try {
      switch (stage) {
        case 'analyze-pages': {
          const pageNumber = await reanalyzePage(itemIndex);
          toast.success(`第 ${pageNumber} 页已重新分析。后面的内容先保留，点“继续”会从受影响的位置往后刷新。`);
          return;
        }
        case 'synthesize-chunks': {
          const chunkNumber = await regenerateChunk(itemIndex);
          toast.success(`第 ${chunkNumber} 块已重新综合。后面的结果先保留，点“继续”会接着往后刷新。`);
          return;
        }
        case 'synthesize-story': {
          await regenerateStory();
          toast.success('整书综合已重新生成。已有章节先保留，点“继续”即可从写作前统稿往后刷新。');
          return;
        }
        case 'write-sections': {
          if (itemIndex < 0) {
            await regenerateWritingPreparation();
            toast.success('写作前全书统稿已生成，检查后即可继续进入章节写作。');
            return;
          }
          const sectionNumber = await regenerateSection(itemIndex);
          toast.success(`第 ${sectionNumber} 节已重新生成。后面的章节先保留，点“继续”会从后续章节往后刷新。`);
          return;
        }
        case 'polish-novel': {
          await regenerateFinalPolish();
          toast.success('全书润色已重新生成。你可以检查结果后再继续。');
          return;
        }
        default:
          return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重新处理失败');
      throw error;
    }
  };

  const handleUpdateItem = async (stage: RequestStage, itemIndex: number, value: unknown) => {
    try {
      switch (stage) {
        case 'analyze-pages':
          updatePageAnalysis(itemIndex, value);
          toast.success('逐页分析已保存，后续流程会从受影响的位置继续。');
          return;
        case 'synthesize-chunks':
          updateChunkSynthesis(itemIndex, value);
          toast.success('分块综合已保存，整书综合及后续阶段已标记为待刷新。');
          return;
        case 'synthesize-story':
          updateStorySynthesis(value);
          toast.success('整书综合已保存。若场景大纲有变化，请重新确认后再继续。');
          return;
        case 'write-sections':
          if (itemIndex < 0) {
            updateWritingPreparation(value);
            toast.success('写作前全书统稿已保存，后续章节已标记为待刷新。');
            return;
          }
          updateNovelSection(itemIndex, value);
          toast.success('章节内容已保存，后续章节与终稿会从正确位置继续刷新。');
          return;
        case 'polish-novel':
          updateFinalPolish(value);
          toast.success('全书润色内容已保存。');
          return;
        default:
          return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存修改失败');
      throw error;
    }
  };

  if (!configLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const requestTraceDialog = (
    <Dialog open={lastRequestOpen} onOpenChange={setLastRequestOpen}>
      <DialogTrigger
        render={(
          <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm" disabled={!lastAIRequest}>
            <Send className="mr-1 h-4 w-4" />
            <span className="sm:hidden">上次请求</span>
            <span className="hidden sm:inline">查看上次发送</span>
          </Button>
        )}
      />
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>上一次发给 AI 的内容</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">模型：</span>{lastAIRequest?.model || '暂无'}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">提供商：</span>{lastAIRequest?.providerLabel || lastAIRequest?.provider || '暂无'}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">阶段：</span>{lastAIRequest?.stage || '暂无'}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">任务：</span>{lastAIRequest?.itemLabel || '暂无'}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">请求状态：</span>{requestTraceStatusLabel(lastAIRequest?.status)}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">总尝试次数：</span>{lastAIRequest?.totalAttempts || 0}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">图片数：</span>{lastAIRequest ? `${lastAIRequest.imageCount} 张` : '暂无'}</div>
          <div className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">最近发送：</span>{formatRequestTimestamp(lastAIRequest?.sentAt)}</div>
          <div className="min-w-0 [overflow-wrap:anywhere] sm:col-span-2"><span className="font-medium">图片：</span>{formatRequestImageSummary(lastAIRequest)}</div>
          <div className="min-w-0 [overflow-wrap:anywhere] sm:col-span-2"><span className="font-medium">接口地址：</span>{lastAIRequest?.baseUrl || '默认地址'}</div>
        </div>
        <ScrollArea className="h-[420px] rounded-lg border border-border bg-muted/20 p-3">
          <div className="space-y-4 pr-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">首轮失败原因（仅第 1 次尝试）</div>
              <div className="rounded-lg border bg-background/80 px-3 py-2 text-xs leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {lastAIRequest?.firstFailureReason || '本次请求首轮没有失败，或还没记录到失败。'}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">自动重试历史</div>
              {retryHistoryAttempts.length ? (
                <div className="space-y-2">
                  {retryHistoryAttempts.map((attempt) => (
                    <div
                      key={`${attempt.sequence}-${attempt.sentAt}`}
                      className="min-w-0 rounded-lg border bg-background/80 px-3 py-2 text-xs leading-6"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">第 {attempt.sequence} 次</span>
                        <span className="min-w-0 [overflow-wrap:anywhere]">模型：{attempt.model}</span>
                        <span className="min-w-0 [overflow-wrap:anywhere]">时间：{formatRequestTimestamp(attempt.sentAt)}</span>
                        <Badge
                          variant={attempt.outcome === 'success' ? 'default' : attempt.outcome === 'running' ? 'secondary' : 'outline'}
                        >
                          {attempt.outcome === 'success' ? '成功' : attempt.outcome === 'running' ? '进行中' : '失败'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-muted-foreground [overflow-wrap:anywhere]">
                        max_tokens：{attempt.maxOutputTokens ?? '默认'}
                      </div>
                      {attempt.error ? (
                        <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-red-700 whitespace-pre-wrap [overflow-wrap:anywhere]">
                          {attempt.error}
                        </div>
                      ) : null}
                      {attempt.nextAction ? (
                        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-800 whitespace-pre-wrap [overflow-wrap:anywhere]">
                          后续动作：{attempt.nextAction}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border bg-background/80 px-3 py-2 text-xs leading-6">
                  暂无重试历史。
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">System Prompt</div>
              <pre className="whitespace-pre-wrap text-xs leading-6 [overflow-wrap:anywhere]">{lastAIRequest?.systemPrompt || '暂无'}</pre>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">User Prompt</div>
              <pre className="whitespace-pre-wrap text-xs leading-6 [overflow-wrap:anywhere]">{lastAIRequest?.userPrompt || '暂无'}</pre>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  const currentFailureCard = currentFailure?.error ? (
    <Card className="border-red-200 bg-red-50/90 shadow-[0_20px_48px_rgba(190,60,45,0.12)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">当前失败：{currentFailure.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-background/80 px-3 py-2 text-xs leading-5 text-red-700">
          {currentFailure.error}
        </div>
        {currentFailureAdvice ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            <Badge
              variant="outline"
              className="border-amber-300 bg-amber-100/80 text-[11px] text-amber-900"
            >
              {currentFailureAdvice.categoryLabel}
            </Badge>
            <div className="font-medium">{currentFailureAdvice.title}</div>
            <div className="mt-1">{currentFailureAdvice.summary}</div>
            <div className="mt-2 space-y-1">
              {currentFailureAdvice.checks.map((check) => (
                <div key={check}>- {check}</div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  ) : null;

  const configPanel = (
    <APIConfigPanel
      config={apiConfig}
      profiles={apiProfiles}
      activeProfileId={activeApiProfileId}
      onSave={saveApiConfig}
      onSelectProfile={selectApiProfile}
      onDuplicateProfile={duplicateApiProfile}
      onDeleteProfile={deleteApiProfile}
      onFetchModels={fetchModels}
      disabled={isRunning}
    />
  );

  const materialPanel = (
    <ImageUploadPanel
      images={images}
      onAdd={addImages}
      onRemove={removeImage}
      onReorder={reorderImages}
      onClear={clearImages}
      disabled={isRunning}
    />
  );

  const progressPanelContent = (
    <div className="space-y-4">
      {currentFailureCard}
      <ProgressPanel
        taskState={taskState}
        onRegenerateItem={handleRegenerateItem}
        onUpdateItem={handleUpdateItem}
      />
    </div>
  );

  const advancedPanel = (
    <Card className="overflow-hidden border-border/75 bg-[linear-gradient(180deg,rgba(255,252,247,0.92),rgba(248,242,233,0.82))] shadow-[0_20px_48px_rgba(44,33,24,0.08)] dark:bg-[linear-gradient(180deg,rgba(24,22,19,0.96),rgba(19,18,16,0.92))]">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="editorial-kicker">Advanced Direction Deck</div>
            <CardTitle className="flex flex-wrap items-center gap-2 font-serif text-lg">
              <Settings2 className="h-4 w-4" />
              高级设置
            </CardTitle>
            <CardDescription className="max-w-2xl text-[13px] leading-6 text-muted-foreground/90">
              这里不再堆成一整块大表单，而是拆成两条独立编辑线：一条决定成稿的语言气质，一条决定整条流水线的运行方式。
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start bg-background/72"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            data-action="toggle-advanced-settings"
          >
            {advancedOpen ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
            {advancedOpen ? '收起高级设置' : '展开高级设置'}
          </Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {Object.values(advancedSections).map((section) => {
            const isActive = advancedFocus === section.key;

            return (
              <button
                key={section.key}
                type="button"
                className={cn(
                  'rounded-[1.25rem] border px-4 py-4 text-left transition',
                  isActive
                    ? 'border-primary/25 bg-primary/7 shadow-[0_18px_40px_rgba(37,71,184,0.1)]'
                    : 'border-border/75 bg-background/58 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/72'
                )}
                onClick={() => {
                  setAdvancedFocus(section.key);
                  setAdvancedOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] tracking-[0.12em] text-muted-foreground">{section.kicker}</div>
                    <div className="mt-1 font-serif text-[1.08rem] font-semibold text-foreground">{section.title}</div>
                  </div>
                  <Badge variant={isActive ? 'default' : 'outline'}>{isActive ? '当前焦点' : '切换查看'}</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.description}</p>
                <div className="mt-4 space-y-1.5">
                  {section.summary.map((item) => (
                    <div key={item} className="text-xs leading-5 text-foreground/84">{item}</div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {modeAwareAdvancedSummary.map((item) => (
            <Badge key={item} variant="outline">{item}</Badge>
          ))}
        </div>
      </CardHeader>

      {advancedOpen ? (
        <CardContent className="space-y-4 border-t border-border/70 bg-background/24 pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="text-[11px] tracking-[0.12em] text-muted-foreground">
                {advancedSections[advancedFocus].kicker}
              </div>
              <div className="font-serif text-[1.15rem] font-semibold text-foreground">
                {advancedSections[advancedFocus].title}
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                {advancedSections[advancedFocus].description}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={advancedFocus === 'creative' ? 'default' : 'outline'}
                onClick={() => setAdvancedFocus('creative')}
              >
                写作指令
              </Button>
              <Button
                type="button"
                size="sm"
                variant={advancedFocus === 'pipeline' ? 'default' : 'outline'}
                onClick={() => setAdvancedFocus('pipeline')}
              >
                流水线参数
              </Button>
            </div>
          </div>

          <div className="rounded-[1.1rem] border border-border/70 bg-background/60 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {advancedSections[advancedFocus].summary.map((item) => (
                <Badge key={item} variant="outline">{item}</Badge>
              ))}
            </div>
          </div>

          {advancedFocus === 'creative' ? (
            <CreativeSettingsPanel
              settings={taskState.creativeSettings}
              presets={creativePresets}
              onUpdate={updateCreativeSettings}
              onApplyPreset={applyCreativePreset}
              onSavePreset={saveCreativePreset}
              onDeletePreset={deleteCreativePreset}
              disabled={isRunning}
            />
          ) : (
            <OrchestratorConfigPanel
              config={taskState.config}
              onUpdate={saveOrchestratorConfig}
              disabled={isRunning}
            />
          )}
        </CardContent>
      ) : null}
    </Card>
  );

  const previewPanel = hasPreviewContent ? (
    <div className="space-y-3 xl:pt-9">
      <div className="editorial-kicker">Live Reading Pane</div>
      <NovelPreview taskState={taskState} onExport={exportNovel} />
    </div>
  ) : null;

  return (
    <div
      className="app-shell min-h-screen bg-background"
      data-testid="manga2novel-app"
      data-app-status={taskState.status}
      data-current-stage={taskState.currentStage}
      data-start-ready={canStart ? 'true' : 'false'}
    >
      <Toaster position="top-right" richColors />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/68">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-2.5 lg:px-6 lg:py-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <BookOpenText className="h-5 w-5 text-primary" />
              <h1 className="font-serif text-lg font-semibold tracking-[0.02em] sm:text-xl">Manga2Novel Preview</h1>
              <span className="hidden text-xs tracking-[0.14em] text-muted-foreground/90 sm:inline">EDITORIAL WORKBENCH</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                variant={taskState.config.autoSkipOnError ? 'default' : 'outline'}
                onClick={() => saveOrchestratorConfig({ autoSkipOnError: !taskState.config.autoSkipOnError })}
                data-action="toggle-auto-skip"
              >
                <SkipForward className="mr-1 h-4 w-4" />
                <span className="sm:hidden">自动跳过</span>
                <span className="hidden sm:inline">{taskState.config.autoSkipOnError ? '自动跳过：开' : '自动跳过：关'}</span>
              </Button>

              {requestTraceDialog}

              {!isRunning && !isPaused && !isCompleted && (
                <Button
                  onClick={handleStart}
                  size="sm"
                  disabled={!canStart}
                  className="hidden h-9 lg:inline-flex"
                  data-action="start-processing"
                  data-viewport="desktop"
                >
                  <Play className="mr-1 h-4 w-4" />
                  开始转换
                </Button>
              )}

              {isRunning && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9"
                  onClick={pause}
                  data-action="pause-processing"
                >
                  <Pause className="mr-1 h-4 w-4" />
                  暂停
                </Button>
              )}

              {isPaused && (
                <>
                  <Button
                  onClick={handleResume}
                  size="sm"
                  className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                  data-action="resume-processing"
                >
                  <Play className="mr-1 h-4 w-4" />
                    继续
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    onClick={handleSkip}
                    data-action="skip-current"
                  >
                    <SkipForward className="mr-1 h-4 w-4" />
                    跳过
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                    onClick={handleRetry}
                    data-action="retry-current"
                  >
                    <RotateCcw className="mr-1 h-4 w-4" />
                    重试
                  </Button>
                </>
              )}

              {(isPaused || isCompleted) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                  onClick={reset}
                  data-action="reset-workspace"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  重置
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-4 pb-28 lg:px-6 lg:py-6 lg:pb-8">
        <section className="mb-6">
          <Card className="overflow-visible border-border/70 bg-[linear-gradient(135deg,rgba(255,252,247,0.95),rgba(247,239,228,0.92))] shadow-[0_30px_80px_rgba(44,33,24,0.12)] dark:bg-[linear-gradient(135deg,rgba(24,22,19,0.96),rgba(19,18,16,0.92))]">
            <CardContent className="grid gap-4 px-4 py-4 sm:gap-6 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-6 lg:py-6">
              <div className="space-y-4">
                <div className="editorial-kicker">Preview Branch / Safe To Experiment</div>
                <div className="space-y-3">
                  <h2 className="max-w-4xl font-serif text-[clamp(1.6rem,1.32rem+1.4vw,3.45rem)] font-semibold leading-[1.08] tracking-[0.01em] text-foreground">
                    把漫画分镜整理成真正可读、可导出的小说书稿。
                  </h2>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                    <span className="sm:hidden">预览站先行试验新的编辑部工作台，不影响正式站正在使用的用户。</span>
                    <span className="hidden sm:inline">这一版预览站先行试验新的编辑部工作台：左侧准备接口和画稿，中段观察流程推进，右侧像校样一样实时阅读书稿，不影响正式站正在使用的用户。</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {dashboardStats.map((item) => (
                    <div key={item.label} className="story-stat">
                      <div className="story-stat-label">{item.label}</div>
                      <div className="story-stat-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-border/70 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:bg-background/24">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">预览站改版中</Badge>
                  <Badge variant="outline">{WORKFLOW_MODE_LABELS[taskState.config.workflowMode]}</Badge>
                  <Badge variant="outline">{WRITING_MODE_LABELS[taskState.creativeSettings.writingMode]}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-xs tracking-[0.14em] text-muted-foreground">WORKBENCH NOTE</div>
                  <div className="font-serif text-[1.16rem] font-semibold leading-tight text-foreground sm:text-[1.35rem]">
                    {canStart ? '已经具备开写条件。' : isRunning ? '书稿正在排版生成中。' : isCompleted ? '这一轮已经完成。' : '先把工作台准备好。'}
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">
                    <span className="sm:hidden">{canStart ? '接口和素材基本就绪，可以开始本轮转换。' : workbenchSummary}</span>
                    <span className="hidden sm:inline">{workbenchSummary}</span>
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/38 px-3 py-3">
                    <div className="text-[11px] tracking-[0.12em] text-muted-foreground">启动条件</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{mobileStartHint}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/38 px-3 py-3">
                    <div className="text-[11px] tracking-[0.12em] text-muted-foreground">配置摘要</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{modeAwareAdvancedSummary.slice(0, 2).join(' · ')}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 sm:hidden">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    onClick={() => setMobileWorkbench('config')}
                  >
                    先配接口
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setMobileWorkbench('material')}
                  >
                    上传画稿
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {recoveryNotice ? (
          <Card
            className={cn(
              'mb-6',
              recoveryNotice.type === 'interrupted-task'
                ? 'border-amber-200 bg-amber-50/80'
                : 'border-primary/15 bg-primary/5'
            )}
          >
            <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold">{recoveryNotice.title}</div>
                <div className="text-sm leading-6 text-muted-foreground">{recoveryNotice.message}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {showRecoveryResume ? (
                  <Button type="button" size="sm" onClick={handleResume} data-action="resume-processing">
                    <Play className="mr-1 h-4 w-4" />
                    继续
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={dismissRecoveryNotice}
                  data-action="dismiss-recovery-notice"
                >
                  知道了
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="mb-5 lg:hidden">
          <Card className="border-border/75 bg-background/72 shadow-[0_18px_40px_rgba(44,33,24,0.08)]">
            <CardContent className="space-y-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] tracking-[0.12em] text-muted-foreground">MOBILE WORKBENCH</div>
                  <div className="mt-1 font-serif text-[1.08rem] font-semibold text-foreground">
                    {mobileWorkbenchSections.find((section) => section.key === activeMobileWorkbench)?.title}
                  </div>
                </div>
                <Badge variant="outline" className="hidden min-[420px]:inline-flex">按区域切换</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:hidden">
                {mobileWorkbenchSections.filter((section) => section.available || section.key !== 'preview').slice(0, 4).map((section) => {
                  const isActive = activeMobileWorkbench === section.key;

                  return (
                    <button
                      key={`compact-${section.key}`}
                      type="button"
                      className={cn(
                        'rounded-[0.95rem] border px-3 py-2.5 text-left transition',
                        isActive
                          ? 'border-primary/25 bg-primary/7 shadow-[0_14px_32px_rgba(37,71,184,0.1)]'
                          : 'border-border/75 bg-background/72',
                        !section.available && 'opacity-45'
                      )}
                      onClick={() => {
                        if (!section.available) {
                          return;
                        }
                        setMobileWorkbench(section.key);
                      }}
                      disabled={!section.available}
                    >
                      <div className="text-[11px] tracking-[0.12em] text-muted-foreground">{section.label}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{section.title}</div>
                    </button>
                  );
                })}
                {hasPreviewContent ? (
                  <button
                    type="button"
                    className={cn(
                      'col-span-2 rounded-[0.95rem] border px-3 py-2.5 text-left transition',
                      activeMobileWorkbench === 'preview'
                        ? 'border-primary/25 bg-primary/7 shadow-[0_14px_32px_rgba(37,71,184,0.1)]'
                        : 'border-border/75 bg-background/72'
                    )}
                    onClick={() => setMobileWorkbench('preview')}
                  >
                    <div className="text-[11px] tracking-[0.12em] text-muted-foreground">书稿</div>
                    <div className="mt-1 text-sm font-medium text-foreground">预览台</div>
                  </button>
                ) : null}
              </div>

              <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex">
                {mobileWorkbenchSections.map((section) => {
                  const isActive = activeMobileWorkbench === section.key;

                  return (
                    <button
                      key={section.key}
                      type="button"
                      className={cn(
                        'min-w-[132px] rounded-[1rem] border px-3 py-3 text-left transition',
                        isActive
                          ? 'border-primary/25 bg-primary/7 shadow-[0_14px_32px_rgba(37,71,184,0.1)]'
                          : 'border-border/75 bg-background/72',
                        !section.available && 'opacity-45'
                      )}
                      onClick={() => {
                        if (!section.available) {
                          return;
                        }
                        setMobileWorkbench(section.key);
                      }}
                      disabled={!section.available}
                      data-action="switch-mobile-workbench"
                      data-workbench={section.key}
                    >
                      <div className="text-[11px] tracking-[0.12em] text-muted-foreground">{section.label}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{section.title}</div>
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">{section.summary}</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="space-y-5 lg:hidden">
          {activeMobileWorkbench === 'config' ? (
            <section className="space-y-2.5">
              <div className="editorial-kicker">Configuration Desk</div>
              {configPanel}
            </section>
          ) : null}

          {activeMobileWorkbench === 'material' ? (
            <section className="space-y-2.5">
              <div className="editorial-kicker">Material Desk</div>
              {materialPanel}
            </section>
          ) : null}

          {activeMobileWorkbench === 'progress' ? (
            <section className="space-y-2.5">
              <div className="editorial-kicker">Pipeline Console</div>
              {progressPanelContent}
            </section>
          ) : null}

          {activeMobileWorkbench === 'advanced' ? (
            <section className="space-y-2.5">
              <div className="editorial-kicker">Prompt & Queue Tuning</div>
              {advancedPanel}
            </section>
          ) : null}

          {activeMobileWorkbench === 'preview' ? previewPanel : null}
        </div>

        <div className={cn('hidden lg:grid lg:grid-cols-1 lg:gap-5 xl:items-start', hasPreviewContent && 'xl:grid-cols-[minmax(0,0.93fr)_minmax(380px,1.07fr)]')}>
          <div className="space-y-4">
            <div className="editorial-kicker">Configuration Desk</div>
            {configPanel}

            <div className="editorial-kicker">Material & Workflow</div>
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              {materialPanel}
              {progressPanelContent}
            </div>
            <div className="editorial-kicker">Prompt & Queue Tuning</div>
            {advancedPanel}
          </div>

          {previewPanel}
        </div>

        <Separator className="my-8 bg-border/70" />

        <footer className="pb-4 text-center text-xs text-muted-foreground/90">
          <p>Manga2Novel · 纯前端架构 · 所有数据仅在浏览器本地处理 · API Key 使用 AES-GCM 加密存储</p>
          <p className="mt-1">支持任意 OpenAI 兼容接口，也支持 Google Gemini API</p>
        </footer>
      </main>

      {!isRunning && !isPaused && !isCompleted && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/86 px-4 py-3 shadow-[0_-14px_34px_rgba(36,27,20,0.12)] backdrop-blur-xl lg:hidden">
          <div
            className="mx-auto max-w-7xl space-y-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{canStart ? '已满足开始条件' : '开始前还差一步'}</div>
                <div className="text-xs leading-5 text-muted-foreground">{mobileStartHint}</div>
              </div>
              <Badge variant={canStart ? 'default' : 'outline'}>{images.length} 张</Badge>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleStart}
              disabled={!canStart}
              data-action="start-processing"
              data-viewport="mobile"
            >
              <Play className="mr-1 h-4 w-4" />
              开始转换
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
