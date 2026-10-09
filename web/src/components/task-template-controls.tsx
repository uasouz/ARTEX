"use client";

import * as React from "react";

import { LibraryIcon, PlusIcon, SaveIcon, Settings2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { AssetInterceptRulesEditor } from "@/components/asset-intercept-rules-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/i18n-context";
import type { AssetInterceptRuleInput, TaskCategory, TaskTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

const I18N = {
  en: {
    requiredFieldsErr: "Please fill in template name, description, and goal",
    templateCreated: "Template created successfully",
    templateUpdated: "Template updated successfully",
    saveFailed: "Save failed: ",
    templateDeleted: "Template deleted",
    deleteFailed: "Delete failed: ",
    saving: "Saving...",
    saveChanges: "Save Changes",
    createTemplate: "Create Template",
    sheetTitle: "Task Template Management",
    sheetDesc:
      "Templates save description, goal, category, and task-level interception/allow rules; changes do not affect existing tasks.",
    newTemplate: "New Template",
    noTemplates: "No templates",
    nameLabel: "Template Name",
    namePlaceholder: "e.g. External Web Penetration",
    descLabel: "Description",
    descPlaceholder: "Target scope and background context",
    goalLabel: "Goal",
    goalPlaceholder: "Objectives to achieve for the task",
    categoryLabel: "Task Category",
    uncategorized: "Uncategorized",
    categoryDesc: "Pre-fills this category when applying template (can be edited).",
    rulesLabel: "Task-Level Intercept / Allow Rules",
    rulesDesc: "Pre-fills task-level rules (applies only to the new task, not globally).",
    deleteTemplateBtn: "Delete Template",
    closeBtn: "Close",
    deleteAlertTitle: "Delete template '{name}'?",
    untitledTemplate: "Untitled Template",
    deleteAlertDesc: "Tasks already created from this template will not be affected.",
    cancel: "Cancel",
    deleting: "Deleting...",
    delete: "Delete",
    loadTemplatesFailed: "Failed to load templates: ",
    loadingTemplates: "Loading templates...",
    noTaskTemplates: "No task templates",
    searchTemplates: "Search and select task template",
    taskTemplateLabel: "Task Template",
    manageTemplatesBtn: "Manage Templates",
    saveAsTemplateBtn: "Save as Template",
    noMatchingTemplates: "No matching templates",
    templateAppliedHint: "Copies template description, goal, category, and rules without persistent linkage.",
    useTemplateAlertTitle: "Use template '{name}'?",
    useTemplateAlertDesc: "Current description and goal will be overwritten by template content.",
    overwriteAndUse: "Overwrite & Use",
  },
  pt: {
    requiredFieldsErr: "Preencha o nome, a descrição e o objetivo do modelo",
    templateCreated: "Modelo criado com sucesso",
    templateUpdated: "Modelo atualizado com sucesso",
    saveFailed: "Falha ao salvar: ",
    templateDeleted: "Modelo excluído",
    deleteFailed: "Falha ao excluir: ",
    saving: "Salvando...",
    saveChanges: "Salvar Alterações",
    createTemplate: "Criar Modelo",
    sheetTitle: "Gerenciamento de Modelos de Tarefas",
    sheetDesc:
      "Modelos salvam descrição, meta, categoria e regras de interceptação/permissão; alterações não afetam tarefas existentes.",
    newTemplate: "Novo Modelo",
    noTemplates: "Nenhum modelo",
    nameLabel: "Nome do Modelo",
    namePlaceholder: "ex: Teste de Intrusão Web Externo",
    descLabel: "Descrição",
    descPlaceholder: "Objeto de teste e contexto",
    goalLabel: "Meta",
    goalPlaceholder: "Objetivos a alcançar para a tarefa",
    categoryLabel: "Categoria da Tarefa",
    uncategorized: "Sem categoria",
    categoryDesc: "Pré-preenche esta categoria ao aplicar o modelo (pode ser alterada).",
    rulesLabel: "Regras de Interceptação / Permissão da Tarefa",
    rulesDesc: "Pré-preenche regras no nível da tarefa (aplica-se apenas à nova tarefa, não globalmente).",
    deleteTemplateBtn: "Excluir Modelo",
    closeBtn: "Fechar",
    deleteAlertTitle: "Excluir modelo '{name}'?",
    untitledTemplate: "Modelo Sem Nome",
    deleteAlertDesc: "Tarefas já criadas a partir deste modelo não serão afetadas.",
    cancel: "Cancelar",
    deleting: "Excluindo...",
    delete: "Excluir",
    loadTemplatesFailed: "Falha ao carregar modelos: ",
    loadingTemplates: "Carregando modelos...",
    noTaskTemplates: "Nenhum modelo de tarefa",
    searchTemplates: "Pesquisar e selecionar modelo de tarefa",
    taskTemplateLabel: "Modelo de Tarefa",
    manageTemplatesBtn: "Gerenciar Modelos",
    saveAsTemplateBtn: "Salvar como Modelo",
    noMatchingTemplates: "Nenhum modelo correspondente",
    templateAppliedHint: "Copia a descrição, meta, categoria e regras do modelo sem vínculo contínuo.",
    useTemplateAlertTitle: "Usar modelo '{name}'?",
    useTemplateAlertDesc: "A descrição e o objetivo atuais serão substituídos pelo conteúdo do modelo.",
    overwriteAndUse: "Substituir e Usar",
  },
  zh: {
    requiredFieldsErr: "请填写模板名称、描述和目标",
    templateCreated: "模板已创建",
    templateUpdated: "模板已更新",
    saveFailed: "保存失败：",
    templateDeleted: "模板已删除",
    deleteFailed: "删除失败：",
    saving: "保存中",
    saveChanges: "保存修改",
    createTemplate: "创建模板",
    sheetTitle: "任务模板管理",
    sheetDesc: "模板保存描述、目标、分类与任务级拦截/允许规则；修改不会影响已经创建的任务。",
    newTemplate: "新建模板",
    noTemplates: "暂无模板",
    nameLabel: "模板名称",
    namePlaceholder: "例如：外部 Web 渗透",
    descLabel: "描述",
    descPlaceholder: "测试对象与背景",
    goalLabel: "目标",
    goalPlaceholder: "任务需要达成的目标",
    categoryLabel: "任务分类",
    uncategorized: "未分类",
    categoryDesc: "应用模板时预填此分类（可再改）。",
    rulesLabel: "任务级拦截 / 允许规则",
    rulesDesc: "应用模板时预填这些任务级规则（拦截/允许，仅对新任务生效，不进全局）。",
    deleteTemplateBtn: "删除模板",
    closeBtn: "关闭",
    deleteAlertTitle: "删除模板「{name}」？",
    untitledTemplate: "未命名模板",
    deleteAlertDesc: "已由该模板创建的任务不会受到影响。",
    cancel: "取消",
    deleting: "删除中",
    delete: "删除",
    loadTemplatesFailed: "加载模板失败：",
    loadingTemplates: "正在加载模板",
    noTaskTemplates: "暂无任务模板",
    searchTemplates: "搜索并选择任务模板",
    taskTemplateLabel: "任务模板",
    manageTemplatesBtn: "管理模板",
    saveAsTemplateBtn: "另存为模板",
    noMatchingTemplates: "没有匹配的模板",
    templateAppliedHint: "选择后会复制模板的描述、目标、分类与任务级规则，不与模板保持关联。",
    useTemplateAlertTitle: "使用模板「{name}」？",
    useTemplateAlertDesc: "当前已填写的描述和目标将被模板内容覆盖。",
    overwriteAndUse: "覆盖并使用",
  },
};

interface TemplateDraft {
  name: string;
  description: string;
  goal: string;
  categoryID: number | null;
  interceptRules: AssetInterceptRuleInput[];
}

type TemplateSeed = Pick<TemplateDraft, "description" | "goal" | "categoryID" | "interceptRules">;

interface TaskTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TaskTemplate[];
  seed: TemplateSeed | null;
  onCreated: (template: TaskTemplate) => void;
  onUpdated: (template: TaskTemplate) => void;
  onDeleted: (id: number) => void;
}

const emptyDraft = (): TemplateDraft => ({
  name: "",
  description: "",
  goal: "",
  categoryID: null,
  interceptRules: [],
});

function templateDraft(template: TaskTemplate): TemplateDraft {
  return {
    name: template.name,
    description: template.description,
    goal: template.goal,
    categoryID: template.category_id ?? null,
    interceptRules: template.intercept_rules ?? [],
  };
}

function TaskTemplateManager({
  open,
  onOpenChange,
  templates,
  seed,
  onCreated,
  onUpdated,
  onDeleted,
}: TaskTemplateManagerProps) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [selectedID, setSelectedID] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<TemplateDraft>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [categories, setCategories] = React.useState<TaskCategory[]>([]);
  const wasOpen = React.useRef(false);

  React.useEffect(() => {
    if (!open) return;
    api
      .taskCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open]);

  React.useEffect(() => {
    if (open && !wasOpen.current) {
      if (seed) {
        setSelectedID(null);
        setDraft({
          name: "",
          description: seed.description,
          goal: seed.goal,
          categoryID: seed.categoryID,
          interceptRules: seed.interceptRules,
        });
      } else if (templates[0]) {
        setSelectedID(templates[0].id);
        setDraft(templateDraft(templates[0]));
      } else {
        setSelectedID(null);
        setDraft(emptyDraft());
      }
    }
    wasOpen.current = open;
  }, [open, seed, templates]);

  const selectTemplate = (template: TaskTemplate) => {
    setSelectedID(template.id);
    setDraft(templateDraft(template));
  };

  const startNew = () => {
    setSelectedID(null);
    setDraft(emptyDraft());
  };

  const updateDraft = (field: "name" | "description" | "goal", value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const patchDraft = (patch: Partial<TemplateDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  async function save() {
    const input = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      goal: draft.goal.trim(),
      category_id: draft.categoryID,
      intercept_rules: draft.interceptRules
        .map((r) => ({ ...r, pattern: r.pattern.trim() }))
        .filter((r) => r.pattern !== ""),
    };
    if (!input.name || !input.description || !input.goal) {
      toast.error(t.requiredFieldsErr);
      return;
    }
    setSaving(true);
    try {
      if (selectedID == null) {
        const created = await api.createTaskTemplate(input);
        onCreated(created);
        setSelectedID(created.id);
        setDraft(templateDraft(created));
        toast.success(t.templateCreated);
      } else {
        const updated = await api.updateTaskTemplate(selectedID, input);
        onUpdated(updated);
        setDraft(templateDraft(updated));
        toast.success(t.templateUpdated);
      }
    } catch (error) {
      toast.error(`${t.saveFailed}${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (selectedID == null) return;
    const deletedID = selectedID;
    setDeleting(true);
    try {
      await api.deleteTaskTemplate(deletedID);
      onDeleted(deletedID);
      const next = templates.find((template) => template.id !== deletedID);
      if (next) {
        setSelectedID(next.id);
        setDraft(templateDraft(next));
      } else {
        startNew();
      }
      setDeleteOpen(false);
      toast.success(t.templateDeleted);
    } catch (error) {
      toast.error(`${t.deleteFailed}${(error as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

  let saveLabel = saving ? t.saving : t.saveChanges;
  if (!saving && selectedID == null) saveLabel = t.createTemplate;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="grid h-full w-full! max-w-none! grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:w-[48rem]! sm:max-w-[48rem]!">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{t.sheetTitle}</SheetTitle>
            <SheetDescription>{t.sheetDesc}</SheetDescription>
          </SheetHeader>
          <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[15rem_minmax(0,1fr)] lg:overflow-hidden">
            <div className="flex min-h-0 flex-col border-b p-3 lg:border-r lg:border-b-0">
              <Button type="button" variant="outline" className="w-full" onClick={startNew}>
                <PlusIcon data-icon="inline-start" />
                {t.newTemplate}
              </Button>
              <ScrollArea className="mt-2 max-h-44 lg:max-h-none lg:flex-1">
                <div className="flex flex-col gap-1 pr-2">
                  {templates.length === 0 && (
                    <p className="px-2 py-6 text-center text-muted-foreground text-sm">{t.noTemplates}</p>
                  )}
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className={cn(
                        "min-w-0 rounded-md px-2.5 py-2 text-left transition-colors",
                        selectedID === template.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                      )}
                      onClick={() => selectTemplate(template)}
                    >
                      <span className="block truncate font-medium text-sm">{template.name}</span>
                      <span className="block truncate text-muted-foreground text-xs">{template.description}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <ScrollArea className="min-h-0">
              <FieldGroup className="p-6">
                <Field>
                  <FieldLabel htmlFor="task-template-name">{t.nameLabel}</FieldLabel>
                  <Input
                    id="task-template-name"
                    value={draft.name}
                    maxLength={120}
                    placeholder={t.namePlaceholder}
                    onChange={(event) => updateDraft("name", event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-template-description">{t.descLabel}</FieldLabel>
                  <Textarea
                    id="task-template-description"
                    className="min-h-28"
                    value={draft.description}
                    placeholder={t.descPlaceholder}
                    onChange={(event) => updateDraft("description", event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-template-goal">{t.goalLabel}</FieldLabel>
                  <Textarea
                    id="task-template-goal"
                    className="min-h-28"
                    value={draft.goal}
                    placeholder={t.goalPlaceholder}
                    onChange={(event) => updateDraft("goal", event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="task-template-category">{t.categoryLabel}</FieldLabel>
                  <NativeSelect
                    id="task-template-category"
                    className="w-full"
                    value={draft.categoryID == null ? "" : String(draft.categoryID)}
                    onChange={(event) =>
                      patchDraft({ categoryID: event.target.value === "" ? null : Number(event.target.value) })
                    }
                  >
                    <NativeSelectOption value="">{t.uncategorized}</NativeSelectOption>
                    {categories.map((c) => (
                      <NativeSelectOption key={c.id} value={String(c.id)}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>{t.categoryDesc}</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t.rulesLabel}</FieldLabel>
                  <AssetInterceptRulesEditor
                    value={draft.interceptRules}
                    onChange={(rules) => patchDraft({ interceptRules: rules })}
                  />
                  <FieldDescription>{t.rulesDesc}</FieldDescription>
                </Field>
              </FieldGroup>
            </ScrollArea>
          </div>
          <SheetFooter className="border-t px-6 py-4 sm:flex-row sm:items-center">
            {selectedID != null && (
              <Button type="button" variant="destructive" className="sm:mr-auto" onClick={() => setDeleteOpen(true)}>
                <Trash2Icon data-icon="inline-start" />
                {t.deleteTemplateBtn}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.closeBtn}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
              {saveLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.deleteAlertTitle.replace("{name}", draft.name || t.untitledTemplate)}
            </AlertDialogTitle>
            <AlertDialogDescription>{t.deleteAlertDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleting && <Spinner data-icon="inline-start" />}
              {deleting ? t.deleting : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface TaskTemplateControlsProps {
  description: string;
  goal: string;
  categoryID?: number;
  interceptRules?: AssetInterceptRuleInput[];
  selectedTemplateID: number | null;
  onSelectedTemplateIDChange: (id: number | null) => void;
  onApply: (template: TaskTemplate) => void;
  portalContainer?: React.RefObject<HTMLElement | null>;
}

export function TaskTemplateControls({
  description,
  goal,
  categoryID,
  interceptRules,
  selectedTemplateID,
  onSelectedTemplateIDChange,
  onApply,
  portalContainer,
}: TaskTemplateControlsProps) {
  const { locale } = useI18n();
  const t = I18N[locale] ?? I18N.en;

  const [templates, setTemplates] = React.useState<TaskTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [templateInputValue, setTemplateInputValue] = React.useState("");
  const [pendingTemplate, setPendingTemplate] = React.useState<TaskTemplate | null>(null);
  const [managerOpen, setManagerOpen] = React.useState(false);
  const [managerSeed, setManagerSeed] = React.useState<TemplateSeed | null>(null);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await api.taskTemplates());
    } catch (error) {
      setTemplates([]);
      toast.error(`${t.loadTemplatesFailed}${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [t.loadTemplatesFailed]);

  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = React.useMemo(
    () => templates.find((template) => template.id === selectedTemplateID) ?? null,
    [selectedTemplateID, templates],
  );

  React.useEffect(() => {
    setTemplateInputValue(selectedTemplate?.name ?? "");
  }, [selectedTemplate]);

  const applyTemplate = (template: TaskTemplate) => {
    onApply(template);
    onSelectedTemplateIDChange(template.id);
    setPendingTemplate(null);
  };

  const chooseTemplate = (template: TaskTemplate | null) => {
    if (!template) {
      setTemplateInputValue("");
      onSelectedTemplateIDChange(null);
      return;
    }
    setTemplateInputValue(template.name);
    const hasContent = description.trim() !== "" || goal.trim() !== "";
    const changesContent = description !== template.description || goal !== template.goal;
    if (hasContent && changesContent) {
      setPendingTemplate(template);
      return;
    }
    applyTemplate(template);
  };

  const openManager = (seed: TemplateSeed | null) => {
    setManagerSeed(seed);
    setManagerOpen(true);
  };

  const upsertTemplate = (template: TaskTemplate) => {
    setTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
  };

  const deleteTemplate = (id: number) => {
    setTemplates((current) => current.filter((template) => template.id !== id));
    if (selectedTemplateID === id) onSelectedTemplateIDChange(null);
  };

  let pickerPlaceholder = loading ? t.loadingTemplates : t.noTaskTemplates;
  if (!loading && templates.length > 0) pickerPlaceholder = t.searchTemplates;

  return (
    <>
      <Field>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLabel htmlFor="task-template-picker">{t.taskTemplateLabel}</FieldLabel>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => openManager(null)}>
              <Settings2Icon data-icon="inline-start" />
              {t.manageTemplatesBtn}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!description.trim() || !goal.trim()}
              onClick={() =>
                openManager({
                  description,
                  goal,
                  categoryID: categoryID ?? null,
                  interceptRules: interceptRules ?? [],
                })
              }
            >
              <SaveIcon data-icon="inline-start" />
              {t.saveAsTemplateBtn}
            </Button>
          </div>
        </div>
        <Combobox
          items={templates}
          itemToStringLabel={(template) => template.name}
          itemToStringValue={(template) => String(template.id)}
          inputValue={templateInputValue}
          onInputValueChange={(value) => setTemplateInputValue(value)}
          value={selectedTemplate}
          onValueChange={chooseTemplate}
        >
          <ComboboxInput
            id="task-template-picker"
            className="w-full"
            placeholder={pickerPlaceholder}
            disabled={loading || templates.length === 0}
            showClear
          />
          <ComboboxContent portalContainer={portalContainer}>
            <ComboboxEmpty>{t.noMatchingTemplates}</ComboboxEmpty>
            <ComboboxList>
              {(template) => (
                <ComboboxItem key={template.id} value={template}>
                  <LibraryIcon />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{template.name}</p>
                    {template.description && (
                      <p className="truncate text-muted-foreground text-xs">{template.description}</p>
                    )}
                  </div>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <FieldDescription>{t.templateAppliedHint}</FieldDescription>
      </Field>

      <AlertDialog
        open={pendingTemplate != null}
        onOpenChange={(open) => {
          if (open) return;
          setPendingTemplate(null);
          setTemplateInputValue(selectedTemplate?.name ?? "");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.useTemplateAlertTitle.replace("{name}", pendingTemplate?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t.useTemplateAlertDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingTemplate && applyTemplate(pendingTemplate)}>
              {t.overwriteAndUse}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskTemplateManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        templates={templates}
        seed={managerSeed}
        onCreated={upsertTemplate}
        onUpdated={upsertTemplate}
        onDeleted={deleteTemplate}
      />
    </>
  );
}
