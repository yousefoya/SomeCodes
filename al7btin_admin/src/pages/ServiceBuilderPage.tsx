import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/services.api';
import {
  DynamicServiceField,
  DynamicServiceRule,
  DynamicServicePricingRule,
  DynamicServiceRequirement,
  DynamicFieldType,
  RuleOperator,
  RuleActionType,
  PricingRuleType,
} from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Layers,
  Sparkles,
  Sliders,
  Calculator,
  ShieldCheck,
  History,
  Play,
  AlertTriangle,
  Info,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

const FIELD_TYPE_OPTIONS: { labelAr: string; labelEn: string; value: DynamicFieldType }[] = [
  { labelAr: 'نص قصير (Text)', labelEn: 'Short Text', value: 'text' },
  { labelAr: 'نص طويل (Textarea)', labelEn: 'Long Textarea', value: 'textarea' },
  { labelAr: 'رقم (Number)', labelEn: 'Number', value: 'number' },
  { labelAr: 'عداد كمية (Counter +/-)', labelEn: 'Counter', value: 'counter' },
  { labelAr: 'شريط تمرير (Slider)', labelEn: 'Slider', value: 'slider' },
  { labelAr: 'قائمة منسدلة (Select Dropdown)', labelEn: 'Select Dropdown', value: 'select' },
  { labelAr: 'أزرار اختيار أحادية (Radio Buttons)', labelEn: 'Radio Buttons', value: 'radio' },
  { labelAr: 'مربع اختيار (Checkbox)', labelEn: 'Checkbox', value: 'checkbox' },
  { labelAr: 'مفتاح تبديل (Toggle Switch)', labelEn: 'Toggle Switch', value: 'toggle' },
  { labelAr: 'اختيار متعدد (Multi Select)', labelEn: 'Multi Select', value: 'multi_select' },
  { labelAr: 'تحديد تاريخ (Date)', labelEn: 'Date Picker', value: 'date' },
  { labelAr: 'تحديد وقت (Time)', labelEn: 'Time Picker', value: 'time' },
  { labelAr: 'تاريخ ووقت (DateTime)', labelEn: 'DateTime Picker', value: 'datetime' },
  { labelAr: 'رفع صور / ملفات (Image Upload)', labelEn: 'Image Upload', value: 'image_upload' },
  { labelAr: 'موقع جغرافي (Location)', labelEn: 'Location Picker', value: 'location' },
];

export const ServiceBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const isRtl = isRTL;
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'basic' | 'media' | 'fields' | 'rules' | 'pricing' | 'requirements' | 'simulator' | 'versions'
  >('basic');

  // Form State
  const [serviceData, setServiceData] = useState<any>({
    nameAr: '',
    nameEn: '',
    categoryId: '',
    descriptionAr: '',
    descriptionEn: '',
    basePrice: 10.0,
    unitAr: 'خدمة',
    unitEn: 'service',
    type: 'home_service',
    slaHours: 24,
    minOrderValue: '',
    maxOrderValue: '',
    gallery: [] as string[],
    imageUrl: '',
    isActive: true,
  });

  const [fields, setFields] = useState<DynamicServiceField[]>([]);
  const [rules, setRules] = useState<DynamicServiceRule[]>([]);
  const [pricingRules, setPricingRules] = useState<DynamicServicePricingRule[]>([]);
  const [requirements, setRequirements] = useState<DynamicServiceRequirement[]>([]);
  const [options, setOptions] = useState<any[]>([]);

  // Modals State
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState<DynamicServiceField>({
    key: '',
    labelAr: '',
    labelEn: '',
    fieldType: 'text',
    descriptionAr: '',
    descriptionEn: '',
    placeholderAr: '',
    placeholderEn: '',
    defaultValue: '',
    min: null,
    max: null,
    step: null,
    unitAr: '',
    unitEn: '',
    isRequired: false,
    isActive: true,
    sortOrder: 0,
    options: [],
  });

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<DynamicServiceRule>({
    ruleName: '',
    condition: {
      operator: 'AND',
      expressions: [{ field: '', op: 'eq', value: '' }],
    },
    actions: [{ type: 'SHOW_ALERT', messageAr: '', messageEn: '', severity: 'info' }],
    priority: 0,
    isActive: true,
  });

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPricingIndex, setEditingPricingIndex] = useState<number | null>(null);
  const [pricingForm, setPricingForm] = useState<DynamicServicePricingRule>({
    titleAr: '',
    titleEn: '',
    ruleType: 'field_addon',
    targetField: '',
    calculationFormula: { ratePerUnit: 5, threshold: 0, fixedFee: 0 },
    sortOrder: 0,
    isActive: true,
  });

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishChangelog, setPublishChangelog] = useState('');

  // Simulator State
  const [simAnswers, setSimAnswers] = useState<Record<string, any>>({});
  const [simPriceResult, setSimPriceResult] = useState<any>(null);
  const [isSimLoading, setIsSimLoading] = useState(false);

  // Fetch Service Builder Data
  const { data: builderData, isLoading } = useQuery({
    queryKey: ['service-builder', id],
    queryFn: () => servicesApi.getServiceBuilder(id!),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: servicesApi.getCategories,
  });

  const { data: versionHistory } = useQuery({
    queryKey: ['service-versions', id],
    queryFn: () => servicesApi.getServiceVersions(id!),
    enabled: !!id,
  });

  // Populate state upon fetch
  useEffect(() => {
    if (builderData?.service) {
      const s = builderData.service;
      setServiceData({
        id: s.id,
        nameAr: s.nameAr || '',
        nameEn: s.nameEn || '',
        categoryId: s.categoryId || '',
        descriptionAr: s.descriptionAr || '',
        descriptionEn: s.descriptionEn || '',
        basePrice: s.basePrice || 10.0,
        unitAr: s.unitAr || 'خدمة',
        unitEn: s.unitEn || 'service',
        type: s.type || 'home_service',
        slaHours: s.slaHours || 24,
        minOrderValue: s.minOrderValue ?? '',
        maxOrderValue: s.maxOrderValue ?? '',
        gallery: s.gallery || [],
        imageUrl: s.imageUrl || '',
        status: s.status || 'draft',
        currentVersion: s.currentVersion || 1,
        isPublished: s.isPublished || false,
        isActive: s.isActive !== undefined ? s.isActive : true,
      });

      setFields(builderData.fields || []);
      setRules(builderData.rules || []);
      setPricingRules(builderData.pricingRules || []);
      setRequirements(builderData.requirements || []);
      setOptions(builderData.options || []);

      // Initialize default simulator answers
      const initAnswers: Record<string, any> = {};
      (builderData.fields || []).forEach((f: any) => {
        if (f.defaultValue !== undefined && f.defaultValue !== null) {
          initAnswers[f.key] = f.defaultValue;
        } else if (f.fieldType === 'counter' || f.fieldType === 'number') {
          initAnswers[f.key] = f.min ?? 1;
        } else if (f.fieldType === 'toggle' || f.fieldType === 'checkbox') {
          initAnswers[f.key] = false;
        } else if (f.fieldType === 'select' || f.fieldType === 'radio') {
          if (f.options && f.options.length > 0) {
            initAnswers[f.key] = f.options[0].value;
          }
        }
      });
      setSimAnswers(initAnswers);
    }
  }, [builderData]);

  // Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: () =>
      servicesApi.saveServiceBuilder(id!, {
        service: serviceData,
        fields,
        rules,
        pricingRules,
        requirements,
        options,
      }),
    onSuccess: () => {
      success(isRtl ? 'تم حفظ مسودة إعدادات الخدمة بنجاح.' : 'Service draft saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['service-builder', id] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || err.message || 'فشل حفظ المسودة.');
    },
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: (changelog: string) =>
      servicesApi.publishService(id!, {
        changelog,
        fields,
        rules,
        pricingRules,
        requirements,
        options,
      }),
    onSuccess: () => {
      success(isRtl ? 'تم نشر الإصدار الجديد من الخدمة بنجاح.' : 'New service version published successfully.');
      setIsPublishModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['service-builder', id] });
      queryClient.invalidateQueries({ queryKey: ['service-versions', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || err.message || 'فشل نشر الخدمة.');
    },
  });

  // Duplicate Mutation
  const duplicateMutation = useMutation({
    mutationFn: () => servicesApi.duplicateService(id!),
    onSuccess: (res: any) => {
      success(isRtl ? 'تم استنساخ الخدمة بنجاح كمسودة جديدة.' : 'Service duplicated successfully as a new draft.');
      if (res?.id) {
        navigate(`/admin/services/${res.id}/builder`);
      }
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || err.message || 'فشل تكرار الخدمة.');
    },
  });

  // Run Simulator Price Calculation
  const runSimulationCalculation = async () => {
    if (!id) return;
    setIsSimLoading(true);
    try {
      const res = await servicesApi.calculateDynamicPrice(id, {
        answers: simAnswers,
        quantity: 1,
      });
      setSimPriceResult(res);
    } catch (err: any) {
      console.warn('Simulation price error:', err);
    } finally {
      setIsSimLoading(false);
    }
  };

  // Trigger calculation when simulator answers change
  useEffect(() => {
    if (activeTab === 'simulator' && id) {
      const timer = setTimeout(() => {
        runSimulationCalculation();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [simAnswers, activeTab]);

  // Field Management Helpers
  const handleOpenAddField = () => {
    setEditingFieldIndex(null);
    setFieldForm({
      key: `field_${fields.length + 1}`,
      labelAr: '',
      labelEn: '',
      fieldType: 'text',
      descriptionAr: '',
      descriptionEn: '',
      placeholderAr: '',
      placeholderEn: '',
      defaultValue: '',
      min: null,
      max: null,
      step: null,
      unitAr: '',
      unitEn: '',
      isRequired: false,
      isActive: true,
      sortOrder: fields.length,
      options: [],
    });
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (index: number) => {
    setEditingFieldIndex(index);
    setFieldForm({ ...fields[index] });
    setIsFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldForm.key.trim() || !fieldForm.labelAr.trim()) {
      toastError(isRtl ? 'مفتاح الحقل والاسم العربي إلزاميان.' : 'Field key and Arabic label are required.');
      return;
    }

    const updated = [...fields];
    if (editingFieldIndex !== null) {
      updated[editingFieldIndex] = fieldForm;
    } else {
      updated.push(fieldForm);
    }
    setFields(updated);
    setIsFieldModalOpen(false);
    success(isRtl ? 'تم حفظ إعدادات الحقل.' : 'Field saved.');
  };

  const handleDeleteField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index);
    setFields(updated);
  };

  // Rule Management Helpers
  const handleOpenAddRule = () => {
    setEditingRuleIndex(null);
    setRuleForm({
      ruleName: `قاعدة ${rules.length + 1}`,
      condition: {
        operator: 'AND',
        expressions: [{ field: fields[0]?.key || '', op: 'eq', value: '' }],
      },
      actions: [{ type: 'SHOW_ALERT', messageAr: '', messageEn: '', severity: 'warning' }],
      priority: rules.length,
      isActive: true,
    });
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (index: number) => {
    setEditingRuleIndex(index);
    setRuleForm({ ...rules[index] });
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    if (!ruleForm.ruleName.trim()) {
      toastError(isRtl ? 'اسم القاعدة إلزامي.' : 'Rule name is required.');
      return;
    }

    const updated = [...rules];
    if (editingRuleIndex !== null) {
      updated[editingRuleIndex] = ruleForm;
    } else {
      updated.push(ruleForm);
    }
    setRules(updated);
    setIsRuleModalOpen(false);
    success(isRtl ? 'تم حفظ القاعدة الشرطية.' : 'Rule saved.');
  };

  const handleDeleteRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  // Pricing Rule Management Helpers
  const handleOpenAddPricing = () => {
    setEditingPricingIndex(null);
    setPricingForm({
      titleAr: `تسعير ${pricingRules.length + 1}`,
      titleEn: `Pricing ${pricingRules.length + 1}`,
      ruleType: 'field_multiplier',
      targetField: fields[0]?.key || '',
      calculationFormula: { ratePerUnit: 5, threshold: 0, fixedFee: 0 },
      sortOrder: pricingRules.length,
      isActive: true,
    });
    setIsPricingModalOpen(true);
  };

  const handleOpenEditPricing = (index: number) => {
    setEditingPricingIndex(index);
    setPricingForm({ ...pricingRules[index] });
    setIsPricingModalOpen(true);
  };

  const handleSavePricing = () => {
    if (!pricingForm.titleAr.trim()) {
      toastError(isRtl ? 'عنوان قاعدة التسعير إلزامي.' : 'Pricing rule title is required.');
      return;
    }

    const updated = [...pricingRules];
    if (editingPricingIndex !== null) {
      updated[editingPricingIndex] = pricingForm;
    } else {
      updated.push(pricingForm);
    }
    setPricingRules(updated);
    setIsPricingModalOpen(false);
    success(isRtl ? 'تم حفظ قاعدة التسعير.' : 'Pricing rule saved.');
  };

  const handleDeletePricing = (index: number) => {
    setPricingRules(pricingRules.filter((_, i) => i !== index));
  };

  // Simulator Local Rule Evaluation (for instant UX alerts/visibility)
  const simRuleEvaluator = useMemo(() => {
    const visibleFields = new Set<string>(fields.map((f) => f.key));
    const alerts: Array<{ messageAr: string; messageEn: string; severity: string }> = [];
    const requiredCaps: string[] = [];

    rules.forEach((rule) => {
      if (!rule.isActive) return;
      const op = rule.condition?.operator || 'AND';
      const expressions = rule.condition?.expressions || [];

      let matches = false;
      if (expressions.length > 0) {
        const results = expressions.map((exp) => {
          const val = simAnswers[exp.field];
          switch (exp.op) {
            case 'eq':
              return val == exp.value;
            case 'neq':
              return val != exp.value;
            case 'gt':
              return Number(val) > Number(exp.value);
            case 'gte':
              return Number(val) >= Number(exp.value);
            case 'lt':
              return Number(val) < Number(exp.value);
            case 'lte':
              return Number(val) <= Number(exp.value);
            default:
              return false;
          }
        });

        matches = op === 'AND' ? results.every(Boolean) : results.some(Boolean);
      }

      if (matches) {
        rule.actions.forEach((act) => {
          if (act.type === 'SHOW_ALERT') {
            alerts.push({
              messageAr: act.messageAr || '',
              messageEn: act.messageEn || '',
              severity: act.severity || 'warning',
            });
          } else if (act.type === 'HIDE_FIELD' && act.targetField) {
            visibleFields.delete(act.targetField);
          } else if (act.type === 'REQUIRE_CAPABILITY' && act.capabilityKey) {
            requiredCaps.push(act.capabilityKey);
          }
        });
      }
    });

    return { visibleFields, alerts, requiredCaps };
  }, [rules, simAnswers, fields]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3" />
        <p>{isRtl ? 'جاري تحميل منشئ الخدمات الديناميكية...' : 'Loading Dynamic Service Builder...'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/services')}>
            {isRtl ? <ArrowRight className="w-4 h-4 ml-1" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
            {isRtl ? 'العودة للخدمات' : 'Back to Services'}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">
                {serviceData.nameAr || (isRtl ? 'خدمة ديناميكية جديدة' : 'New Dynamic Service')}
              </h1>
              <Badge variant={serviceData.isPublished ? 'success' : 'warning'}>
                {serviceData.status === 'published'
                  ? isRtl
                    ? `منشور (إصدار ${serviceData.currentVersion})`
                    : `Published (v${serviceData.currentVersion})`
                  : isRtl
                  ? 'مسودة (Draft)'
                  : 'Draft'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl
                ? 'منصة بتنحل للمحرك الديناميكي — تكوين الحقول والشروط والتسعير التلقائي'
                : 'BTIN7AL Dynamic Service Engine — Configure inputs, conditional rules & pricing formulas'}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateMutation.mutate()}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="w-4 h-4 mr-1" />
            {isRtl ? 'تكرار كمسودة' : 'Duplicate'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveDraftMutation.mutate()}
            disabled={saveDraftMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1" />
            {saveDraftMutation.isPending ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'حفظ المسودة' : 'Save Draft'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPublishModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="w-4 h-4 mr-1" />
            {isRtl ? 'نشر الإصدار الجديد' : 'Publish Version'}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'basic' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Info className="w-4 h-4" />
          {isRtl ? 'المعلومات الأساسية' : 'Basic Info'}
        </button>

        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'media' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          {isRtl ? 'الوسائط والمعرض' : 'Media & Gallery'}
        </button>

        <button
          onClick={() => setActiveTab('fields')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'fields' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          {isRtl ? `حقول واستمارة العميل (${fields.length})` : `Customer Fields (${fields.length})`}
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'rules' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {isRtl ? `القواعد والشروط (${rules.length})` : `Conditional Rules (${rules.length})`}
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'pricing' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4" />
          {isRtl ? `قواعد التسعير (${pricingRules.length})` : `Pricing Rules (${pricingRules.length})`}
        </button>

        <button
          onClick={() => setActiveTab('requirements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'requirements' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {isRtl ? `متطلبات التوجيه (${requirements.length})` : `Capabilities (${requirements.length})`}
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          <Play className="w-4 h-4" />
          {isRtl ? 'المحاكي المباشر (Simulator)' : 'Live Simulator'}
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'versions' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          {isRtl ? 'سجل الإصدارات' : 'Version History'}
        </button>
      </div>

      {/* Tab 1: Basic Info */}
      {activeTab === 'basic' && (
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            {isRtl ? 'المعلومات العامة وتوصيف الخدمة' : 'General Service Metadata'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={isRtl ? 'اسم الخدمة (عربي) *' : 'Service Name (Arabic) *'}
              value={serviceData.nameAr}
              onChange={(e) => setServiceData({ ...serviceData, nameAr: e.target.value })}
              placeholder={isRtl ? 'مثال: نقل وتغليف الأثاث المنزلي' : 'e.g. Furniture Moving'}
            />

            <Input
              label={isRtl ? 'اسم الخدمة (إنجليزي) *' : 'Service Name (English) *'}
              value={serviceData.nameEn}
              onChange={(e) => setServiceData({ ...serviceData, nameEn: e.target.value })}
              placeholder="e.g. Furniture Moving & Packaging"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isRtl ? 'التصنيف الرئيسي *' : 'Service Category *'}
              </label>
              <Select
                value={serviceData.categoryId}
                onChange={(e) => setServiceData({ ...serviceData, categoryId: e.target.value })}
              >
                <option value="">{isRtl ? 'اختر التصنيف' : 'Select Category'}</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {isRtl ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isRtl ? 'نوع الخدمة *' : 'Service Type *'}
              </label>
              <Select
                value={serviceData.type}
                onChange={(e) => setServiceData({ ...serviceData, type: e.target.value })}
              >
                <option value="home_service">{isRtl ? 'خدمة منزلية / في الموقع (Home Service)' : 'Home Service'}</option>
                <option value="delivery_product">{isRtl ? 'منتج توصيل (Delivery Product)' : 'Delivery Product'}</option>
              </Select>
            </div>

            <Input
              type="number"
              label={isRtl ? 'السعر الأساسي (JOD) *' : 'Base Price (JOD) *'}
              value={serviceData.basePrice}
              onChange={(e) => setServiceData({ ...serviceData, basePrice: parseFloat(e.target.value) || 0 })}
            />

            <Input
              type="number"
              label={isRtl ? 'الحد الأقصى للالتزام بالوقت SLA (بالساعات)' : 'SLA Target (Hours)'}
              value={serviceData.slaHours}
              onChange={(e) => setServiceData({ ...serviceData, slaHours: parseInt(e.target.value) || 24 })}
            />

            <Input
              type="number"
              label={isRtl ? 'الحد الأدنى لقيمة الطلب (JOD)' : 'Minimum Order Value (JOD)'}
              value={serviceData.minOrderValue}
              onChange={(e) => setServiceData({ ...serviceData, minOrderValue: e.target.value })}
              placeholder={isRtl ? 'اختياري' : 'Optional'}
            />

            <Input
              type="number"
              label={isRtl ? 'الحد الأقصى لقيمة الطلب (JOD)' : 'Maximum Order Value (JOD)'}
              value={serviceData.maxOrderValue}
              onChange={(e) => setServiceData({ ...serviceData, maxOrderValue: e.target.value })}
              placeholder={isRtl ? 'اختياري' : 'Optional'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isRtl ? 'وصف الخدمة (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={serviceData.descriptionAr}
                onChange={(e) => setServiceData({ ...serviceData, descriptionAr: e.target.value })}
                placeholder={isRtl ? 'تفاصيل الخدمة وشروط التنفيذ...' : 'Service details...'}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isRtl ? 'وصف الخدمة (إنجليزي)' : 'Description (English)'}
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={serviceData.descriptionEn}
                onChange={(e) => setServiceData({ ...serviceData, descriptionEn: e.target.value })}
                placeholder="English description..."
              />
            </div>
          </div>

          {/* Phase 4: Labor, Mode & Quotation Settings */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {isRtl ? 'إعدادات نمط الخدمة وعروض الأسعار وأجرة اليد' : 'Service Mode, Labor & Quotation Settings'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRtl ? 'نمط الخدمة' : 'Service Mode'}
                </label>
                <Select
                  value={serviceData.serviceMode || 'dynamic_form'}
                  onChange={(e) => setServiceData({ ...serviceData, serviceMode: e.target.value })}
                >
                  <option value="dynamic_form">{isRtl ? 'نموذج ديناميكي عادي' : 'Dynamic Form'}</option>
                  <option value="labor_inspection">{isRtl ? 'أجرة يد / معاينة (تتطلب وصف وعرض سعر)' : 'Labor & Inspection'}</option>
                  <option value="product_installation">{isRtl ? 'منتج + خيار تركيب' : 'Product + Installation'}</option>
                  <option value="package_bundle">{isRtl ? 'باقات عمال وخصومات' : 'Worker Packages'}</option>
                  <option value="product_variant">{isRtl ? 'منتج وأحجام مختلفة' : 'Product & Variants'}</option>
                </Select>
              </div>

              <Input
                label={isRtl ? 'نص "يبدأ من" (عربي)' : 'Starting Price Label (AR)'}
                value={serviceData.startingPriceLabelAr || 'يبدأ من'}
                onChange={(e) => setServiceData({ ...serviceData, startingPriceLabelAr: e.target.value })}
              />

              <Input
                label={isRtl ? 'نص "يبدأ من" (إنجليزي)' : 'Starting Price Label (EN)'}
                value={serviceData.startingPriceLabelEn || 'Starting from'}
                onChange={(e) => setServiceData({ ...serviceData, startingPriceLabelEn: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRtl ? 'تنبيه إخلاء مسؤولية أجرة اليد (عربي)' : 'Labor Starting Fee Disclaimer (Arabic)'}
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={serviceData.disclaimerAr || ''}
                  onChange={(e) => setServiceData({ ...serviceData, disclaimerAr: e.target.value })}
                  placeholder={isRtl ? 'السعر الظاهر هو أجرة اليد/الخدمة الأساسية فقط...' : 'Disclaimer text...'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRtl ? 'تنبيه إخلاء مسؤولية أجرة اليد (إنجليزي)' : 'Labor Starting Fee Disclaimer (English)'}
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={serviceData.disclaimerEn || ''}
                  onChange={(e) => setServiceData({ ...serviceData, disclaimerEn: e.target.value })}
                  placeholder="The displayed price is the labor/service starting fee only..."
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={serviceData.isLaborOnly || false}
                  onChange={(e) => setServiceData({ ...serviceData, isLaborOnly: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {isRtl ? 'الخدمة هي أجرة يد فقط (تتطلب معاينة)' : 'Service is labor-only (requires on-site inspection)'}
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={serviceData.requiresQuotation || false}
                  onChange={(e) => setServiceData({ ...serviceData, requiresQuotation: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {isRtl ? 'تدعم إصدار عروض أسعار إضافية (Quotations)' : 'Supports additional quotation workflow'}
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Media */}
      {activeTab === 'media' && (
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            {isRtl ? 'إدارة الوسائط وصور الخدمة' : 'Service Media & Gallery'}
          </h2>

          <div className="space-y-4">
            <Input
              label={isRtl ? 'رابط الصورة الرئيسية (Cover Image URL)' : 'Cover Image URL'}
              value={serviceData.imageUrl || ''}
              onChange={(e) => setServiceData({ ...serviceData, imageUrl: e.target.value })}
              placeholder="https://example.com/cover.jpg"
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isRtl ? 'معرض صور الخدمة (Gallery URLs مفصولة بفواصل)' : 'Gallery URLs (Comma separated)'}
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={(serviceData.gallery || []).join('\n')}
                onChange={(e) =>
                  setServiceData({
                    ...serviceData,
                    gallery: e.target.value
                      .split('\n')
                      .map((u) => u.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Customer Dynamic Fields */}
      {activeTab === 'fields' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isRtl ? 'استمارة وحقول طلب الخدمة' : 'Customer Input Fields'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'الحقول التي سيقوم العميل بتعبئتها في تطبيق الهاتف (نصوص، عدادات، قوائم، تواريخ، صور، مواقع)'
                  : 'Fields that will be dynamically rendered in Flutter app for customer input'}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenAddField} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" />
              {isRtl ? 'إضافة حقل جديد' : 'Add Field'}
            </Button>
          </div>

          {fields.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Layers className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-bold">{isRtl ? 'لا توجد حقول مخصصة مضافة بعد' : 'No customer fields configured yet'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl
                  ? 'انقر على "إضافة حقل جديد" لإنشاء استمارة ديناميكية كاملة'
                  : 'Click "Add Field" to build a dynamic form'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {fields.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-slate-100 rounded-lg text-xs font-black flex items-center justify-center text-slate-700">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{f.labelAr}</span>
                        <span className="text-xs text-slate-400 font-mono">({f.key})</span>
                        <Badge variant="info">{f.fieldType}</Badge>
                        {f.isRequired && <Badge variant="warning">{isRtl ? 'إلزامي' : 'Required'}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {f.labelEn}
                        {f.options && f.options.length > 0 && ` • ${f.options.length} خيارات`}
                        {f.unitAr && ` • الوحدة: ${f.unitAr}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditField(idx)}>
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteField(idx)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Conditional Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isRtl ? 'محرك القواعد والشروط التفاعلية' : 'Declarative Conditional Rules'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'إظهار/إخفاء الحقول، التنبيهات التحذيرية، وفرض متطلبات خاصة بناءً على اختيارات العميل'
                  : 'Show/Hide fields, display reactive warnings, or require capabilities based on inputs'}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenAddRule} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" />
              {isRtl ? 'إضافة قاعدة شرطية' : 'Add Rule'}
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Sparkles className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-bold">{isRtl ? 'لا توجد قواعد شرطية' : 'No conditional rules configured'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl
                  ? 'مثال: إذا كان (لا يوجد مصعد) و(الدور > 2) -> أظهر تنبيه للمستخدم'
                  : 'e.g. IF (no elevator) AND (floor > 2) -> Show alert banner'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {rules.map((r, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.ruleName}</span>
                      <Badge variant="info">{r.condition?.operator || 'AND'}</Badge>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                      <p>
                        <span className="font-bold text-slate-700">{isRtl ? 'الشرط: ' : 'Condition: '}</span>
                        {r.condition?.expressions?.map((e, i) => (
                          <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded font-mono mr-1">
                            {e.field} {e.op} {String(e.value)}
                          </span>
                        ))}
                      </p>
                      <p>
                        <span className="font-bold text-slate-700">{isRtl ? 'الإجراء: ' : 'Actions: '}</span>
                        {r.actions?.map((a, i) => (
                          <span key={i} className="text-emerald-700 font-semibold mr-1">
                            [{a.type} {a.targetField ? `-> ${a.targetField}` : ''}{' '}
                            {a.messageAr ? `(${a.messageAr})` : ''}]
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditRule(idx)}>
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(idx)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Pricing Rules */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {isRtl ? 'محرك التسعير الديناميكي والمعادلات' : 'Authoritative Pricing Engine'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'معادلات الحساب التلقائي (إضافات ثابتة، مضاعفات عمال، رسوم أدوار، شرائح كمية)'
                  : 'Automated pricing formulas: field multipliers, addons, step increments, and volume tiers'}
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleOpenAddPricing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" />
              {isRtl ? 'إضافة معادلة تسعير' : 'Add Pricing Rule'}
            </Button>
          </div>

          {pricingRules.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <Calculator className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="font-bold">{isRtl ? 'لا توجد قواعد تسعير إضافية' : 'No pricing rules configured'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl
                  ? 'سيتم احتساب السعر الأساسي فقط. أضف معادلات لحساب تكلفة العمال والأدوار والشاحنات.'
                  : 'Base price will be used. Add formulas to calculate workers, floors, truck sizes.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pricingRules.map((pr, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{pr.titleAr}</span>
                      <Badge variant="info">{pr.ruleType}</Badge>
                      {pr.targetField && <span className="text-xs font-mono text-slate-500">({pr.targetField})</span>}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {pr.titleEn} •{' '}
                      {pr.calculationFormula?.ratePerUnit !== undefined &&
                        `معدل: ${pr.calculationFormula.ratePerUnit} JOD`}
                      {pr.calculationFormula?.threshold !== undefined &&
                        ` • حد البداية: ${pr.calculationFormula.threshold}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditPricing(idx)}>
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePricing(idx)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Provider Capabilities */}
      {activeTab === 'requirements' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isRtl ? 'متطلبات مزودي الخدمة والسائقين للتوجيه الذكي' : 'Provider & Driver Requirements'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? 'تحديد القدرات المطلوبة في السائق أو المزود ليتم إسناد الطلب له تلقائياً'
                  : 'Capabilities required by dispatch service to match suitable providers and drivers'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'moving_vehicle', labelAr: 'شاحنة نقل مخصصة (Moving Vehicle)', labelEn: 'Moving Vehicle' },
              { key: 'heavy_lifting', labelAr: 'أدوات رفع أثقال وحبال (Heavy Lifting Equipment)', labelEn: 'Heavy Lifting' },
              { key: 'two_workers', labelAr: 'طاقم عمل لا يقل عن عاملين (At least 2 workers)', labelEn: '2+ Workers' },
            ].map((cap, i) => (
              <label
                key={i}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <input
                  type="checkbox"
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  checked={requirements.some((r) => r.capabilityKey === cap.key)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRequirements([
                        ...requirements,
                        {
                          capabilityKey: cap.key,
                          capabilityNameAr: cap.labelAr,
                          capabilityNameEn: cap.labelEn,
                          requirementType: 'driver_capability',
                          isRequired: true,
                        },
                      ]);
                    } else {
                      setRequirements(requirements.filter((r) => r.capabilityKey !== cap.key));
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-bold text-slate-800">{cap.labelAr}</p>
                  <p className="text-xs text-slate-400 font-mono">{cap.key}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 7: Interactive Live Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Interactive Input Panel */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-600" />
                  {isRtl ? 'محاكاة استمارة العميل التفاعلية' : 'Interactive Customer Form Simulation'}
                </h3>
                <Badge variant="info">{isRtl ? 'تجربة حية' : 'Live Preview'}</Badge>
              </div>

              {/* Reactive Alerts Banner */}
              {simRuleEvaluator.alerts.length > 0 && (
                <div className="space-y-2">
                  {simRuleEvaluator.alerts.map((al, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs font-semibold"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{isRtl ? al.messageAr : al.messageEn || al.messageAr}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Dynamic Field Inputs */}
              <div className="space-y-4">
                {fields.map((field) => {
                  const isVisible = simRuleEvaluator.visibleFields.has(field.key);
                  if (!isVisible) return null;

                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        {isRtl ? field.labelAr : field.labelEn}
                        {field.isRequired && <span className="text-rose-500 mr-1">*</span>}
                        {field.unitAr && <span className="text-slate-400 font-normal mr-1">({field.unitAr})</span>}
                      </label>

                      {/* Render appropriate simulator control */}
                      {field.fieldType === 'text' || field.fieldType === 'location' ? (
                        <Input
                          value={simAnswers[field.key] || ''}
                          onChange={(e) => setSimAnswers({ ...simAnswers, [field.key]: e.target.value })}
                          placeholder={isRtl ? field.placeholderAr || '' : field.placeholderEn || ''}
                        />
                      ) : field.fieldType === 'textarea' ? (
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={simAnswers[field.key] || ''}
                          onChange={(e) => setSimAnswers({ ...simAnswers, [field.key]: e.target.value })}
                          placeholder={isRtl ? field.placeholderAr || '' : field.placeholderEn || ''}
                        />
                      ) : field.fieldType === 'counter' || field.fieldType === 'number' ? (
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const curr = Number(simAnswers[field.key] || field.min || 1);
                              if (field.min === null || field.min === undefined || curr > field.min) {
                                setSimAnswers({ ...simAnswers, [field.key]: curr - (field.step || 1) });
                              }
                            }}
                          >
                            -
                          </Button>
                          <span className="font-bold text-slate-900 min-w-[3rem] text-center text-sm">
                            {simAnswers[field.key] ?? field.defaultValue ?? field.min ?? 1}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const curr = Number(simAnswers[field.key] || field.min || 1);
                              if (field.max === null || field.max === undefined || curr < field.max) {
                                setSimAnswers({ ...simAnswers, [field.key]: curr + (field.step || 1) });
                              }
                            }}
                          >
                            +
                          </Button>
                        </div>
                      ) : field.fieldType === 'toggle' || field.fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(simAnswers[field.key])}
                            onChange={(e) => setSimAnswers({ ...simAnswers, [field.key]: e.target.checked })}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span>{isRtl ? 'نعم / متوفر' : 'Yes / Available'}</span>
                        </label>
                      ) : field.fieldType === 'select' || field.fieldType === 'radio' ? (
                        <Select
                          value={simAnswers[field.key] || ''}
                          onChange={(e) => setSimAnswers({ ...simAnswers, [field.key]: e.target.value })}
                        >
                          {field.options?.map((opt, oi) => (
                            <option key={oi} value={opt.value}>
                              {isRtl ? opt.labelAr : opt.labelEn}
                              {opt.priceModifier ? ` (+${opt.priceModifier} JOD)` : ''}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          value={simAnswers[field.key] || ''}
                          onChange={(e) => setSimAnswers({ ...simAnswers, [field.key]: e.target.value })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Authoritative Server Calculation Display */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  {isRtl ? 'حساب السعر التلقائي (الخادم)' : 'Authoritative Server Pricing'}
                </h3>
                {isSimLoading && <span className="text-xs text-emerald-400 animate-pulse">{isRtl ? 'حساب...' : 'Calculating...'}</span>}
              </div>

              {/* Itemized Price Breakdown */}
              <div className="space-y-2 text-xs">
                {simPriceResult?.breakdown?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800 text-slate-300">
                    <span>{isRtl ? item.titleAr : item.titleEn}</span>
                    <span className="font-mono font-bold text-white">{parseFloat(item.amount).toFixed(2)} JOD</span>
                  </div>
                ))}

                <div className="flex items-center justify-between py-1 text-slate-400">
                  <span>{isRtl ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                  <span className="font-mono text-emerald-400 font-bold">0.00 JOD</span>
                </div>
              </div>

              {/* Total Display */}
              <div className="pt-3 border-t border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    {isRtl ? 'المجموع النهائي' : 'Total Amount'}
                  </span>
                  <p className="text-2xl font-black text-emerald-400 font-mono">
                    {simPriceResult ? parseFloat(simPriceResult.total).toFixed(2) : parseFloat(serviceData.basePrice).toFixed(2)} JOD
                  </p>
                </div>
                <Badge variant="success" className="text-xs py-1">
                  {isRtl ? 'توصيل مجاني 0.00 JOD' : 'Free Delivery'}
                </Badge>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 8: Version History */}
      {activeTab === 'versions' && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            {isRtl ? 'سجل إصدارات الخدمة غير القابل للتعديل' : 'Immutable Version History'}
          </h2>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{isRtl ? 'رقم الإصدار' : 'Version'}</TableHeaderCell>
                <TableHeaderCell>{isRtl ? 'سجل التغييرات' : 'Changelog'}</TableHeaderCell>
                <TableHeaderCell>{isRtl ? 'الناشر' : 'Published By'}</TableHeaderCell>
                <TableHeaderCell>{isRtl ? 'تاريخ النشر' : 'Date'}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {versionHistory && versionHistory.length > 0 ? (
                versionHistory.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Badge variant="info">v{v.version}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">{v.changelog || '—'}</TableCell>
                    <TableCell>{v.publishedByName || 'مدير النظام'}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(v.createdAt).toLocaleString(isRtl ? 'ar-JO' : 'en-US')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    {isRtl ? 'لا توجد إصدارات منشورة سابقة' : 'No published version history yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Field Create/Edit Modal */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title={editingFieldIndex !== null ? (isRtl ? 'تعديل الحقل' : 'Edit Field') : isRtl ? 'إضافة حقل جديد' : 'Add Field'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isRtl ? 'المفتاح البرمجي (Key) *' : 'Field Key *'}
              value={fieldForm.key}
              onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="e.g. truck_size"
            />
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isRtl ? 'نوع الحقل *' : 'Field Type *'}
              </label>
              <Select
                value={fieldForm.fieldType}
                onChange={(e) => setFieldForm({ ...fieldForm, fieldType: e.target.value as DynamicFieldType })}
              >
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isRtl ? opt.labelAr : opt.labelEn}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isRtl ? 'الاسم بالعربي *' : 'Arabic Label *'}
              value={fieldForm.labelAr}
              onChange={(e) => setFieldForm({ ...fieldForm, labelAr: e.target.value })}
              placeholder="مثال: حجم الشاحنة"
            />
            <Input
              label={isRtl ? 'الاسم بالإنجليزي *' : 'English Label *'}
              value={fieldForm.labelEn}
              onChange={(e) => setFieldForm({ ...fieldForm, labelEn: e.target.value })}
              placeholder="e.g. Truck Size"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              type="number"
              label={isRtl ? 'الحد الأدنى (Min)' : 'Min'}
              value={fieldForm.min ?? ''}
              onChange={(e) => setFieldForm({ ...fieldForm, min: e.target.value ? parseFloat(e.target.value) : null })}
            />
            <Input
              type="number"
              label={isRtl ? 'الحد الأقصى (Max)' : 'Max'}
              value={fieldForm.max ?? ''}
              onChange={(e) => setFieldForm({ ...fieldForm, max: e.target.value ? parseFloat(e.target.value) : null })}
            />
            <Input
              label={isRtl ? 'الوحدة (عربي)' : 'Unit (Ar)'}
              value={fieldForm.unitAr || ''}
              onChange={(e) => setFieldForm({ ...fieldForm, unitAr: e.target.value })}
              placeholder="مثال: عامل / طابق"
            />
          </div>

          {/* Options list for select / radio / multi_select */}
          {['select', 'radio', 'multi_select'].includes(fieldForm.fieldType) && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">{isRtl ? 'خيارات القائمة' : 'Options'}</label>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    const currentOpts = fieldForm.options || [];
                    setFieldForm({
                      ...fieldForm,
                      options: [
                        ...currentOpts,
                        {
                          labelAr: `خيار ${currentOpts.length + 1}`,
                          labelEn: `Option ${currentOpts.length + 1}`,
                          value: `opt_${currentOpts.length + 1}`,
                          priceModifier: 0,
                        },
                      ],
                    });
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {isRtl ? 'إضافة خيار' : 'Add Option'}
                </Button>
              </div>

              {fieldForm.options?.map((opt, oi) => (
                <div key={oi} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg text-xs">
                  <div className="col-span-4">
                    <Input
                      value={opt.labelAr}
                      onChange={(e) => {
                        const opts = [...(fieldForm.options || [])];
                        opts[oi].labelAr = e.target.value;
                        setFieldForm({ ...fieldForm, options: opts });
                      }}
                      placeholder="عربي"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={opt.value}
                      onChange={(e) => {
                        const opts = [...(fieldForm.options || [])];
                        opts[oi].value = e.target.value;
                        setFieldForm({ ...fieldForm, options: opts });
                      }}
                      placeholder="Value"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      value={opt.priceModifier || 0}
                      onChange={(e) => {
                        const opts = [...(fieldForm.options || [])];
                        opts[oi].priceModifier = parseFloat(e.target.value) || 0;
                        setFieldForm({ ...fieldForm, options: opts });
                      }}
                      placeholder="+JOD"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const opts = (fieldForm.options || []).filter((_, idx) => idx !== oi);
                        setFieldForm({ ...fieldForm, options: opts });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={fieldForm.isRequired}
                onChange={(e) => setFieldForm({ ...fieldForm, isRequired: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>{isRtl ? 'حقل إلزامي *' : 'Required Field *'}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFieldModalOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSaveField} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isRtl ? 'حفظ الحقل' : 'Save Field'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rule Create/Edit Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRuleIndex !== null ? (isRtl ? 'تعديل القاعدة الشرطية' : 'Edit Rule') : isRtl ? 'إضافة قاعدة شرطية' : 'Add Rule'}
      >
        <div className="space-y-4">
          <Input
            label={isRtl ? 'اسم القاعدة *' : 'Rule Name *'}
            value={ruleForm.ruleName}
            onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
            placeholder="مثال: تنبيه عدم وجود مصعد للدور الثاني فما فوق"
          />

          <div className="bg-slate-50 p-3 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">{isRtl ? 'شروط التحقق (IF)' : 'Conditions (IF)'}</label>
              <Select
                className="text-xs w-28"
                value={ruleForm.condition.operator || 'AND'}
                onChange={(e) =>
                  setRuleForm({
                    ...ruleForm,
                    condition: { ...ruleForm.condition, operator: e.target.value as 'AND' | 'OR' },
                  })
                }
              >
                <option value="AND">AND (الكل)</option>
                <option value="OR">OR (أحدهم)</option>
              </Select>
            </div>

            {ruleForm.condition.expressions?.map((exp, ei) => (
              <div key={ei} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Select
                    value={exp.field}
                    onChange={(e) => {
                      const exps = [...(ruleForm.condition.expressions || [])];
                      exps[ei].field = e.target.value;
                      setRuleForm({ ...ruleForm, condition: { ...ruleForm.condition, expressions: exps } });
                    }}
                  >
                    <option value="">{isRtl ? 'اختر الحقل' : 'Select Field'}</option>
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.labelAr} ({f.key})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-3">
                  <Select
                    value={exp.op}
                    onChange={(e) => {
                      const exps = [...(ruleForm.condition.expressions || [])];
                      exps[ei].op = e.target.value as RuleOperator;
                      setRuleForm({ ...ruleForm, condition: { ...ruleForm.condition, expressions: exps } });
                    }}
                  >
                    <option value="eq">=</option>
                    <option value="neq">!=</option>
                    <option value="gt">&gt;</option>
                    <option value="gte">&gt;=</option>
                    <option value="lt">&lt;</option>
                    <option value="lte">&lt;=</option>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input
                    value={String(exp.value ?? '')}
                    onChange={(e) => {
                      const exps = [...(ruleForm.condition.expressions || [])];
                      exps[ei].value = e.target.value;
                      setRuleForm({ ...ruleForm, condition: { ...ruleForm.condition, expressions: exps } });
                    }}
                    placeholder="القيمة"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800">{isRtl ? 'الإجراء المنفذ (THEN Action)' : 'Action (THEN)'}</label>
            {ruleForm.actions?.map((act, ai) => (
              <div key={ai} className="space-y-2">
                <Select
                  value={act.type}
                  onChange={(e) => {
                    const acts = [...ruleForm.actions];
                    acts[ai].type = e.target.value as RuleActionType;
                    setRuleForm({ ...ruleForm, actions: acts });
                  }}
                >
                  <option value="SHOW_ALERT">{isRtl ? 'إظهار تنبيه تحذيري (Show Alert)' : 'Show Alert'}</option>
                  <option value="HIDE_FIELD">{isRtl ? 'إخفاء حقل (Hide Field)' : 'Hide Field'}</option>
                  <option value="SHOW_FIELD">{isRtl ? 'إظهار حقل (Show Field)' : 'Show Field'}</option>
                  <option value="REQUIRE_CAPABILITY">{isRtl ? 'طلب قدرة خاصة في السائق (Require Driver Capability)' : 'Require Capability'}</option>
                </Select>

                {act.type === 'SHOW_ALERT' && (
                  <Input
                    label={isRtl ? 'نص التنبيه بالعربي' : 'Alert Message'}
                    value={act.messageAr || ''}
                    onChange={(e) => {
                      const acts = [...ruleForm.actions];
                      acts[ai].messageAr = e.target.value;
                      setRuleForm({ ...ruleForm, actions: acts });
                    }}
                    placeholder="يرجى العلم بأنه سيتم احتساب رسوم إضافية لعدم توفر مصعد"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsRuleModalOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSaveRule} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isRtl ? 'حفظ القاعدة' : 'Save Rule'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pricing Rule Create/Edit Modal */}
      <Modal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        title={editingPricingIndex !== null ? (isRtl ? 'تعديل قاعدة التسعير' : 'Edit Pricing Rule') : isRtl ? 'إضافة قاعدة تسعير' : 'Add Pricing Rule'}
      >
        <div className="space-y-4">
          <Input
            label={isRtl ? 'عنوان المعادلة بالعربي *' : 'Title (Arabic) *'}
            value={pricingForm.titleAr}
            onChange={(e) => setPricingForm({ ...pricingForm, titleAr: e.target.value })}
            placeholder="مثال: رسوم العمال الإضافيين"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isRtl ? 'نوع المعادلة *' : 'Formula Type *'}
            </label>
            <Select
              value={pricingForm.ruleType}
              onChange={(e) => setPricingForm({ ...pricingForm, ruleType: e.target.value as PricingRuleType })}
            >
              <option value="field_multiplier">{isRtl ? 'مضاعف حقل (Field Multiplier: عمال * سعر)' : 'Field Multiplier'}</option>
              <option value="step_increment">{isRtl ? 'رسوم بعد حد معين (Step Increment: طوابق > 2)' : 'Step Increment'}</option>
              <option value="field_addon">{isRtl ? 'إضافة ثابتة للحقل (Field Addon)' : 'Field Addon'}</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isRtl ? 'الحقل المستهدف *' : 'Target Field *'}
            </label>
            <Select
              value={pricingForm.targetField || ''}
              onChange={(e) => setPricingForm({ ...pricingForm, targetField: e.target.value })}
            >
              <option value="">{isRtl ? 'اختر الحقل' : 'Select Field'}</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.labelAr} ({f.key})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              label={isRtl ? 'المعدل لكل وحدة (JOD) *' : 'Rate per Unit (JOD) *'}
              value={pricingForm.calculationFormula?.ratePerUnit ?? 5}
              onChange={(e) =>
                setPricingForm({
                  ...pricingForm,
                  calculationFormula: {
                    ...pricingForm.calculationFormula,
                    ratePerUnit: parseFloat(e.target.value) || 0,
                  },
                })
              }
            />
            <Input
              type="number"
              label={isRtl ? 'حد البداية (Threshold)' : 'Threshold (Included)'}
              value={pricingForm.calculationFormula?.threshold ?? 0}
              onChange={(e) =>
                setPricingForm({
                  ...pricingForm,
                  calculationFormula: {
                    ...pricingForm.calculationFormula,
                    threshold: parseFloat(e.target.value) || 0,
                  },
                })
              }
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsPricingModalOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSavePricing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isRtl ? 'حفظ معادلة التسعير' : 'Save Pricing Rule'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish Version Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title={isRtl ? 'نشر إصدار جديد من الخدمة' : 'Publish New Version'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">
                {isRtl
                  ? `سيتم إنشاء الإصدار رقم ${serviceData.currentVersion + 1} وتثبيت لقطة المخطط بالكامل.`
                  : `Version ${serviceData.currentVersion + 1} will be created with an immutable schema snapshot.`}
              </p>
              <p className="text-emerald-700 mt-1 font-normal">
                {isRtl
                  ? 'الطلبات السابقة ستحتفظ بأسعارها وإعداداتها دون أي تغيير.'
                  : 'Historical orders remain 100% untouched.'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isRtl ? 'ملاحظات الإصدار وسجل التغييرات (Changelog)' : 'Release Notes / Changelog'}
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={publishChangelog}
              onChange={(e) => setPublishChangelog(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: إضافة حقل حجم الشاحنة وتحديث معادلة رسوم العمال الإضافيين'
                  : 'e.g. Added truck size field and updated extra worker surcharge'
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              onClick={() => publishMutation.mutate(publishChangelog)}
              disabled={publishMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publishMutation.isPending ? (isRtl ? 'جاري النشر...' : 'Publishing...') : isRtl ? 'تأكيد ونشر' : 'Confirm & Publish'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
