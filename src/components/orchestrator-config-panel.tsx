'use client';

import { Settings } from 'lucide-react';
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
            这里决定流程顺序、拆分方式和容错策略。
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
          <div className="space-y-1">
            <Label className="text-sm">流程模式</Label>
            <p className="text-xs text-muted-foreground">
              逐页分析会保留分块综合；直综合写作会跳过分块综合，直接进入整书综合与章节写作。
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
                关闭后只发送结构化文本、对白台账和写作前统稿；通常更稳，也更省上下文。
              </p>
            </div>
            <Switch
              checked={config.includeSectionImages}
              onCheckedChange={(checked) => onUpdate({ includeSectionImages: checked })}
              disabled={disabled}
            />
          </div>
        </div>

        {isSplitDraftMode ? (
          <>
            <div className="workbench-panel-soft rounded-[1.2rem] border border-border/75 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">章节默认分段数（直综合写作）</Label>
                  <p className="text-xs text-muted-foreground">
                    决定整书综合后默认拆成几部分进入章节写作。`0` 表示自动按每 8 页一章估算。
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
                <span className="text-xs text-muted-foreground">0 = 自动（每 8 页一章）</span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                  {config.splitPartCount === 0 ? '自动（每 8 页一章）' : `${config.splitPartCount} 段`}
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
                `0` 表示按当前视觉模型自动分组。多图识别通常保持在 `2-4` 张更稳。
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
                控制逐页分析每次发给 AI 的图片数。`0` 表示按当前视觉模型自动分组；多图识别通常建议保持在 `2-4` 张。
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
                控制后续分块综合会把整书切成多少块；页数不足时会自动缩到总页数。
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
            同时处理的预处理和请求数量。通常 `2-4` 更稳，过高更容易撞到限流。
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
