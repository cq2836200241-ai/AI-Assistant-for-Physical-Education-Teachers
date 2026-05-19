import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createGameItemFromForm,
  EMPTY_CREATE_GAME_FORM,
  type CreateGameFormState,
  type GameItem,
} from '../../types/gameItem';

const groupSizeOptions = ['小组课(12-20人)', '中等班额(25-35人)', '标准行政班(40-50人)', '超大班额(50人以上)'];
const spaceTypeOptions = ['篮球场', '标准操场/田径场', '室内体育馆', '排球场', '小型空地'];
const equipmentOptions = ['无器材', '常规器材', '球类充足', '标志物充足', '器材受限'];
const intensityOptions = ['低', '中', '中高', '高'];

function FieldLabel({ children, hint }: { children: string; hint?: string }) {
  return (
    <span className="mb-1.5 block text-xs font-black text-slate-600">
      {children}
      <span className="ml-1 font-semibold text-slate-400">（选填）</span>
      {hint && <span className="mt-0.5 block text-[11px] font-medium text-slate-400">{hint}</span>}
    </span>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface CreateGameDialogProps {
  onCreate: (game: GameItem) => void;
}

export function CreateGameDialog({ onCreate }: CreateGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateGameFormState>(EMPTY_CREATE_GAME_FORM);

  const update = <K extends keyof CreateGameFormState>(key: K, value: CreateGameFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = () => {
    const game = createGameItemFromForm(form);
    onCreate(game);
    setForm(EMPTY_CREATE_GAME_FORM);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-9 shrink-0 gap-1.5 rounded-lg bg-primary-600 text-xs font-black text-white hover:bg-primary-700">
            <Plus className="h-4 w-4" />
            创建游戏
          </Button>
        }
      />
      <DialogContent className="flex max-h-[min(92vh,880px)] w-[min(96vw,920px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b border-slate-200 px-5 py-4">
          <DialogTitle className="text-lg font-black text-slate-950">创建游戏</DialogTitle>
          <DialogDescription>
            按现有游戏库结构填写，所有字段均为选填。保存后将写入本地 JSON 库，并在「我的游戏库」中展示。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          <div className="space-y-4">
            <FormSection title="基本信息">
              <label className="sm:col-span-2">
                <FieldLabel>游戏名称</FieldLabel>
                <Input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="例如：接力闯关赛" className="border-slate-200 bg-white" />
              </label>
              <label className="sm:col-span-2">
                <FieldLabel>简介</FieldLabel>
                <Textarea
                  value={form.brief_description}
                  onChange={(e) => update('brief_description', e.target.value)}
                  placeholder="80 字以内的课堂简介"
                  className="min-h-16 resize-none border-slate-200 bg-white"
                />
              </label>
            </FormSection>

            <FormSection title="标签 tags">
              <label className="sm:col-span-2">
                <FieldLabel hint="每行一个">训练目标 targets</FieldLabel>
                <Textarea
                  value={form.targets}
                  onChange={(e) => update('targets', e.target.value)}
                  placeholder={'团队协作\n灵敏反应'}
                  className="min-h-20 resize-none border-slate-200 bg-white font-mono text-sm"
                />
              </label>
              <label>
                <FieldLabel>人数 group_size</FieldLabel>
                <Select value={form.group_size} onValueChange={(v) => update('group_size', v ?? '')}>
                  <SelectTrigger className="w-full border-slate-200 bg-white">
                    <SelectValue placeholder="选择人数规模" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupSizeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label>
                <FieldLabel>场地 space_type</FieldLabel>
                <Select value={form.space_type} onValueChange={(v) => update('space_type', v ?? '')}>
                  <SelectTrigger className="w-full border-slate-200 bg-white">
                    <SelectValue placeholder="选择场地" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaceTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label>
                <FieldLabel>器材 equipment_level</FieldLabel>
                <Select value={form.equipment_level} onValueChange={(v) => update('equipment_level', v ?? '')}>
                  <SelectTrigger className="w-full border-slate-200 bg-white">
                    <SelectValue placeholder="器材情况" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label>
                <FieldLabel hint="每行一个">适用年级 age_groups</FieldLabel>
                <Textarea
                  value={form.age_groups}
                  onChange={(e) => update('age_groups', e.target.value)}
                  placeholder={'小学中高段(3-6年级)\n初中'}
                  className="min-h-16 resize-none border-slate-200 bg-white font-mono text-sm"
                />
              </label>
            </FormSection>

            <FormSection title="指标 metrics">
              <label>
                <FieldLabel>预计时长（分钟）</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.estimated_duration_min}
                  onChange={(e) => update('estimated_duration_min', e.target.value)}
                  placeholder="12"
                  className="border-slate-200 bg-white"
                />
              </label>
              <label>
                <FieldLabel>强度 intensity_level</FieldLabel>
                <Select value={form.intensity_level} onValueChange={(v) => update('intensity_level', v ?? '')}>
                  <SelectTrigger className="w-full border-slate-200 bg-white">
                    <SelectValue placeholder="选择强度" />
                  </SelectTrigger>
                  <SelectContent>
                    {intensityOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="sm:col-span-2">
                <FieldLabel>心率区间 heart_rate_zone</FieldLabel>
                <Input
                  value={form.heart_rate_zone}
                  onChange={(e) => update('heart_rate_zone', e.target.value)}
                  placeholder="120-140"
                  className="border-slate-200 bg-white"
                />
              </label>
            </FormSection>

            <FormSection title="场地与器材 setup">
              <label className="sm:col-span-2">
                <FieldLabel hint="每行一项">器材清单 equipment_list</FieldLabel>
                <Textarea
                  value={form.equipment_list}
                  onChange={(e) => update('equipment_list', e.target.value)}
                  placeholder={'标志桶 x 8个\n软式排球 x 6个'}
                  className="min-h-20 resize-none border-slate-200 bg-white font-mono text-sm"
                />
              </label>
              <label className="sm:col-span-2">
                <FieldLabel>场地布置 layout_instructions</FieldLabel>
                <Textarea
                  value={form.layout_instructions}
                  onChange={(e) => update('layout_instructions', e.target.value)}
                  placeholder="描述分区、起点、安全距离等"
                  className="min-h-20 resize-none border-slate-200 bg-white"
                />
              </label>
            </FormSection>

            <FormSection title="玩法 execution">
              <label className="sm:col-span-2">
                <FieldLabel>组织策略 organization_strategy</FieldLabel>
                <Textarea
                  value={form.organization_strategy}
                  onChange={(e) => update('organization_strategy', e.target.value)}
                  placeholder="如何分组、轮换、保证运动密度"
                  className="min-h-16 resize-none border-slate-200 bg-white"
                />
              </label>
              <label className="sm:col-span-2">
                <FieldLabel hint="每行一步">规则步骤 rules_steps</FieldLabel>
                <Textarea
                  value={form.rules_steps}
                  onChange={(e) => update('rules_steps', e.target.value)}
                  placeholder={'全队站在垫子上，脚不沾地\n最后一名将垫子传至队首'}
                  className="min-h-24 resize-none border-slate-200 bg-white font-mono text-sm"
                />
              </label>
              <label className="sm:col-span-2">
                <FieldLabel hint="每行一条，建议带【风险】前缀">安全警示 safety_warnings</FieldLabel>
                <Textarea
                  value={form.safety_warnings}
                  onChange={(e) => update('safety_warnings', e.target.value)}
                  placeholder={'【防踩踏预警】统一口令后再移动\n【防滑预警】踩踏垫子中部'}
                  className="min-h-20 resize-none border-slate-200 bg-white font-mono text-sm"
                />
              </label>
            </FormSection>

            <FormSection title="教学调整 coaching_adjustments">
              <label>
                <FieldLabel>提高难度 progression_harder</FieldLabel>
                <Textarea
                  value={form.progression_harder}
                  onChange={(e) => update('progression_harder', e.target.value)}
                  className="min-h-16 resize-none border-slate-200 bg-white"
                />
              </label>
              <label>
                <FieldLabel>降低难度 regression_easier</FieldLabel>
                <Textarea
                  value={form.regression_easier}
                  onChange={(e) => update('regression_easier', e.target.value)}
                  className="min-h-16 resize-none border-slate-200 bg-white"
                />
              </label>
            </FormSection>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-5 py-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-200">
            取消
          </Button>
          <Button onClick={handleSubmit} className="bg-slate-900 font-black text-white hover:bg-slate-800">
            保存到游戏库
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
