import { createAvatar } from '@dicebear/core';
import * as adventurerNeutral from '@dicebear/adventurer-neutral';
import * as bigEarsNeutral from '@dicebear/big-ears-neutral';
import * as bottts from '@dicebear/bottts';
import * as croodlesNeutral from '@dicebear/croodles-neutral';
import * as personas from '@dicebear/personas';

export const MUNCH_AVATAR_SKIN_TONES = [
  { name: 'Porcelain', color: '#f8d8c0' },
  { name: 'Warm', color: '#f1c27d' },
  { name: 'Golden', color: '#e0ac69' },
  { name: 'Caramel', color: '#c68642' },
  { name: 'Chestnut', color: '#8d5524' },
  { name: 'Espresso', color: '#6c4326' },
] as const;

export const MUNCH_AVATAR_HAIR_COLORS = [
  { name: 'Raven', color: '#2c222b' },
  { name: 'Espresso', color: '#4a312c' },
  { name: 'Brown', color: '#714e3b' },
  { name: 'Auburn', color: '#a14d39' },
  { name: 'Honey', color: '#d79b2c' },
  { name: 'Silver', color: '#cdd3de' },
] as const;

export const MUNCH_AVATAR_BACKGROUND_COLORS = [
  { name: 'Peach', color: '#ffedd5' },
  { name: 'Butter', color: '#fef3c7' },
  { name: 'Sky', color: '#dbeafe' },
  { name: 'Mint', color: '#dcfce7' },
  { name: 'Rose', color: '#ffe4e6' },
  { name: 'Lilac', color: '#ede9fe' },
] as const;

export const MUNCH_AVATAR_HAIR_STYLES = [
  { id: 'fade', name: 'Fade', value: 'fade' },
  { id: 'bob', name: 'Bob', value: 'bob' },
  { id: 'waves', name: 'Waves', value: 'waves' },
  { id: 'curls', name: 'Curls', value: 'curls' },
  { id: 'bun', name: 'Bun', value: 'bun' },
  { id: 'long', name: 'Long', value: 'long' },
] as const;

export const MUNCH_AVATAR_GENDER_OPTIONS = [
  { id: 'female', name: 'Female', value: 'female', description: 'Softer face and styling' },
  { id: 'male', name: 'Male', value: 'male', description: 'Sharper face and styling' },
] as const;

export const MUNCH_AVATAR_STYLE_OPTIONS = [
  { id: 'adventurerNeutral', name: 'Adventurer Neutral', value: 'adventurerNeutral', description: 'Neutral illustrated faces' },
  { id: 'bigEarsNeutral', name: 'Big Ears Neutral', value: 'bigEarsNeutral', description: 'Rounded neutral caricatures' },
  { id: 'croodlesNeutral', name: 'Croodles Neutral', value: 'croodlesNeutral', description: 'Hand-drawn doodle portraits' },
  { id: 'bottts', name: 'Bottts', value: 'bottts', description: 'Friendly robot characters' },
  { id: 'personas', name: 'Personas', value: 'personas', description: 'Modern editorial characters' },
] as const;

export type MunchAvatarHairStyle = typeof MUNCH_AVATAR_HAIR_STYLES[number]['value'];
export type MunchAvatarGender = typeof MUNCH_AVATAR_GENDER_OPTIONS[number]['value'];
export type MunchAvatarStyle = typeof MUNCH_AVATAR_STYLE_OPTIONS[number]['value'];

export const AVATAR_STYLE_CAPABILITIES: Record<
  MunchAvatarStyle,
  { supportsHair: boolean; supportsHairColor: boolean; supportsSkinTone: boolean }
> = {
  adventurerNeutral: { supportsHair: false, supportsHairColor: false, supportsSkinTone: false },
  bigEarsNeutral: { supportsHair: false, supportsHairColor: false, supportsSkinTone: false },
  croodlesNeutral: { supportsHair: false, supportsHairColor: false, supportsSkinTone: false },
  bottts: { supportsHair: false, supportsHairColor: false, supportsSkinTone: false },
  personas: { supportsHair: true, supportsHairColor: true, supportsSkinTone: true },
};

export interface MunchAvatarConfig {
  seed: string;
  style: MunchAvatarStyle;
  gender: MunchAvatarGender;
  skinTone: string;
  hair: MunchAvatarHairStyle;
  hairColor: string;
  backgroundColor: string;
}

export const MUNCH_AVATAR_STARTERS = [
  {
    label: 'Adventurer Neutral',
    description: 'Neutral illustrated faces',
    seed: 'MunchTheo',
    style: 'adventurerNeutral',
    gender: 'male',
    skinTone: '#e0ac69',
    hair: 'fade',
    hairColor: '#2c222b',
    backgroundColor: '#dbeafe',
  },
  {
    label: 'Croodles Neutral',
    description: 'Hand-drawn doodle portraits',
    seed: 'MunchClover',
    style: 'croodlesNeutral',
    gender: 'female',
    skinTone: '#c68642',
    hair: 'curls',
    hairColor: '#2c222b',
    backgroundColor: '#dcfce7',
  },
  {
    label: 'Big Ears Neutral',
    description: 'Rounded neutral caricatures',
    seed: 'MunchMilo',
    style: 'bigEarsNeutral',
    gender: 'male',
    skinTone: '#8d5524',
    hair: 'bun',
    hairColor: '#4a312c',
    backgroundColor: '#fef3c7',
  },
  {
    label: 'Bottts',
    description: 'Friendly robot characters',
    seed: 'MunchRiver',
    style: 'bottts',
    gender: 'male',
    skinTone: '#6c4326',
    hair: 'long',
    hairColor: '#cdd3de',
    backgroundColor: '#ffe4e6',
  },
  {
    label: 'Personas',
    description: 'Modern editorial characters',
    seed: 'MunchNova',
    style: 'personas',
    gender: 'female',
    skinTone: '#f8d8c0',
    hair: 'bob',
    hairColor: '#a14d39',
    backgroundColor: '#ede9fe',
  },
] as const satisfies readonly (MunchAvatarConfig & {
  label: string;
  description: string;
})[];

export type MunchAvatarStarter = typeof MUNCH_AVATAR_STARTERS[number];

export const MUNCH_AVATAR_DEFAULT_CONFIG: MunchAvatarConfig = {
  seed: MUNCH_AVATAR_STARTERS[0].seed,
  style: MUNCH_AVATAR_STARTERS[0].style,
  gender: MUNCH_AVATAR_STARTERS[0].gender,
  skinTone: MUNCH_AVATAR_STARTERS[0].skinTone,
  hair: MUNCH_AVATAR_STARTERS[0].hair,
  hairColor: MUNCH_AVATAR_STARTERS[0].hairColor,
  backgroundColor: MUNCH_AVATAR_STARTERS[0].backgroundColor,
};

export function getDefaultHairForGender(gender: MunchAvatarGender) {
  return gender === 'male' ? 'fade' : 'waves';
}

export function createMunchAvatarConfig(overrides: Partial<MunchAvatarConfig> = {}): MunchAvatarConfig {
  const base = {
    ...MUNCH_AVATAR_DEFAULT_CONFIG,
    ...overrides,
  };

  return {
    ...base,
    hair: base.hair ?? getDefaultHairForGender(base.gender),
  };
}

const STYLE_REGISTRY = {
  adventurerNeutral,
  bigEarsNeutral,
  croodlesNeutral,
  bottts,
  personas,
} as const;

const PERSONAS_HAIR: Record<MunchAvatarHairStyle, string> = {
  fade: 'fade',
  bob: 'bobCut',
  waves: 'curly',
  curls: 'curlyHighTop',
  bun: 'straightBun',
  long: 'extraLong',
};

const ADVENTURER_NEUTRAL_EYES: Record<MunchAvatarHairStyle, string> = {
  fade: 'variant18',
  bob: 'variant08',
  waves: 'variant12',
  curls: 'variant20',
  bun: 'variant06',
  long: 'variant24',
};

const BIG_EARS_EYES: Record<MunchAvatarHairStyle, string> = {
  fade: 'variant06',
  bob: 'variant14',
  waves: 'variant22',
  curls: 'variant30',
  bun: 'variant10',
  long: 'variant26',
};

const BIG_EARS_MOUTHS: Record<MunchAvatarGender, Record<MunchAvatarHairStyle, string>> = {
  female: {
    fade: 'variant0302',
    bob: 'variant0404',
    waves: 'variant0504',
    curls: 'variant0605',
    bun: 'variant0405',
    long: 'variant0705',
  },
  male: {
    fade: 'variant0201',
    bob: 'variant0304',
    waves: 'variant0401',
    curls: 'variant0501',
    bun: 'variant0602',
    long: 'variant0702',
  },
};

const CLOTHING_COLORS = {
  female: '#f97316',
  male: '#2563eb',
} as const;

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function wrapAvatarWithRing(avatarDataUri: string, ringColor: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <clipPath id="avatarClip">
          <circle cx="64" cy="64" r="44" />
        </clipPath>
      </defs>
      <circle cx="64" cy="64" r="54" fill="white" />
      <circle cx="64" cy="64" r="54" fill="none" stroke="${ringColor}" stroke-width="8" />
      <image href="${avatarDataUri}" x="20" y="20" width="88" height="88" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />
    </svg>
  `;

  return svgToDataUri(svg);
}

function createAvatarWithRing(
  styleModule: (typeof STYLE_REGISTRY)[MunchAvatarStyle],
  options: Record<string, unknown>,
  ringColor: string,
) {
  const avatarSvg = createAvatar(styleModule as any, options).toString();
  const avatarDataUri = svgToDataUri(avatarSvg);
  return wrapAvatarWithRing(avatarDataUri, ringColor);
}

export function buildMunchAvatarUrl(input: Partial<MunchAvatarConfig> = {}) {
  const resolved = createMunchAvatarConfig(input);
  const styleModule = STYLE_REGISTRY[resolved.style];

  if (resolved.style === 'adventurerNeutral') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      eyebrows: [resolved.gender === 'female' ? 'variant03' : 'variant14'],
      eyes: [ADVENTURER_NEUTRAL_EYES[resolved.hair]],
      mouth: [resolved.gender === 'female' ? 'variant24' : 'variant13'],
      glasses: [resolved.gender === 'female' ? 'variant05' : 'variant03'],
      glassesProbability: resolved.gender === 'male' && resolved.hair === 'fade' ? 12 : 0,
    }, resolved.backgroundColor);
  }

  if (resolved.style === 'bigEarsNeutral') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      cheek: [resolved.gender === 'female' ? 'variant02' : 'variant05'],
      cheekProbability: resolved.gender === 'female' ? 100 : 24,
      eyes: [BIG_EARS_EYES[resolved.hair]],
      mouth: [BIG_EARS_MOUTHS[resolved.gender][resolved.hair]],
      nose: [resolved.gender === 'female' ? 'variant03' : 'variant10'],
    }, resolved.backgroundColor);
  }

  if (resolved.style === 'croodlesNeutral') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      mood: [resolved.gender === 'female' ? 'happy' : 'hopeful'],
      face: [resolved.gender === 'female' ? 'variant01' : 'variant02'],
    }, resolved.backgroundColor);
  }

  if (resolved.style === 'bottts') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      colors: [resolved.hairColor, resolved.skinTone, '#f97316', '#fdba74'],
      eyes: [resolved.gender === 'female' ? 'bulging' : 'round'],
      mouth: [resolved.gender === 'female' ? 'smile' : 'grill02'],
    }, resolved.backgroundColor);
  }

  if (resolved.style === 'personas') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      skinColor: [resolved.skinTone],
      hairColor: [resolved.hairColor],
      clothingColor: [resolved.gender === 'female' ? CLOTHING_COLORS.female : CLOTHING_COLORS.male],
      hair: [PERSONAS_HAIR[resolved.hair]],
      eyes: [resolved.gender === 'female' ? 'happy' : 'open'],
      mouth: [resolved.gender === 'female' ? 'bigSmile' : 'smirk'],
      nose: [resolved.gender === 'female' ? 'smallRound' : 'mediumRound'],
      body: [resolved.gender === 'female' ? 'rounded' : 'squared'],
      facialHair: ['goatee'],
      facialHairProbability: resolved.gender === 'male' ? 16 : 0,
    }, resolved.backgroundColor);
  }

  return createAvatarWithRing(styleModule, { seed: resolved.seed }, resolved.backgroundColor);
}
