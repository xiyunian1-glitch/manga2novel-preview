export type APIProvider = 'compatible' | 'gemini';
export type RequestStage = Exclude<PipelineStage, 'idle'>;

export const REQUEST_STAGES: RequestStage[] = [
  'analyze-pages',
  'synthesize-chunks',
  'synthesize-story',
  'write-sections',
];

export const REQUEST_STAGE_LABELS: Record<RequestStage, string> = {
  'analyze-pages': '逐页分析',
  'synthesize-chunks': '分块综合',
  'synthesize-story': '整书综合',
  'write-sections': '章节写作',
};

export type StageModelConfig = Record<RequestStage, string>;

export interface StageAPIOverrideConfig {
  enabled: boolean;
  provider: APIProvider;
  providerLabel?: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export type StageAPIOverrideMap = Record<RequestStage, StageAPIOverrideConfig>;

export interface APIConfig {
  provider: APIProvider;
  providerLabel?: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  stageModels: StageModelConfig;
  stageAPIOverrides: StageAPIOverrideMap;
}

export interface CreativeSettings {
  presetId: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
}

export interface CreativePreset {
  id: string;
  name: string;
  prompt: string;
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  processedBase64?: string;
  processedMime?: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  originalSize: number;
  compressedSize?: number;
}

export type ChunkStatus = 'pending' | 'processing' | 'success' | 'error' | 'skipped';

export type PipelineStage =
  | 'idle'
  | 'analyze-pages'
  | 'synthesize-chunks'
  | 'synthesize-story'
  | 'write-sections';

export interface ImageChunk {
  index: number;
  images: ImageItem[];
  status: ChunkStatus;
  novelText?: string;
  plotSummary?: string;
  endingDetail?: string;
  error?: string;
  retryCount: number;
}

export interface CharacterCue {
  name: string;
  role: string;
  traits: string[];
  relationshipHints: string[];
  evidence: string[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
  speakerEvidence?: string;
  speakerConfidence?: 'high' | 'medium' | 'low';
}

export interface PageAnalysis {
  index: number;
  pageNumber: number;
  chunkIndex: number;
  analysisBatchIndex: number;
  imageName: string;
  status: ChunkStatus;
  summary?: string;
  location?: string;
  timeHint?: string;
  keyEvents: string[];
  characters: CharacterCue[];
  dialogue: DialogueLine[];
  narrationText: string[];
  visualText: string[];
  error?: string;
  retryCount: number;
}

export interface ChunkSynthesis {
  index: number;
  pageNumbers: number[];
  status: ChunkStatus;
  title?: string;
  summary?: string;
  keyDevelopments: string[];
  continuitySummary?: string;
  error?: string;
  retryCount: number;
}

export interface ScenePlan {
  sceneId: string;
  title: string;
  summary: string;
  chunkIndexes: number[];
}

export interface StorySynthesis {
  status: ChunkStatus;
  storyOverview: string;
  worldGuide: string;
  characterGuide: string;
  sceneOutline: ScenePlan[];
  writingConstraints: string[];
  error?: string;
  retryCount: number;
}

export interface NovelSection {
  index: number;
  title: string;
  chunkIndexes: number[];
  status: ChunkStatus;
  markdownBody?: string;
  continuitySummary?: string;
  error?: string;
  retryCount: number;
}

export interface MemoryState {
  globalSummary: string;
  previousEnding: string;
  completedChunks: number[];
}

export interface OrchestratorConfig {
  chunkSize: number;
  synthesisChunkCount: number;
  maxConcurrency: number;
  maxRetries: number;
  retryDelay: number;
  autoSkipOnError: boolean;
}

export interface AIResponse {
  novelText: string;
  plotSummary: string;
  endingDetail: string;
}

export interface LastAIRequestAttempt {
  sequence: number;
  model: string;
  sentAt: string;
  finishedAt?: string;
  maxOutputTokens?: number;
  outcome: 'success' | 'error';
  error?: string;
  nextAction?: string;
}

export interface LastAIRequest {
  provider: APIProvider;
  providerLabel?: string;
  model: string;
  baseUrl?: string;
  stage: PipelineStage;
  itemLabel: string;
  chunkIndex: number;
  imageCount: number;
  imageNames: string[];
  systemPrompt: string;
  userPrompt: string;
  sentAt: string;
  totalAttempts: number;
  status: 'running' | 'success' | 'error' | 'interrupted';
  firstFailureReason?: string;
  lastError?: string;
  attempts: LastAIRequestAttempt[];
}

export interface TaskState {
  status: 'idle' | 'preparing' | 'running' | 'paused' | 'completed' | 'error';
  currentStage: PipelineStage;
  chunks: ImageChunk[];
  pageAnalyses: PageAnalysis[];
  chunkSyntheses: ChunkSynthesis[];
  globalSynthesis: StorySynthesis;
  novelSections: NovelSection[];
  memory: MemoryState;
  config: OrchestratorConfig;
  creativeSettings: CreativeSettings;
  currentChunkIndex: number;
  fullNovel: string;
  lastAIRequest?: LastAIRequest;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  chunkSize: 1,
  synthesisChunkCount: 8,
  maxConcurrency: 3,
  maxRetries: 3,
  retryDelay: 2000,
  autoSkipOnError: false,
};

export const DEFAULT_STAGE_MODELS: StageModelConfig = {
  'analyze-pages': '',
  'synthesize-chunks': '',
  'synthesize-story': '',
  'write-sections': '',
};

export const DEFAULT_STAGE_API_OVERRIDES: StageAPIOverrideMap = {
  'analyze-pages': {
    enabled: false,
    provider: 'compatible',
    providerLabel: '',
    apiKey: '',
    model: '',
    baseUrl: '',
  },
  'synthesize-chunks': {
    enabled: false,
    provider: 'compatible',
    providerLabel: '',
    apiKey: '',
    model: '',
    baseUrl: '',
  },
  'synthesize-story': {
    enabled: false,
    provider: 'compatible',
    providerLabel: '',
    apiKey: '',
    model: '',
    baseUrl: '',
  },
  'write-sections': {
    enabled: false,
    provider: 'compatible',
    providerLabel: '',
    apiKey: '',
    model: '',
    baseUrl: '',
  },
};

export function resolveProviderDisplayLabel(provider: APIProvider, providerLabel?: string): string {
  return providerLabel?.trim() || PROVIDER_DISPLAY_NAMES[provider];
}

export function resolveStageModel(config: APIConfig, stage: RequestStage): string {
  const stageOverride = config.stageAPIOverrides[stage];
  const overrideModel = stageOverride.enabled ? stageOverride.model.trim() : '';
  const stageModel = config.stageModels[stage]?.trim() || '';
  const defaultModel = config.model.trim();
  const canUseDefaultModel = !stageOverride.enabled || stageOverride.provider === config.provider;

  return overrideModel || stageModel || (canUseDefaultModel ? defaultModel : '');
}

export function resolveStageAPIConfig(config: APIConfig, stage: RequestStage): APIConfig {
  const stageOverride = config.stageAPIOverrides[stage];
  const useStageOverride = stageOverride.enabled;
  const provider = useStageOverride ? stageOverride.provider : config.provider;
  const providerLabel = resolveProviderDisplayLabel(
    provider,
    useStageOverride ? stageOverride.providerLabel : config.providerLabel
  );
  const apiKey = useStageOverride
    ? (stageOverride.apiKey.trim() || config.apiKey.trim())
    : config.apiKey.trim();
  const model = resolveStageModel(config, stage);
  const baseUrl = useStageOverride ? stageOverride.baseUrl?.trim() || '' : config.baseUrl?.trim() || '';

  return {
    ...config,
    provider,
    providerLabel,
    apiKey,
    model,
    baseUrl,
  };
}

export function canResolveStageAccess(config: APIConfig): boolean {
  return REQUEST_STAGES.every((stage) => {
    const stageConfig = resolveStageAPIConfig(config, stage);
    return Boolean(stageConfig.apiKey.trim() && stageConfig.model.trim());
  });
}

export const DEFAULT_MEMORY_STATE: MemoryState = {
  globalSummary: '',
  previousEnding: '',
  completedChunks: [],
};

export const DEFAULT_STORY_SYNTHESIS: StorySynthesis = {
  status: 'pending',
  storyOverview: '',
  worldGuide: '',
  characterGuide: '',
  sceneOutline: [],
  writingConstraints: [],
  retryCount: 0,
};

export const DEFAULT_CREATIVE_SETTINGS: CreativeSettings = {
  presetId: 'professional-manga-novelist',
  systemPrompt: '',
  userPromptTemplate: '',
  temperature: 0.75,
};

export const DEFAULT_COMPATIBLE_BASE_URL = 'https://api.openai.com/v1';
export const LEGACY_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const COMPATIBLE_MODELS: ModelOption[] = [
  { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat' },
];

export const GEMINI_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

export const PROVIDER_DISPLAY_NAMES: Record<APIProvider, string> = {
  compatible: '自定义兼容接口',
  gemini: 'Google Gemini',
};
