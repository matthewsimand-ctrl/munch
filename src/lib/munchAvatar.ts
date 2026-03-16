import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as adventurerNeutral from '@dicebear/adventurer-neutral';
import * as bigEarsNeutral from '@dicebear/big-ears-neutral';
import * as bigSmile from '@dicebear/big-smile';
import * as notionists from '@dicebear/notionists';
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
  { id: 'adventurer', name: 'Adventurer', value: 'adventurer', description: 'Classic illustrated portraits' },
  { id: 'adventurerNeutral', name: 'Adventurer Neutral', value: 'adventurerNeutral', description: 'Neutral illustrated faces' },
  { id: 'bigEarsNeutral', name: 'Big Ears Neutral', value: 'bigEarsNeutral', description: 'Rounded neutral caricatures' },
  { id: 'bigSmile', name: 'Big Smile', value: 'bigSmile', description: 'Cheerful cartoon portraits' },
  { id: 'personas', name: 'Personas', value: 'personas', description: 'Modern editorial characters' },
  { id: 'notionists', name: 'Notionists', value: 'notionists', description: 'Playful illustrated faces' },
] as const;

export type MunchAvatarHairStyle = typeof MUNCH_AVATAR_HAIR_STYLES[number]['value'];
export type MunchAvatarGender = typeof MUNCH_AVATAR_GENDER_OPTIONS[number]['value'];
export type MunchAvatarStyle = typeof MUNCH_AVATAR_STYLE_OPTIONS[number]['value'];

export const AVATAR_STYLE_CAPABILITIES: Record<
  MunchAvatarStyle,
  { supportsHair: boolean; supportsHairColor: boolean; supportsSkinTone: boolean }
> = {
  adventurer: { supportsHair: true, supportsHairColor: true, supportsSkinTone: true },
  adventurerNeutral: { supportsHair: false, supportsHairColor: false, supportsSkinTone: false },
  bigEarsNeutral: { supportsHair: false, supportsHairColor: false, supportsSkinTone: false },
  bigSmile: { supportsHair: true, supportsHairColor: true, supportsSkinTone: true },
  personas: { supportsHair: true, supportsHairColor: true, supportsSkinTone: true },
  notionists: { supportsHair: false, supportsHairColor: true, supportsSkinTone: true },
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
    label: 'Adventurer',
    description: 'Classic illustrated portraits',
    seed: 'MunchMarigold',
    style: 'adventurer',
    gender: 'female',
    skinTone: '#f1c27d',
    hair: 'waves',
    hairColor: '#714e3b',
    backgroundColor: '#ffedd5',
  },
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
    label: 'Big Smile',
    description: 'Cheerful cartoon portraits',
    seed: 'MunchClover',
    style: 'bigSmile',
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
  {
    label: 'Thumbs',
    description: 'Playful illustrated faces',
    seed: 'MunchRiver',
    style: 'notionists',
    gender: 'male',
    skinTone: '#6c4326',
    hair: 'long',
    hairColor: '#cdd3de',
    backgroundColor: '#ffe4e6',
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
  adventurer,
  adventurerNeutral,
  bigEarsNeutral,
  bigSmile,
  personas,
  notionists,
} as const;

const ADVENTURER_HAIR: Record<MunchAvatarHairStyle, string> = {
  fade: 'short03',
  bob: 'long11',
  waves: 'long21',
  curls: 'long24',
  bun: 'long16',
  long: 'long26',
};

const BIG_SMILE_HAIR: Record<MunchAvatarHairStyle, string> = {
  fade: 'shortHair',
  bob: 'wavyBob',
  waves: 'straightHair',
  curls: 'curlyBob',
  bun: 'bunHair',
  long: 'braids',
};

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

const THUMBS_EYES: Record<MunchAvatarHairStyle, string> = {
  fade: 'variant1W12',
  bob: 'variant2W14',
  waves: 'variant3W16',
  curls: 'variant4W12',
  bun: 'variant5W14',
  long: 'variant2W16',
};

const NOTIONISTS_HAIR: Record<MunchAvatarHairStyle, string> = {
  fade: 'variant09',
  bob: 'variant24',
  waves: 'variant42',
  curls: 'variant47',
  bun: 'variant54',
  long: 'variant33',
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
  const avatarSvg = createAvatar(styleModule, options).toString();
  const avatarDataUri = svgToDataUri(avatarSvg);
  return wrapAvatarWithRing(avatarDataUri, ringColor);
}

export function buildMunchAvatarUrl(input: Partial<MunchAvatarConfig> = {}) {
  const resolved = createMunchAvatarConfig(input);
  const styleModule = STYLE_REGISTRY[resolved.style];

  if (resolved.style === 'adventurer') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      skinColor: [resolved.skinTone],
      hairColor: [resolved.hairColor],
      hair: [ADVENTURER_HAIR[resolved.hair]],
      eyebrows: [resolved.gender === 'female' ? 'variant02' : 'variant14'],
      eyes: [resolved.gender === 'female' ? 'variant06' : 'variant18'],
      mouth: [resolved.gender === 'female' ? 'variant24' : 'variant11'],
      features: [resolved.gender === 'female' ? 'blush' : 'mustache'],
      featuresProbability: resolved.gender === 'female' ? 35 : 20,
      earringsProbability: resolved.gender === 'female' ? 12 : 0,
      glassesProbability: 0,
    }, resolved.backgroundColor);
  }

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

  if (resolved.style === 'bigSmile') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      skinColor: [resolved.skinTone],
      hairColor: [resolved.hairColor],
      hair: [BIG_SMILE_HAIR[resolved.hair]],
      eyes: [resolved.gender === 'female' ? 'cheery' : 'normal'],
      mouth: [resolved.gender === 'female' ? 'teethSmile' : 'openedSmile'],
      accessories: [resolved.gender === 'female' ? 'glasses' : 'sunglasses'],
      accessoriesProbability: resolved.gender === 'male' && resolved.hair === 'fade' ? 14 : 0,
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

  if (resolved.style === 'notionists') {
    return createAvatarWithRing(styleModule, {
      seed: resolved.seed,
      base: ['variant01'],
      body: [resolved.gender === 'female' ? 'variant11' : 'variant17'],
      hair: [NOTIONISTS_HAIR[resolved.hair]],
      lips: [resolved.gender === 'female' ? 'variant24' : 'variant05'],
      beard: ['variant05'],
      beardProbability: resolved.gender === 'male' ? 20 : 0,
      nose: [resolved.gender === 'female' ? 'variant03' : 'variant12'],
      eyes: [resolved.gender === 'female' ? 'variant02' : 'variant05'],
      brows: [resolved.gender === 'female' ? 'variant03' : 'variant08'],
      glasses: ['variant05'],
      glassesProbability: resolved.hair === 'fade' ? 16 : 0,
      gesture: ['wavePointLongArms'],
      gestureProbability: 8,
      bodyIcon: ['saturn'],
      bodyIconProbability: 10,
    }, resolved.backgroundColor);
  }

  return createAvatarWithRing(styleModule, {
    seed: resolved.seed,
    eyes: [THUMBS_EYES[resolved.hair]],
    eyesColor: [resolved.hairColor],
    face: [resolved.gender === 'female' ? 'variant2' : 'variant5'],
    mouth: [resolved.gender === 'female' ? 'variant2' : 'variant5'],
    mouthColor: [resolved.hairColor],
    shape: ['default'],
    shapeColor: [resolved.skinTone],
    shapeRotation: [resolved.gender === 'female' ? 4 : -4],
    faceOffsetY: [resolved.gender === 'female' ? 2 : -2],
  }, resolved.backgroundColor);
}
