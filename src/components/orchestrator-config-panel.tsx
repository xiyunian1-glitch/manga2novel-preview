'use client';

import { Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OrchestratorConfig } from '@/lib/types';
import { WORKFLOW_MODE_LABELS } from '@/lib/types';

interface OrchestratorConfigPanelProps {
  config: OrchestratorConfig;
  onUpdate: (config: Partial<OrchestratorConfig>) => void;
  disabled?: boolean;
}

export function OrchestratorConfigPanel({ config, onUpdate, disabled }: OrchestratorConfigPanelProps) {
  const isSplitDraftMode = config.workflowMode === 'split-draft';
  const handleSplitPartCountChange = (value: number) => {
    const nextValue = Math.max(0, Math.min(500, Math.trunc(value) || 0));
    onUpdate({ splitPartCount: nextValue });
  };
  const queueSummaryCards = [
    {
      label: '流程模式',
      value: WORKFLOW_MODE_LABELS[config.workflowMode],
      hint: isSplitDraftMode ? '跳过分块综合，直接整书写作' : '完整保留分块综合环节',
    },
    {
      label: '逐页分组',
      value: config.chunkSize === 0 ? '自动' : `${config.chunkSize} 张`,
      hint: '建议多数视觉模型保持在 2-4 张',
    },
    {
      label: '并发请求',
      value: `${config.maxConcurrency}`,
      hint: '过高更容易撞限流，2-4 最稳',
    },
    {
      label: '终稿策略',
      value: config.enableFinalPolish ? '写完后润色' : '写完即结束',
      hint: config.includeSectionImages ? '章节写作会附带场景图' : '章节写作仅用文本上下文',
    },
  ];

  return (
    <Card className="workbench-panel border-border/75">
      <CardHeader className="space-y-3 pb-4">
        <div className="space-y-2">
          <div className="editorial-kicker">Queue Design</div>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <Settings className="h-4 w-4" />
            队列配置
          </CardTitle>
          <CardDescription className="max-w-2xl text-[13px] leading-6 text-muted-foreground/90">
            这里决定整条生产线的处理顺序、拆分方式和容错策略。把它理解成“这次书稿项目怎么排流水线”。
          </CardDescription>
        </div>
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {queueSummaryCards.map((card) => (
            <div key={card.label} className="story-stat py-3">
              <div className="story-stat-label">{card.label}</div>
              <div className="story-stat-value text-[1.05rem]">{card.value}</div>
              <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{card.hint}</div>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">先定流程模式</Badge>
          <Badge variant="outline">再定逐页分组</Badge>
          <Badge variant="outline">最后再调并发和重试</Badge>
        </div>

        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="space-y-1">
            <Label className="text-sm">流程模式</Label>
            <p className="text-xs text-muted-foreground">
              逐页分析模式会走“逐页分析 → 分块综合 → 整书综合”；直综合写作会走“逐页分析 → 整书综合 → 写作前统稿 → 章节写作”，中间不再做分块综合。
            </p>
          </div>
          <Tabs
            value={config.workflowMode}
            onValueChange={(value) => onUpdate({ workflowMode: value as OrchestratorConfig['workflowMode'] })}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="page-analysis" disabled={disabled}>
                {WORKFLOW_MODE_LABELS['page-analysis']}
              </TabsTrigger>
              <TabsTrigger value="split-draft" disabled={disabled}>
                {WORKFLOW_MODE_LABELS['split-draft']}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-sm">写作后全书润色</Label>
              <p className="text-xs text-muted-foreground">
                正文全部完成后，再跑一遍全书统一润色，修顺称呼、衔接、节奏和整体文风。
              </p>
            </div>
            <Switch
              checked={config.enableFinalPolish}
              onCheckedChange={(checked) => onUpdate({ enableFinalPolish: checked })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-sm">章节写作附带场景图</Label>
              <p className="text-xs text-muted-foreground">
                关闭后，章节写作只发送结构化文本、台词台账和写作前统稿，不再附带当前场景图片。这样通常更稳，能减少空回和上下文过大。
              </p>
            </div>
            <Switch
              checked={config.includeSectionImages}
              onCheckedChange={(checked) => onUpdate({ includeSectionImages: checked })}
              disabled={disabled}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            当前：{config.includeSectionImages ? '带图写作' : '纯文本写作（默认）'}
          </p>
        </div>

        {isSplitDraftMode ? (
          <>
            <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">章节默认分段数（直综合写作）</Label>
                  <p className="text-xs text-muted-foreground">
                    决定整书综合后默认拆成几部分进入章节写作。`0` 表示自动按每 10 页一章估算，默认值为 `8`。
                  </p>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={500}
                    step={1}
                    value={config.splitPartCount}
                    onChange={(event) => handleSplitPartCountChange(Number(event.target.value))}
                    disabled={disabled}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">0 = 自动（每 10 页一章）</span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                  {config.splitPartCount === 0 ? '自动（每 10 页一章）' : `${config.splitPartCount} 段`}
                </span>
              </div>
              <Slider
                value={[config.splitPartCount]}
                onValueChange={(value) => handleSplitPartCountChange(Array.isArray(value) ? value[0] : value)}
                min={0}
                max={500}
                step={1}
                disabled={disabled}
              />
            </div>

            <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">每组图片数（逐页分析）</Label>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                  {config.chunkSize === 0 ? '自动（自适应）' : config.chunkSize}
                </span>
              </div>
              <Slider
                value={[config.chunkSize]}
                onValueChange={(value) => onUpdate({ chunkSize: Array.isArray(value) ? value[0] : value })}
                min={0}
                max={50}
                step={1}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                这个模式同样先做逐页分析，`0` 表示按当前视觉模型自动选择更稳的分组大小。多图识别通常建议保持在 `2-4` 张，然后直接进入整书综合，不再经过分块综合。
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">每组图片数（逐页分析）</Label>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                  {config.chunkSize === 0 ? '自动（自适应）' : config.chunkSize}
                </span>
              </div>
              <Slider
                value={[config.chunkSize]}
                onValueChange={(value) => onUpdate({ chunkSize: Array.isArray(value) ? value[0] : value })}
                min={0}
                max={50}
                step={1}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                控制逐页分析阶段每次发给 AI 的图片数量。`0` 现在表示按当前视觉模型自动选择更稳的分组大小，而不是把整批图片并成一组。多图识别通常建议保持在 `2-4` 张。
              </p>
            </div>

            <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">分块综合数量</Label>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                  {config.synthesisChunkCount}
                </span>
              </div>
              <Slider
                value={[config.synthesisChunkCount]}
                onValueChange={(value) => onUpdate({ synthesisChunkCount: Array.isArray(value) ? value[0] : value })}
                min={1}
                max={32}
                step={1}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                控制后续“分块综合”会把整书切成多少块。页数不足时会自动缩到总页数。
              </p>
            </div>
          </>
        )}

        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">并发请求数</Label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {config.maxConcurrency}
            </span>
          </div>
          <Slider
            value={[config.maxConcurrency]}
            onValueChange={(value) => onUpdate({ maxConcurrency: Array.isArray(value) ? value[0] : value })}
            min={1}
            max={8}
            step={1}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            同时处理的图片预处理与请求数量。通常 `2-4` 更稳，过高可能更容易撞到限流。
          </p>
        </div>

        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">最大重试次数</Label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {config.maxRetries}
            </span>
          </div>
          <Slider
            value={[config.maxRetries]}
            onValueChange={(value) => onUpdate({ maxRetries: Array.isArray(value) ? value[0] : value })}
            min={0}
            max={5}
            step={1}
            disabled={disabled}
          />
        </div>

        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">重试间隔 (ms)</Label>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {config.retryDelay}
            </span>
          </div>
          <Slider
            value={[config.retryDelay]}
            onValueChange={(value) => onUpdate({ retryDelay: Array.isArray(value) ? value[0] : value })}
            min={500}
            max={10000}
            step={500}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
