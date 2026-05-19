export interface GameItem {
  id: string;
  title: string;
  brief_description: string;
  tags: {
    targets: string[];
    group_size: string[];
    space_type: string[];
    equipment_level: string;
    age_groups: string[];
  };
  metrics: {
    estimated_duration_min: number;
    intensity_level: string;
    heart_rate_zone: string;
  };
  setup: {
    equipment_list: string[];
    layout_instructions: string;
  };
  execution: {
    organization_strategy: string;
    rules_steps: string[];
    safety_warnings: string[];
  };
  coaching_adjustments: {
    progression_harder: string;
    regression_easier: string;
  };
}

export interface CreateGameFormState {
  title: string;
  brief_description: string;
  targets: string;
  group_size: string;
  space_type: string;
  equipment_level: string;
  age_groups: string;
  estimated_duration_min: string;
  intensity_level: string;
  heart_rate_zone: string;
  equipment_list: string;
  layout_instructions: string;
  organization_strategy: string;
  rules_steps: string;
  safety_warnings: string;
  progression_harder: string;
  regression_easier: string;
}

export const EMPTY_CREATE_GAME_FORM: CreateGameFormState = {
  title: '',
  brief_description: '',
  targets: '',
  group_size: '',
  space_type: '',
  equipment_level: '',
  age_groups: '',
  estimated_duration_min: '',
  intensity_level: '',
  heart_rate_zone: '',
  equipment_list: '',
  layout_instructions: '',
  organization_strategy: '',
  rules_steps: '',
  safety_warnings: '',
  progression_harder: '',
  regression_easier: '',
};

export function splitMultilineField(value: string): string[] {
  return value
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function createGameItemFromForm(form: CreateGameFormState): GameItem {
  const duration = form.estimated_duration_min.trim();
  const parsedDuration = duration ? Number(duration) : 0;

  return {
    id: `custom_${Date.now()}`,
    title: form.title.trim() || '未命名游戏',
    brief_description: form.brief_description.trim(),
    tags: {
      targets: splitMultilineField(form.targets),
      group_size: form.group_size.trim() ? [form.group_size.trim()] : [],
      space_type: form.space_type.trim() ? [form.space_type.trim()] : [],
      equipment_level: form.equipment_level.trim() || '—',
      age_groups: splitMultilineField(form.age_groups),
    },
    metrics: {
      estimated_duration_min: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0,
      intensity_level: form.intensity_level.trim() || '—',
      heart_rate_zone: form.heart_rate_zone.trim() || '—',
    },
    setup: {
      equipment_list: splitMultilineField(form.equipment_list),
      layout_instructions: form.layout_instructions.trim(),
    },
    execution: {
      organization_strategy: form.organization_strategy.trim(),
      rules_steps: splitMultilineField(form.rules_steps),
      safety_warnings: splitMultilineField(form.safety_warnings),
    },
    coaching_adjustments: {
      progression_harder: form.progression_harder.trim(),
      regression_easier: form.regression_easier.trim(),
    },
  };
}

export function isUserCreatedGameId(id: string) {
  return id.startsWith('saved_') || id.startsWith('custom_');
}
