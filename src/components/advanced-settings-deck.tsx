'use client';

import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AdvancedSettingsSection {
  key: 'creative' | 'pipeline';
  kicker: string;
  title: string;
  description: string;
  summary: string[];
}

interface AdvancedSettingsDeckProps {
  creativePanel: ReactNode;
  onFocusChange: (key: 'creative' | 'pipeline') => void;
  onToggleOpen: () => void;
  open: boolean;
  pipelinePanel: ReactNode;
  sections: Record<'creative' | 'pipeline', AdvancedSettingsSection>;
  selectedKey: 'creative' | 'pipeline';
}

export function AdvancedSettingsDeck({
  creativePanel,
  onFocusChange,
  onToggleOpen,
  open,
  pipelinePanel,
  sections,
  selectedKey,
}: AdvancedSettingsDeckProps) {
  return (
    <Card className="workbench-panel overflow-hidden border-border/75">
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
            onClick={onToggleOpen}
            data-action="toggle-advanced-settings"
          >
            {open ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
            {open ? '收起高级设置' : '展开高级设置'}
          </Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {Object.values(sections).map((section) => {
            const isActive = selectedKey === section.key;

            return (
              <button
                key={section.key}
                type="button"
                className={cn(
                  'rounded-[1.25rem] border px-4 py-4 text-left transition',
                  isActive
                    ? 'border-primary/25 bg-primary/7 shadow-[0_18px_40px_rgba(37,71,184,0.1)]'
                    : 'border-border/75 workbench-panel-soft hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/72'
                )}
                onClick={() => onFocusChange(section.key)}
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

      </CardHeader>

      {open ? (
        <CardContent className="border-t border-border/70 bg-background/24 pt-5">
          {selectedKey === 'creative' ? creativePanel : pipelinePanel}
        </CardContent>
      ) : null}
    </Card>
  );
}
