export const DEFAULT_PREVIEW_THEME = 'studio';

export const PREVIEW_THEME_OPTIONS = [
  {
    value: 'studio',
    label: '经典蓝灰',
    description: '回到之前的清爽主站配色',
  },
  {
    value: 'paper',
    label: '编辑稿纸',
    description: '保留当前纸张感工作台氛围',
  },
  {
    value: 'ink',
    label: '夜墨工作台',
    description: '深色夜间主题，适合长时间调试',
  },
] as const;

export type PreviewTheme = (typeof PREVIEW_THEME_OPTIONS)[number]['value'];

export function isPreviewTheme(value: string | null | undefined): value is PreviewTheme {
  return PREVIEW_THEME_OPTIONS.some((option) => option.value === value);
}
