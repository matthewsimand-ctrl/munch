import { useMemo } from 'react';
import { Camera, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildMunchAvatarUrl,
  createMunchAvatarConfig,
  MUNCH_AVATAR_BACKGROUND_COLORS,
  MUNCH_AVATAR_STYLE_OPTIONS,
  type MunchAvatarConfig,
  type MunchAvatarStyle,
} from '@/lib/munchAvatar';

interface AvatarStudioProps {
  config: MunchAvatarConfig;
  onChange: (updates: Partial<MunchAvatarConfig>) => void;
  previewOverrideUrl?: string | null;
  onUploadClick?: () => void;
  uploading?: boolean;
  onClearUpload?: () => void;
  action?: React.ReactNode;
  className?: string;
}

const COLLECTION_PRESET_VARIANTS: Record<
  MunchAvatarStyle,
  Array<Partial<MunchAvatarConfig> & { label: string }>
> = {
  adventurer: [
    { label: 'Preset 1', seed: 'AdventurerA', gender: 'female', hair: 'waves', backgroundColor: '#ffedd5', skinTone: '#f1c27d', hairColor: '#714e3b' },
    { label: 'Preset 2', seed: 'AdventurerB', gender: 'male', hair: 'fade', backgroundColor: '#dbeafe', skinTone: '#e0ac69', hairColor: '#2c222b' },
    { label: 'Preset 3', seed: 'AdventurerC', gender: 'female', hair: 'bob', backgroundColor: '#ede9fe', skinTone: '#f8d8c0', hairColor: '#a14d39' },
    { label: 'Preset 4', seed: 'AdventurerD', gender: 'male', hair: 'long', backgroundColor: '#fef3c7', skinTone: '#8d5524', hairColor: '#4a312c' },
    { label: 'Preset 5', seed: 'AdventurerE', gender: 'female', hair: 'bun', backgroundColor: '#dcfce7', skinTone: '#c68642', hairColor: '#2c222b' },
    { label: 'Preset 6', seed: 'AdventurerF', gender: 'male', hair: 'curls', backgroundColor: '#ffe4e6', skinTone: '#6c4326', hairColor: '#cdd3de' },
  ],
  adventurerNeutral: [
    { label: 'Preset 1', seed: 'AdventurerNeutralA', gender: 'female', backgroundColor: '#ffedd5' },
    { label: 'Preset 2', seed: 'AdventurerNeutralB', gender: 'male', backgroundColor: '#dbeafe' },
    { label: 'Preset 3', seed: 'AdventurerNeutralC', gender: 'female', backgroundColor: '#ede9fe' },
    { label: 'Preset 4', seed: 'AdventurerNeutralD', gender: 'male', backgroundColor: '#fef3c7' },
    { label: 'Preset 5', seed: 'AdventurerNeutralE', gender: 'female', backgroundColor: '#dcfce7' },
    { label: 'Preset 6', seed: 'AdventurerNeutralF', gender: 'male', backgroundColor: '#ffe4e6' },
  ],
  bigEarsNeutral: [
    { label: 'Preset 1', seed: 'BigEarsNeutralA', gender: 'female', hair: 'fade', backgroundColor: '#ffedd5' },
    { label: 'Preset 2', seed: 'BigEarsNeutralB', gender: 'male', hair: 'bob', backgroundColor: '#dbeafe' },
    { label: 'Preset 3', seed: 'BigEarsNeutralC', gender: 'female', hair: 'waves', backgroundColor: '#ede9fe' },
    { label: 'Preset 4', seed: 'BigEarsNeutralD', gender: 'male', hair: 'curls', backgroundColor: '#fef3c7' },
    { label: 'Preset 5', seed: 'BigEarsNeutralE', gender: 'female', hair: 'bun', backgroundColor: '#dcfce7' },
    { label: 'Preset 6', seed: 'BigEarsNeutralF', gender: 'male', hair: 'long', backgroundColor: '#ffe4e6' },
  ],
  bigSmile: [
    { label: 'Preset 1', seed: 'BigSmileA', gender: 'female', hair: 'waves', backgroundColor: '#ffedd5', skinTone: '#f1c27d', hairColor: '#714e3b' },
    { label: 'Preset 2', seed: 'BigSmileB', gender: 'male', hair: 'fade', backgroundColor: '#dbeafe', skinTone: '#e0ac69', hairColor: '#2c222b' },
    { label: 'Preset 3', seed: 'BigSmileC', gender: 'female', hair: 'bob', backgroundColor: '#ede9fe', skinTone: '#f8d8c0', hairColor: '#a14d39' },
    { label: 'Preset 4', seed: 'BigSmileD', gender: 'female', hair: 'curls', backgroundColor: '#dcfce7', skinTone: '#c68642', hairColor: '#2c222b' },
    { label: 'Preset 5', seed: 'BigSmileE', gender: 'male', hair: 'bun', backgroundColor: '#fef3c7', skinTone: '#8d5524', hairColor: '#4a312c' },
    { label: 'Preset 6', seed: 'BigSmileF', gender: 'male', hair: 'long', backgroundColor: '#ffe4e6', skinTone: '#6c4326', hairColor: '#cdd3de' },
  ],
  personas: [
    { label: 'Preset 1', seed: 'PersonasA', gender: 'female', hair: 'bob', backgroundColor: '#ffedd5', skinTone: '#f8d8c0', hairColor: '#a14d39' },
    { label: 'Preset 2', seed: 'PersonasB', gender: 'male', hair: 'fade', backgroundColor: '#dbeafe', skinTone: '#e0ac69', hairColor: '#2c222b' },
    { label: 'Preset 3', seed: 'PersonasC', gender: 'female', hair: 'waves', backgroundColor: '#ede9fe', skinTone: '#f1c27d', hairColor: '#714e3b' },
    { label: 'Preset 4', seed: 'PersonasD', gender: 'male', hair: 'long', backgroundColor: '#fef3c7', skinTone: '#8d5524', hairColor: '#4a312c' },
    { label: 'Preset 5', seed: 'PersonasE', gender: 'female', hair: 'bun', backgroundColor: '#dcfce7', skinTone: '#c68642', hairColor: '#2c222b' },
    { label: 'Preset 6', seed: 'PersonasF', gender: 'male', hair: 'curls', backgroundColor: '#ffe4e6', skinTone: '#6c4326', hairColor: '#cdd3de' },
  ],
  thumbs: [
    { label: 'Preset 1', seed: 'ThumbsA', gender: 'female', hairColor: '#714e3b', skinTone: '#f1c27d', backgroundColor: '#ffedd5' },
    { label: 'Preset 2', seed: 'ThumbsB', gender: 'male', hairColor: '#2c222b', skinTone: '#e0ac69', backgroundColor: '#dbeafe' },
    { label: 'Preset 3', seed: 'ThumbsC', gender: 'female', hairColor: '#a14d39', skinTone: '#f8d8c0', backgroundColor: '#ede9fe' },
    { label: 'Preset 4', seed: 'ThumbsD', gender: 'male', hairColor: '#4a312c', skinTone: '#8d5524', backgroundColor: '#fef3c7' },
    { label: 'Preset 5', seed: 'ThumbsE', gender: 'female', hairColor: '#2c222b', skinTone: '#c68642', backgroundColor: '#dcfce7' },
    { label: 'Preset 6', seed: 'ThumbsF', gender: 'male', hairColor: '#cdd3de', skinTone: '#6c4326', backgroundColor: '#ffe4e6' },
  ],
};

function OptionCard({
  label,
  description,
  previewUrl,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  previewUrl: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-w-0 rounded-[1.5rem] border p-3 text-left transition-all',
        selected
          ? 'border-orange-500 bg-orange-50 shadow-[0_8px_24px_rgba(249,115,22,0.12)]'
          : 'border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50/40',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={previewUrl}
          alt={label}
          className="h-14 w-14 shrink-0 rounded-[1.1rem] border border-orange-100 bg-white object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-stone-800">{label}</p>
          {description ? (
            <p className="mt-1 text-[11px] leading-4 text-stone-500">{description}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SwatchGroup({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: readonly { name: string; color: string }[];
  onSelect: (color: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.color}
            type="button"
            onClick={() => onSelect(option.color)}
            className={cn(
              'flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all',
              value === option.color
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300',
            )}
          >
            <span
              className="h-6 w-6 shrink-0 rounded-full border border-white/80 shadow-sm"
              style={{ background: option.color }}
            />
            <span className="truncate text-sm font-medium">{option.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AvatarStudio({
  config,
  onChange,
  previewOverrideUrl,
  onUploadClick,
  uploading,
  onClearUpload,
  action,
  className,
}: AvatarStudioProps) {
  const livePreviewUrl = useMemo(() => previewOverrideUrl || buildMunchAvatarUrl(config), [config, previewOverrideUrl]);

  const stylePreviews = useMemo(
    () =>
      MUNCH_AVATAR_STYLE_OPTIONS.map((option) => ({
        ...option,
        previewUrl: buildMunchAvatarUrl({ ...config, style: option.value }),
      })),
    [config],
  );

  const collectionPresets = useMemo(
    () =>
      COLLECTION_PRESET_VARIANTS[config.style].map((preset) => {
        const presetConfig = createMunchAvatarConfig({
          ...config,
          ...preset,
          style: config.style,
          seed: preset.seed ?? `${config.style}-${preset.label}`,
        });
        return {
          ...preset,
          config: presetConfig,
          previewUrl: buildMunchAvatarUrl(presetConfig),
        };
      }),
    [config],
  );

  const selectedStyle = MUNCH_AVATAR_STYLE_OPTIONS.find((option) => option.value === config.style);

  return (
    <div className={cn('grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]', className)}>
      <div className="rounded-[2rem] border border-orange-100 bg-[linear-gradient(180deg,#fff7ed_0%,#fff1f2_55%,#ffffff_100%)] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">Live preview</p>
            <p className="mt-2 text-sm leading-5 text-stone-500">
              Pick one of the DiceBear collections, then tune the palette and presentation.
            </p>
          </div>
          <div className="rounded-full bg-white/90 p-2 text-orange-500 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 rounded-[1.8rem] border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="relative mx-auto w-fit">
            <div className="absolute inset-0 rounded-[1.75rem] bg-orange-100/60 blur-2xl" />
            <img
              src={livePreviewUrl}
              alt="Avatar preview"
              className="relative h-36 w-36 rounded-[1.7rem] border border-orange-100 bg-white object-cover shadow-md sm:h-40 sm:w-40"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[selectedStyle?.name]
              .filter(Boolean)
              .map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                >
                  {chip}
                </span>
              ))}
          </div>

          {onUploadClick ? (
            <button
              type="button"
              onClick={onUploadClick}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100"
              disabled={uploading}
            >
              <Camera className="h-4 w-4" />
              {uploading ? 'Uploading...' : previewOverrideUrl ? 'Replace photo' : 'Upload a photo'}
            </button>
          ) : null}

          {previewOverrideUrl && onClearUpload ? (
            <button
              type="button"
              onClick={onClearUpload}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-600"
            >
              <RotateCcw className="h-4 w-4" />
              Return to DiceBear builder
            </button>
          ) : null}

          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>

      <div className="space-y-3 pb-2">
        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-orange-500" />
            <p className="text-sm font-semibold text-stone-800">DiceBear collections</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {stylePreviews.map((option) => (
              <OptionCard
                key={option.value}
                label={option.name}
                description={option.description}
                previewUrl={option.previewUrl}
                selected={config.style === option.value}
                onClick={() => onChange({ style: option.value })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold text-stone-800">{selectedStyle?.name} presets</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Each DiceBear collection comes with a range of looks. Pick a preset, then customize from there.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {collectionPresets.map((preset) => (
              <OptionCard
                key={preset.config.seed}
                label={preset.label}
                previewUrl={preset.previewUrl}
                selected={config.seed === preset.config.seed && config.style === preset.config.style}
                onClick={() => onChange(preset.config)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold text-stone-800">Avatar outline</p>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            Pick the ring color that frames your avatar best.
          </p>
          <div className="mt-4 space-y-4">
            <SwatchGroup
              label="Outline color"
              value={config.backgroundColor}
              options={MUNCH_AVATAR_BACKGROUND_COLORS}
              onSelect={(backgroundColor) => onChange({ backgroundColor })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
