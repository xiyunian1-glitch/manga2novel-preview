'use client';

import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          队列配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border bg-muted/15 p-3">
          <div className="space-y-1">
            <Label className="text-sm">流程模式</Label>
            <p className="text-xs text-muted-foreground">
              逐页分析会先拆每页再综合；均分生成会把整套图片平均分段，分别生成，再合成最终正文。
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

        <div className="space-y-2 rounded-lg border bg-muted/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Label className="text-sm">全书统稿 / 润色</Label>
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

        {isSplitDraftMode ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">均分段数</Label>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                {config.splitPartCount}
              </span>
            </div>
            <Slider
              value={[config.splitPartCount]}
              onValueChange={(value) => onUpdate({ splitPartCount: Array.isArray(value) ? value[0] : value })}
              min={2}
              max={12}
              step={1}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              系统会把上传图片按顺序尽量平均切成这些部分，每部分单独生成草稿，最后再合成完整正文。
              还原原著优先时，建议把分段数调高一些；分得越粗，越容易被压成概述。
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
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

            <div className="space-y-2">
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

        <div className="space-y-2">
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

        <div className="space-y-2">
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

        <div className="space-y-2">
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
