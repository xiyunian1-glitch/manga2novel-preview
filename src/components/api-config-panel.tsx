'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Shield,
  Waypoints,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  APIConfig,
  APIProvider,
  ModelOption,
  RequestStage,
  StageAPIOverrideConfig,
  StageAPIOverrideMap,
} from '@/lib/types';
import {
  COMPATIBLE_MODELS,
  DEFAULT_STAGE_API_OVERRIDES,
  DEFAULT_STAGE_MODELS,
  GEMINI_MODELS,
  PROVIDER_DISPLAY_NAMES,
  REQUEST_STAGE_LABELS,
  REQUEST_STAGES,
  resolveProviderDisplayLabel,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface APIConfigPanelProps {
  config: APIConfig;
  onSave: (config: APIConfig) => Promise<void>;
  onFetchModels: (config: Pick<APIConfig, 'provider' | 'providerLabel' | 'apiKey' | 'baseUrl'>) => Promise<ModelOption[]>;
  disabled?: boolean;
}

function getVendorLabel(model: ModelOption): string {
  const idVendor = model.id.includes('/') ? model.id.split('/')[0] : '';
  if (idVendor.trim()) {
    return idVendor.charAt(0).toUpperCase() + idVendor.slice(1);
  }

  return model.name.split(':')[0]?.trim() || 'Other';
}

function getDefaultModelsForProvider(provider: APIProvider): ModelOption[] {
  return provider === 'gemini' ? GEMINI_MODELS : COMPATIBLE_MODELS;
}

function getBaseUrlPlaceholder(provider: APIProvider): string {
  return provider === 'gemini'
    ? 'https://generativelanguage.googleapis.com/v1beta'
    : 'https://api.openai.com/v1';
}

function getModelPlaceholder(provider: APIProvider): string {
  return provider === 'gemini'
    ? '例如：gemini-2.5-pro'
    : '例如：gpt-4.1 / claude-sonnet-4';
}

function getApiKeyPlaceholder(provider: APIProvider): string {
  return provider === 'gemini' ? 'AIza...' : 'sk-...';
}

function getProviderHint(provider: APIProvider): string {
  return provider === 'gemini'
    ? '使用 Google Gemini 原生接口，请填写 Gemini API Key 和模型名。'
    : '适用于 OpenAI / OpenRouter / OneAPI / 硅基流动等兼容 /chat/completions 的服务。';
}

function createShowStageKeysState(): Record<RequestStage, boolean> {
  return REQUEST_STAGES.reduce((result, stage) => {
    result[stage] = false;
    return result;
  }, {} as Record<RequestStage, boolean>);
}

function cloneStageAPIOverrides(overrides: StageAPIOverrideMap): StageAPIOverrideMap {
  return REQUEST_STAGES.reduce((result, stage) => {
    result[stage] = { ...overrides[stage] };
    return result;
  }, { ...DEFAULT_STAGE_API_OVERRIDES });
}

function hasStageModelChanges(
  left: APIConfig['stageModels'],
  right: APIConfig['stageModels']
): boolean {
  return REQUEST_STAGES.some((stage) => (left[stage] || '').trim() !== (right[stage] || '').trim());
}

function hasStageOverrideChanges(
  left: StageAPIOverrideMap,
  right: StageAPIOverrideMap
): boolean {
  return REQUEST_STAGES.some((stage) => {
    const leftItem = left[stage];
    const rightItem = right[stage];

    return leftItem.enabled !== rightItem.enabled
      || leftItem.provider !== rightItem.provider
      || (leftItem.providerLabel?.trim() || '') !== (rightItem.providerLabel?.trim() || '')
      || leftItem.apiKey.trim() !== rightItem.apiKey.trim()
      || leftItem.model.trim() !== rightItem.model.trim()
      || (leftItem.baseUrl?.trim() || '') !== (rightItem.baseUrl?.trim() || '');
  });
}

export function APIConfigPanel({
  config,
  onSave,
  onFetchModels,
  disabled,
}: APIConfigPanelProps) {
  const normalizedProviderLabel = (config.providerLabel || PROVIDER_DISPLAY_NAMES[config.provider]).trim();
  const [provider, setProvider] = useState<APIProvider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [providerLabel, setProviderLabel] = useState(config.providerLabel || PROVIDER_DISPLAY_NAMES[config.provider]);
  const [model, setModel] = useState(config.model || '');
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || '');
  const [stageModels, setStageModels] = useState<APIConfig['stageModels']>({ ...DEFAULT_STAGE_MODELS, ...config.stageModels });
  const [stageAPIOverrides, setStageAPIOverrides] = useState<StageAPIOverrideMap>(
    cloneStageAPIOverrides(config.stageAPIOverrides)
  );
  const [models, setModels] = useState<ModelOption[]>(getDefaultModelsForProvider(config.provider));
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showStageKeys, setShowStageKeys] = useState<Record<RequestStage, boolean>>(createShowStageKeysState);
  const [saving, setSaving] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const canFetchModels = !disabled && !fetchingModels && Boolean(apiKey.trim());
  const hasConfigChanges = (
    provider !== config.provider
    || apiKey.trim() !== config.apiKey
    || providerLabel.trim() !== normalizedProviderLabel
    || model.trim() !== config.model
    || baseUrl.trim() !== (config.baseUrl || '')
    || hasStageModelChanges(stageModels, config.stageModels)
    || hasStageOverrideChanges(stageAPIOverrides, config.stageAPIOverrides)
  );

  useEffect(() => {
    setProvider(config.provider);
    setApiKey(config.apiKey);
    setProviderLabel(config.providerLabel || PROVIDER_DISPLAY_NAMES[config.provider]);
    setModel(config.model || '');
    setBaseUrl(config.baseUrl || '');
    setStageModels({ ...DEFAULT_STAGE_MODELS, ...config.stageModels });
    setStageAPIOverrides(cloneStageAPIOverrides(config.stageAPIOverrides));
    setModels(getDefaultModelsForProvider(config.provider));
  }, [config]);

  const groupedModels = useMemo(() => {
    const groups = new Map<string, ModelOption[]>();
    models.forEach((item) => {
      const vendor = getVendorLabel(item);
      const current = groups.get(vendor) || [];
      current.push(item);
      groups.set(vendor, current);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right, 'zh-CN'));
  }, [models]);

  const selectedModel = useMemo(() => {
    const normalizedModel = model.trim();
    if (!normalizedModel) {
      return undefined;
    }

    for (const [, vendorModels] of groupedModels) {
      const found = vendorModels.find((item) => item.id === normalizedModel);
      if (found) {
        return found;
      }
    }

    return models.find((item) => item.id === normalizedModel);
  }, [groupedModels, model, models]);

  const stageModelOverrideCount = useMemo(() => {
    return REQUEST_STAGES.filter((stage) => Boolean(stageModels[stage]?.trim())).length;
  }, [stageModels]);

  const independentStageCount = useMemo(() => {
    return REQUEST_STAGES.filter((stage) => stageAPIOverrides[stage].enabled).length;
  }, [stageAPIOverrides]);

  const handleProviderChange = (nextProvider: APIProvider) => {
    const currentNormalizedLabel = providerLabel.trim();
    const currentDefaultLabel = PROVIDER_DISPLAY_NAMES[provider];
    setProvider(nextProvider);
    setModels(getDefaultModelsForProvider(nextProvider));
    setModelPickerOpen(false);

    if (!currentNormalizedLabel || currentNormalizedLabel === currentDefaultLabel) {
      setProviderLabel(PROVIDER_DISPLAY_NAMES[nextProvider]);
    }
  };

  const handleStageModelChange = (stage: RequestStage, value: string) => {
    setStageModels((prev) => ({
      ...prev,
      [stage]: value,
    }));
  };

  const handleStageOverrideChange = (stage: RequestStage, patch: Partial<StageAPIOverrideConfig>) => {
    setStageAPIOverrides((prev) => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        ...patch,
      },
    }));
  };

  const handleStageOverrideProviderChange = (stage: RequestStage, nextProvider: APIProvider) => {
    setStageAPIOverrides((prev) => {
      const current = prev[stage];
      const currentLabel = current.providerLabel?.trim() || '';
      const currentDefaultLabel = PROVIDER_DISPLAY_NAMES[current.provider];

      return {
        ...prev,
        [stage]: {
          ...current,
          provider: nextProvider,
          providerLabel: !currentLabel || currentLabel === currentDefaultLabel
            ? PROVIDER_DISPLAY_NAMES[nextProvider]
            : current.providerLabel,
        },
      };
    });
  };

  const handleToggleStageOverride = (stage: RequestStage, enabled: boolean) => {
    setStageAPIOverrides((prev) => {
      const current = prev[stage];
      if (!enabled) {
        return {
          ...prev,
          [stage]: {
            ...current,
            enabled: false,
          },
        };
      }

      return {
        ...prev,
        [stage]: {
          ...current,
          enabled: true,
          provider: current.provider || provider,
          providerLabel: current.providerLabel?.trim() || providerLabel.trim() || PROVIDER_DISPLAY_NAMES[provider],
          apiKey: current.apiKey || apiKey,
          model: current.model || stageModels[stage] || model,
          baseUrl: current.baseUrl || baseUrl,
        },
      };
    });
  };

  const copyDefaultToStage = (stage: RequestStage) => {
    setStageAPIOverrides((prev) => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        enabled: true,
        provider,
        providerLabel: providerLabel.trim() || PROVIDER_DISPLAY_NAMES[provider],
        apiKey,
        model: stageModels[stage] || model,
        baseUrl,
      },
    }));
    toast.success(`${REQUEST_STAGE_LABELS[stage]} 已复制默认接口配置，再改成第二个 API 就行。`);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await onSave({
        provider,
        providerLabel: providerLabel.trim() || PROVIDER_DISPLAY_NAMES[provider],
        apiKey: apiKey.trim(),
        model: model.trim(),
        baseUrl: baseUrl.trim(),
        stageModels: REQUEST_STAGES.reduce((result, stage) => {
          result[stage] = stageModels[stage]?.trim() || '';
          return result;
        }, { ...DEFAULT_STAGE_MODELS }),
        stageAPIOverrides: REQUEST_STAGES.reduce((result, stage) => {
          const override = stageAPIOverrides[stage];
          result[stage] = {
            enabled: override.enabled,
            provider: override.provider,
            providerLabel: resolveProviderDisplayLabel(override.provider, override.providerLabel),
            apiKey: override.apiKey.trim(),
            model: override.model.trim(),
            baseUrl: override.baseUrl?.trim() || '',
          };
          return result;
        }, { ...DEFAULT_STAGE_API_OVERRIDES }),
      });
      toast.success('API 配置已保存');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchModels = async () => {
    if (!apiKey.trim()) {
      toast.error('请先填写默认 API Key，再获取模型列表');
      return;
    }

    try {
      setFetchingModels(true);
      const nextModels = await onFetchModels({
        provider,
        providerLabel: providerLabel.trim() || PROVIDER_DISPLAY_NAMES[provider],
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
      });

      if (nextModels.length === 0) {
        toast.warning('没有获取到可用模型，已保留当前预置列表');
        return;
      }

      setModels(nextModels);
      toast.success(`已获取到 ${nextModels.length} 个模型`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取模型失败');
    } finally {
      setFetchingModels(false);
    }
  };

  return (
    <Card className="relative z-10">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          API 配置
          <Badge variant="outline" className="text-xs sm:ml-auto">
            <Shield className="mr-1 h-3 w-3" />
            AES-GCM 加密存储
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">默认接口</div>
            <p className="text-xs leading-5 text-muted-foreground">
              所有阶段默认都会走这里。只有你明确给某个阶段开启“独立接口”时，那个阶段才会单独切出去。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>接口协议</Label>
              <Select
                value={provider}
                onValueChange={(value) => {
                  if (value === 'compatible' || value === 'gemini') {
                    handleProviderChange(value);
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent sideOffset={10}>
                  <SelectItem value="compatible">兼容接口</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{getProviderHint(provider)}</p>
            </div>

            <div className="space-y-2">
              <Label>供应商名称</Label>
              <Input
                value={providerLabel}
                onChange={(event) => setProviderLabel(event.target.value)}
                placeholder={PROVIDER_DISPLAY_NAMES[provider]}
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                这里只用于界面展示、请求记录和错误提示，方便你区分不同平台。
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>默认模型</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleFetchModels}
                  disabled={!canFetchModels}
                >
                  <RefreshCw className={`mr-1 h-3.5 w-3.5 ${fetchingModels ? 'animate-spin' : ''}`} />
                  获取模型
                </Button>
                <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
                  <PopoverTrigger
                    render={(
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={modelPickerOpen}
                        className="h-7 px-2 font-normal"
                        disabled={disabled}
                      >
                        <span className="truncate text-left">
                          {selectedModel?.name || '从列表选择'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    )}
                  />
                  <PopoverContent className="z-[9999] w-[min(32rem,calc(100vw-2rem))] p-0" sideOffset={12} align="end">
                    <Command shouldFilter>
                      <CommandInput placeholder="搜索模型或厂商" />
                      <CommandList className="max-h-96">
                        <CommandEmpty>没有匹配的模型</CommandEmpty>
                        {groupedModels.map(([vendor, vendorModels], groupIndex) => (
                          <div key={vendor}>
                            {groupIndex > 0 ? <CommandSeparator /> : null}
                            <CommandGroup heading={vendor}>
                              {vendorModels.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${vendor} ${item.name} ${item.id}`}
                                  onSelect={() => {
                                    setModel(item.id);
                                    setModelPickerOpen(false);
                                  }}
                                  className="gap-3"
                                >
                                  <Check className={cn('h-4 w-4', model.trim() === item.id ? 'opacity-100' : 'opacity-0')} />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate" title={item.name}>{item.name}</div>
                                    <div className="truncate text-xs text-muted-foreground" title={item.id}>{item.id}</div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </div>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={getModelPlaceholder(provider)}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              如果某个阶段没有单独指定模型，就会沿用这里的默认模型。
            </p>
          </div>

          <div className="space-y-2">
            <Label>API URL / 代理地址</Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={getBaseUrlPlaceholder(provider)}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              可选。用于接入你自己的网关、代理或兼容 API 前缀。
            </p>
          </div>

          <div className="space-y-2">
            <Label>默认 API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={getApiKeyPlaceholder(provider)}
                disabled={disabled}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey((prev) => !prev)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/15 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <Label>分阶段接口覆盖</Label>
              <p className="text-xs text-muted-foreground">
                想用两个 API，就在这里把某些阶段切到第二套接口。比如“逐页分析”走视觉模型 A，“章节写作”走文本模型 B。
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedOptions((prev) => !prev)}
              disabled={disabled}
            >
              {showAdvancedOptions ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
              {showAdvancedOptions ? '收起' : '展开'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">阶段模型覆盖 {stageModelOverrideCount}</Badge>
            <Badge variant="outline">独立接口阶段 {independentStageCount}</Badge>
          </div>

          {!showAdvancedOptions ? (
            <div className="rounded-lg border border-dashed border-border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {independentStageCount > 0
                ? `当前有 ${independentStageCount} 个阶段使用独立接口。`
                : '当前所有阶段都沿用默认接口。'}
              {stageModelOverrideCount > 0
                ? ` 另外有 ${stageModelOverrideCount} 个阶段只覆盖了模型。`
                : ' 如果只是想换模型，不一定要开独立接口。'}
            </div>
          ) : (
            <Tabs defaultValue={REQUEST_STAGES[0]} className="flex-col gap-4">
              <TabsList
                variant="line"
                className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl border border-border bg-background/70 p-2"
              >
                {REQUEST_STAGES.map((stage) => (
                  <TabsTrigger
                    key={stage}
                    value={stage}
                    className="h-9 flex-none rounded-lg border border-border bg-background px-3 py-1.5 data-active:border-primary/30"
                  >
                    {REQUEST_STAGE_LABELS[stage]}
                    {stageAPIOverrides[stage].enabled ? (
                      <Badge variant="secondary" className="ml-1 text-[10px]">独立</Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              {REQUEST_STAGES.map((stage) => {
                const override = stageAPIOverrides[stage];

                return (
                  <TabsContent key={stage} value={stage} className="space-y-4">
                    <div className="rounded-xl border bg-background/80 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Waypoints className="h-4 w-4 text-muted-foreground" />
                            {REQUEST_STAGE_LABELS[stage]}
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {override.enabled
                              ? '这个阶段会优先使用下面这套独立接口配置。'
                              : '这个阶段当前沿用默认接口。你也可以只给它单独换一个模型。'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyDefaultToStage(stage)}
                            disabled={disabled}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            复制默认配置
                          </Button>
                        </div>
                      </div>

                      {!override.enabled ? (
                        <div className="mt-4 space-y-2">
                          <Label>阶段模型覆盖</Label>
                          <Input
                            value={stageModels[stage] || ''}
                            onChange={(event) => handleStageModelChange(stage, event.target.value)}
                            placeholder={`留空则沿用默认模型：${REQUEST_STAGE_LABELS[stage]}`}
                            disabled={disabled}
                          />
                          <p className="text-xs text-muted-foreground">
                            适合“同一个 API，只是不同阶段用不同模型”的情况。
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-xl border bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">独立接口</div>
                            <p className="text-xs leading-5 text-muted-foreground">
                              打开后，这个阶段可以使用另一套 provider / baseUrl / key / model。
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={override.enabled}
                              onCheckedChange={(checked) => handleToggleStageOverride(stage, checked)}
                              disabled={disabled}
                              id={`stage-override-${stage}`}
                            />
                            <Label htmlFor={`stage-override-${stage}`} className="cursor-pointer text-xs text-muted-foreground">
                              {override.enabled ? '已启用' : '未启用'}
                            </Label>
                          </div>
                        </div>

                        {override.enabled ? (
                          <div className="mt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>接口协议</Label>
                                <Select
                                  value={override.provider}
                                  onValueChange={(value) => {
                                    if (value === 'compatible' || value === 'gemini') {
                                      handleStageOverrideProviderChange(stage, value);
                                    }
                                  }}
                                  disabled={disabled}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent sideOffset={10}>
                                    <SelectItem value="compatible">兼容接口</SelectItem>
                                    <SelectItem value="gemini">Google Gemini</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>供应商名称</Label>
                                <Input
                                  value={override.providerLabel}
                                  onChange={(event) => handleStageOverrideChange(stage, { providerLabel: event.target.value })}
                                  placeholder={PROVIDER_DISPLAY_NAMES[override.provider]}
                                  disabled={disabled}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>独立接口模型</Label>
                              <Input
                                value={override.model}
                                onChange={(event) => handleStageOverrideChange(stage, { model: event.target.value })}
                                placeholder={getModelPlaceholder(override.provider)}
                                disabled={disabled}
                              />
                              <p className="text-xs text-muted-foreground">
                                这个模型优先级高于“阶段模型覆盖”。如果你要让这个阶段真正切到第二个 API，建议直接填这里。
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>API URL / 代理地址</Label>
                              <Input
                                value={override.baseUrl || ''}
                                onChange={(event) => handleStageOverrideChange(stage, { baseUrl: event.target.value })}
                                placeholder={getBaseUrlPlaceholder(override.provider)}
                                disabled={disabled}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>独立 API Key</Label>
                              <div className="relative">
                                <Input
                                  type={showStageKeys[stage] ? 'text' : 'password'}
                                  value={override.apiKey}
                                  onChange={(event) => handleStageOverrideChange(stage, { apiKey: event.target.value })}
                                  placeholder={getApiKeyPlaceholder(override.provider)}
                                  disabled={disabled}
                                />
                                <button
                                  type="button"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowStageKeys((prev) => ({ ...prev, [stage]: !prev[stage] }))}
                                >
                                  {showStageKeys[stage] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                留空会回退到默认 API Key；但如果你就是想分开用两个 API，这里就填第二个 Key。
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-lg border border-dashed border-border bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
                            没启用独立接口时，这个阶段仍然可以只用上面的“阶段模型覆盖”；如果要换第二套 API，再打开这里。
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-muted-foreground">
            建议用法：把“逐页分析”切到便宜的视觉模型接口，把“章节写作”切到你最强的长文模型接口。
          </div>
          <Button onClick={handleSave} disabled={disabled || saving || !hasConfigChanges}>
            {saving ? '保存中...' : '保存 API 配置'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
