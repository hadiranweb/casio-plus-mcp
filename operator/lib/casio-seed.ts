import type { CasioDb } from '@/lib/db';
import { getCasioKnowledge } from '@/lib/casio-knowledge';
import type { Agent, Department, Domain, Metric, Person, RoadmapItem, SopTask } from '@/lib/schemas';

const COLORS = ['#5ec9f8', '#8b7cff', '#4ade96', '#fbbf24', '#f0a05a', '#f87171'];

const departments: Department[] = [
  { id: 'dept-knowledge', name: 'هسته دانش', slug: 'knowledge', tagline: 'HEGAM، پلی‌بوک‌ها، حافظه و استانداردها.', color: COLORS[0], order: 1 },
  { id: 'dept-learning', name: 'سیستم یادگیری', slug: 'learning', tagline: 'متدولوژی، مسیرهای یادگیری و دارایی‌های قابل استفاده مجدد.', color: COLORS[1], order: 2 },
  { id: 'dept-data', name: 'داده و سنجه', slug: 'data-metric', tagline: 'سنجه کاسیو، رجیستری‌ها و کیفیت داده.', color: COLORS[2], order: 3 },
  { id: 'dept-coaching', name: 'عملیات کوچینگ', slug: 'coaching', tagline: 'پیاده‌سازی، برنامه‌های اقدام و بازخورد میدان.', color: COLORS[3], order: 4 },
  { id: 'dept-growth', name: 'اکوسیستم رشد', slug: 'growth', tagline: 'محتوا، کمپین‌ها، سفیران و ارجاع‌ها.', color: COLORS[4], order: 5 },
  { id: 'dept-governance', name: 'حاکمیت', slug: 'governance', tagline: 'انطباق، بازبینی و اتوماسیون کنترل‌شده.', color: COLORS[5], order: 6 },
];

const people: Person[] = [
  { id: 'casio-lead-trainer', departmentId: 'dept-learning', name: 'مدرس اصلی', role: 'Lead Trainer', tools: ['playbook-design', 'learning-path'] },
  { id: 'casio-senior-coach', departmentId: 'dept-coaching', name: 'کوچ ارشد', role: 'Senior Coach', tools: ['action-plan', 'coaching-session'] },
  { id: 'casio-facilitator', departmentId: 'dept-coaching', name: 'تسهیل‌گر', role: 'Facilitator', tools: ['casio-metric', 'feedback-intake'] },
  { id: 'casio-strategist', departmentId: 'dept-growth', name: 'استراتژیست رشد', role: 'Growth Strategist', tools: ['campaign-sheet', 'content-engine'] },
  { id: 'casio-mentor', departmentId: 'dept-governance', name: 'منتور ارشد', role: 'Senior Mentor', tools: ['review-gate', 'growth-registry'] },
  { id: 'casio-data-owner', departmentId: 'dept-data', name: 'مالک داده', role: 'Data Owner', tools: ['data-quality-gate', 'metric-registry'] },
];

const sopTasks: SopTask[] = [
  { id: 'casio-sop-feedback', departmentId: 'dept-knowledge', title: 'بازبینی بازخورد میدان', summary: 'اعتبارسنجی، بازبینی و تبدیل مشاهدات تأییدشده به پیشنهاد نسخه.', steps: ['اعتبارسنجی رکورد', 'بررسی منشأ', 'ایجاد پیشنهاد'], assigneeKind: 'agent', assigneeId: 'casio-memory' },
  { id: 'casio-sop-coaching', departmentId: 'dept-coaching', title: 'بازبینی هفتگی کوچینگ', summary: 'بررسی برنامه‌های اقدام، موانع و وضعیت سنجه کاسیو.', steps: ['خواندن امتیاز', 'شناسایی مانع', 'تعیین اقدام بعدی'], assigneeKind: 'person', assigneeId: 'casio-senior-coach' },
  { id: 'casio-sop-content', departmentId: 'dept-growth', title: 'انتشار حلقه یادگیری محتوا', summary: 'تبدیل دارایی‌های دانش تأییدشده به دنباله محتوای آماده انتشار.', steps: ['انتخاب دارایی', 'ساخت واحد محتوا', 'ثبت بازخورد'], assigneeKind: 'person', assigneeId: 'casio-strategist' },
  { id: 'casio-sop-metric', departmentId: 'dept-data', title: 'به‌روزرسانی سنجه کاسیو', summary: 'اعمال کنترل‌های کیفیت داده قبل از انتشار وضعیت یادگیرنده.', steps: ['دریافت گزارش', 'اعتبارسنجی داده', 'به‌روزرسانی وضعیت'], assigneeKind: 'agent', assigneeId: 'casio-data' },
];

const agents: Agent[] = [
  { id: 'casio-architect', departmentId: 'dept-knowledge', name: 'معمار سیستم', role: 'معمار سیستمسازی', status: 'active', tier: 'lead', description: 'Owns Vault topology, MOC, standards and the structural integrity of the knowledge core.', model: 'casio-plus-mcp', tools: ['knowledge-retrieval', 'architecture-map'], parentId: null, instance: 'builtin' },
  { id: 'casio-methodology', departmentId: 'dept-learning', name: 'طراح متدولوژی', role: 'طراح متدولوژی', status: 'active', tier: 'lead', description: 'Turns field knowledge into reusable playbooks, templates and learning paths.', model: 'casio-plus-mcp', tools: ['playbook-design', 'template-library'], parentId: null, instance: 'builtin' },
  { id: 'casio-data', departmentId: 'dept-data', name: 'تحلیلگر داده', role: 'تحلیلگر داده', status: 'active', tier: 'specialist', description: 'Owns data models, registries, Casio Metric and data quality rules.', model: 'casio-plus-mcp', tools: ['data-quality-gate', 'metric-registry'], parentId: null, instance: 'builtin' },
  { id: 'casio-memory', departmentId: 'dept-knowledge', name: 'مدیر حافظه داده', role: 'مدیر حافظه داده', status: 'active', tier: 'specialist', description: 'Maintains decision registries, learning logs, provenance and version continuity.', model: 'casio-plus-mcp', tools: ['feedback-intake', 'version-proposals'], parentId: 'casio-architect', instance: 'builtin' },
  { id: 'casio-automation', departmentId: 'dept-data', name: 'مالک اتوماسیون', role: 'مالک اتوماسیون', status: 'training', tier: 'specialist', description: 'Converts validated playbooks and data contracts into controlled automation specs.', model: 'casio-plus-mcp', tools: ['automation-spec', 'approval-gate'], parentId: 'casio-data', instance: 'builtin' },
  { id: 'casio-documentation', departmentId: 'dept-coaching', name: 'مستندساز کوچینگ', role: 'مستندساز کوچینگ', status: 'active', tier: 'worker', description: 'Captures sessions, decisions, outputs and feedback as reusable organizational memory.', model: 'casio-plus-mcp', tools: ['coaching-session', 'feedback-intake'], parentId: 'casio-coach', instance: 'builtin' },
  { id: 'casio-compliance', departmentId: 'dept-governance', name: 'ناظر انطباق و استاندارد', role: 'ناظر انطباق و استاندارد', status: 'active', tier: 'specialist', description: 'Controls standards, access, provenance and review policy.', model: 'casio-plus-mcp', tools: ['quality-gate', 'audit-log'], parentId: null, instance: 'builtin' },
  { id: 'casio-coach', departmentId: 'dept-coaching', name: 'کوچ فرایند', role: 'کوچ فرایند', status: 'active', tier: 'lead', description: 'Brings field observations into the review queue and supports implementation.', model: 'casio-plus-mcp', tools: ['action-plan', 'casio-metric'], parentId: null, instance: 'builtin' },
];

export function seedCasioOperator(db: CasioDb): void {
  const casio = getCasioKnowledge();
  const playbooks = casio.دارایی_ها.پلی_بوک_ها;
  const domains: Domain[] = (casio.معماری?.زیرسیستم_ها ?? []).map((domain, index) => ({
    id: `casio-domain-${index + 1}`,
    number: index + 1,
    title: domain.نام,
    color: COLORS[index % COLORS.length],
    items: domain.پلی_بوک_ها,
  }));
  const metrics: Metric[] = [
    { id: 'casio-assets', key: 'casio_assets', label: 'Knowledge Assets', value: playbooks.length, unit: 'assets', delta: 0, period: `v${casio.meta.نسخه}` },
    { id: 'casio-have', key: 'casio_have', label: 'Ready Assets', value: playbooks.filter((p) => p.برچسب_داریم_لازم === 'داریم').length, unit: 'assets', delta: 0, period: 'current' },
    { id: 'casio-gap', key: 'casio_gap', label: 'Required Gaps', value: playbooks.filter((p) => p.برچسب_داریم_لازم === 'لازم').length, unit: 'gaps', delta: 0, period: 'current' },
    { id: 'casio-dev', key: 'casio_development', label: 'Development Rail', value: playbooks.filter((p) => p.برچسب_توسعه === 'توسعه').length, unit: 'assets', delta: 0, period: 'current' },
  ];
  const roadmap: RoadmapItem[] = [
    { id: 'casio-rm-knowledge', title: 'هسته دانش / HEGAM', quarter: '2026-Q3', status: 'done', departmentId: 'dept-knowledge', description: 'Model, architecture, playbooks and knowledge assets established.' },
    { id: 'casio-rm-mcp', title: 'کاسیو‌پلاس MCP', quarter: '2026-Q3', status: 'now', departmentId: 'dept-data', description: 'Read-only tools, data quality gate, review and version proposal lifecycle.' },
    { id: 'casio-rm-operator', title: 'کاسیو‌پلاس Operator', quarter: '2026-Q3', status: 'now', departmentId: 'dept-knowledge', description: 'CasioPlus interface adopted; Casio data injection in progress.' },
    { id: 'casio-rm-metric', title: 'سنجه کاسیو + کوچینگ', quarter: '2026-Q4', status: 'next', departmentId: 'dept-coaching', description: 'Green/yellow/red learner status, coaching sessions and action plans.' },
    { id: 'casio-rm-automation', title: 'اتوماسیون کنترل‌شده', quarter: '2026-Q4', status: 'later', departmentId: 'dept-governance', description: 'Approval-gated automation specs and audit policy.' },
  ];

  // Agent rows carry department foreign keys: write the new departments, then
  // replace the roster before removing obsolete upstream departments.
  for (const item of departments) db.departments.insert(item);
  for (const item of agents) db.agents.insert(item);
  for (const item of people) db.people.insert(item);
  for (const item of sopTasks) db.sopTasks.insert(item);
  db.agents.deleteWhereIdNotIn(agents.map((item) => item.id));
  db.people.deleteWhereIdNotIn(people.map((item) => item.id));
  db.sopTasks.deleteWhereIdNotIn(sopTasks.map((item) => item.id));
  db.departments.deleteWhereIdNotIn(departments.map((item) => item.id));
  for (const item of domains) db.domains.insert(item);
  for (const item of metrics) db.metrics.insert(item);
  for (const item of roadmap) db.roadmap.insert(item);
}
