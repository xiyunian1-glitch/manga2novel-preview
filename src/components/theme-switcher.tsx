'use client';

import { Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PREVIEW_THEME_OPTIONS, type PreviewTheme } from '@/lib/theme-presets';

interface ThemeSwitcherProps {
  onChange: (value: PreviewTheme) => void;
  value: PreviewTheme;
}

export function ThemeSwitcher({ onChange, value }: ThemeSwitcherProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PreviewTheme)}>
      <SelectTrigger
        size="sm"
        className="h-8 min-w-[136px] rounded-full bg-background/78 px-3 text-xs sm:h-9 sm:min-w-[156px] sm:text-sm"
        aria-label="切换界面主题"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent sideOffset={10} align="end">
        {PREVIEW_THEME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex flex-col">
              <span>{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
