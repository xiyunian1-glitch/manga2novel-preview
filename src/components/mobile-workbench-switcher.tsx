'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MobileWorkbenchSection {
  key: 'config' | 'material' | 'progress' | 'advanced' | 'preview';
  label: string;
  title: string;
  summary: string;
  available: boolean;
}

interface MobileWorkbenchSwitcherProps {
  activeKey: MobileWorkbenchSection['key'];
  onSelect: (key: MobileWorkbenchSection['key']) => void;
  sections: MobileWorkbenchSection[];
}

export function MobileWorkbenchSwitcher({
  activeKey,
  onSelect,
  sections,
}: MobileWorkbenchSwitcherProps) {
  const activeSection = sections.find((section) => section.key === activeKey);
  const compactSections = sections.filter((section) => section.available || section.key !== 'preview').slice(0, 4);
  const previewSection = sections.find((section) => section.key === 'preview' && section.available);
  const getTabId = (key: MobileWorkbenchSection['key']) => `mobile-workbench-tab-${key}`;
  const getPanelId = (key: MobileWorkbenchSection['key']) => `mobile-workbench-panel-${key}`;

  return (
    <Card className="workbench-panel border-border/75">
      <CardContent className="space-y-3 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-[0.12em] text-muted-foreground">MOBILE WORKBENCH</div>
            <div className="mt-1 font-serif text-[1.08rem] font-semibold text-foreground">
              {activeSection?.title}
            </div>
          </div>
          <Badge variant="outline" className="hidden min-[420px]:inline-flex">按区域切换</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:hidden" role="tablist" aria-label="移动端工作台分区">
          {compactSections.map((section) => {
            const isActive = activeKey === section.key;

            return (
              <button
                key={`compact-${section.key}`}
                type="button"
                id={getTabId(section.key)}
                role="tab"
                aria-selected={isActive}
                aria-controls={getPanelId(section.key)}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  'surface-interactive-card cursor-pointer rounded-[0.95rem] px-3 py-2.5 text-left transition focus-visible:ring-2 focus-visible:ring-primary/20',
                  isActive
                    ? 'surface-interactive-card-active border-primary/38 bg-primary/12'
                    : 'border-border/80 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/4 hover:shadow-[0_18px_34px_var(--panel-shadow)]',
                  !section.available && 'opacity-45'
                )}
                onClick={() => {
                  if (!section.available) {
                    return;
                  }
                  onSelect(section.key);
                }}
                disabled={!section.available}
              >
                <div className="text-[11px] tracking-[0.12em] text-muted-foreground">{section.label}</div>
                <div className="mt-1 text-sm font-medium text-foreground">{section.title}</div>
              </button>
            );
          })}
          {previewSection ? (
            <button
              type="button"
              id={getTabId('preview')}
              role="tab"
              aria-selected={activeKey === 'preview'}
              aria-controls={getPanelId('preview')}
              tabIndex={activeKey === 'preview' ? 0 : -1}
              className={cn(
                'surface-interactive-card col-span-2 cursor-pointer rounded-[0.95rem] px-3 py-2.5 text-left transition focus-visible:ring-2 focus-visible:ring-primary/20',
                activeKey === 'preview'
                  ? 'surface-interactive-card-active border-primary/38 bg-primary/12'
                  : 'border-border/80 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/4 hover:shadow-[0_18px_34px_var(--panel-shadow)]'
              )}
              onClick={() => onSelect('preview')}
            >
              <div className="text-[11px] tracking-[0.12em] text-muted-foreground">书稿</div>
              <div className="mt-1 text-sm font-medium text-foreground">预览台</div>
            </button>
          ) : null}
        </div>

        <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex" role="tablist" aria-label="移动端工作台分区">
          {sections.map((section) => {
            const isActive = activeKey === section.key;

            return (
              <button
                key={section.key}
                type="button"
                id={getTabId(section.key)}
                role="tab"
                aria-selected={isActive}
                aria-controls={getPanelId(section.key)}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  'surface-interactive-card min-w-[132px] cursor-pointer rounded-[1rem] px-3 py-3 text-left transition focus-visible:ring-2 focus-visible:ring-primary/20',
                  isActive
                    ? 'surface-interactive-card-active border-primary/38 bg-primary/12'
                    : 'border-border/80 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/4 hover:shadow-[0_18px_34px_var(--panel-shadow)]',
                  !section.available && 'opacity-45'
                )}
                onClick={() => {
                  if (!section.available) {
                    return;
                  }
                  onSelect(section.key);
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
  );
}
