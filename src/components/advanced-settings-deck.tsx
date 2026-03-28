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
  const panelId = 'advanced-settings-panel';

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
              把创作调性和流水线策略拆开处理，减少来回翻找。
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start bg-background/72"
            onClick={onToggleOpen}
            data-action="toggle-advanced-settings"
            aria-expanded={open}
            aria-controls={panelId}
          >
            {open ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
            {open ? '收起高级设置' : '展开高级设置'}
          </Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-2" role="tablist" aria-label="高级设置分区">
          {Object.values(sections).map((section) => {
            const isActive = selectedKey === section.key;

            return (
              <button
                key={section.key}
                type="button"
                id={`advanced-settings-tab-${section.key}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  'surface-interactive-card cursor-pointer rounded-[1.25rem] px-4 py-4 text-left transition focus-visible:ring-2 focus-visible:ring-primary/20',
                  isActive
                    ? 'surface-interactive-card-active border-primary/38 bg-primary/12'
                    : 'border-border/80 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/4 hover:shadow-[0_18px_38px_var(--panel-shadow)]'
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
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{section.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.summary.map((item) => (
                    <span key={item} className="rounded-full border border-border/70 bg-background/72 px-2.5 py-1 text-xs leading-5 text-foreground/84">
                      {item}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

      </CardHeader>

      {open ? (
        <CardContent
          id={panelId}
          role="tabpanel"
          aria-labelledby={`advanced-settings-tab-${selectedKey}`}
          className="border-t border-border/70 bg-background/24 pt-5"
        >
          {selectedKey === 'creative' ? creativePanel : pipelinePanel}
        </CardContent>
      ) : null}
    </Card>
  );
}
