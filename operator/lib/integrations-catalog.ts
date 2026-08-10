import type { ConnectorStatus } from '@/lib/connectors/types';
import {
  INTEGRATION_CATEGORIES,
  type Integration,
  type IntegrationCategory,
} from '@/lib/schemas';

/**
 * The connections marketplace catalog. Larp-first: a rich, honest catalog of
 * popular tools. `connectorId` ties an entry to a real connector so its live
 * "connected" state is never faked; everything else reads as "not connected"
 * with a Connect affordance. Logos resolve from `slug` via lib/brand-logos
 * (simple-icons + a few hand-authored marks + intentional lettermarks).
 */
export const INTEGRATIONS: Integration[] = [
  // Communication
  { slug: 'slack', name: 'Slack', tagline: 'کانال‌ها و دایرکت‌ها', category: 'ارتباطات', connectorId: 'slack', popular: true, envKeys: ['SLACK_BOT_TOKEN'] },
  { slug: 'gmail', name: 'Gmail', tagline: 'ارسال و خواندن ایمیل', category: 'ارتباطات', connectorId: 'email', popular: true, envKeys: [] },
  { slug: 'whatsapp', name: 'WhatsApp', tagline: 'پیام‌ها و پخش گروهی', category: 'ارتباطات', connectorId: 'whatsapp', envKeys: [] },
  { slug: 'discord', name: 'Discord', tagline: 'سرورها و کانال‌ها', category: 'ارتباطات' },
  { slug: 'telegram', name: 'Telegram', tagline: 'چت‌ها و بات‌ها', category: 'ارتباطات' },
  { slug: 'zoom', name: 'Zoom', tagline: 'جلسات و ضبط‌ها', category: 'ارتباطات', popular: true },
  { slug: 'manychat', name: 'ManyChat', tagline: 'اتوماسیون دایرکت اینستاگرام', category: 'ارتباطات', connectorId: 'manychat', envKeys: ['MANYCHAT_API_KEY'] },

  // Productivity
  { slug: 'notion', name: 'Notion', tagline: 'اسناد و دیتابیس‌ها', category: 'بهره‌وری', connectorId: 'notion', popular: true, envKeys: ['NOTION_API_KEY'] },
  { slug: 'airtable', name: 'Airtable', tagline: 'پایگاه‌ها و رکوردها', category: 'بهره‌وری', popular: true },
  { slug: 'googlesheets', name: 'Google Sheets', tagline: 'خواندن و نوشتن صفحات گسترده', category: 'بهره‌وری' },
  { slug: 'googledocs', name: 'Google Docs', tagline: 'ساخت و ویرایش اسناد', category: 'بهره‌وری' },
  { slug: 'clickup', name: 'ClickUp', tagline: 'اسناد، وظایف و اهداف', category: 'بهره‌وری' },
  { slug: 'trello', name: 'Trello', tagline: 'بردها و کارت‌ها', category: 'بهره‌وری' },
  { slug: 'coda', name: 'Coda', tagline: 'اسنادی مثل اپ', category: 'بهره‌وری' },

  // CRM & Sales
  { slug: 'hubspot', name: 'HubSpot', tagline: 'مخاطبان و معاملات', category: 'CRM و فروش', popular: true },
  { slug: 'salesforce', name: 'Salesforce', tagline: 'حساب‌ها و پایپ‌لاین', category: 'CRM و فروش' },
  { slug: 'attio', name: 'Attio', tagline: 'CRM مبتنی بر داده', category: 'CRM و فروش', connectorId: 'attio', envKeys: ['ATTIO_API_KEY'] },
  { slug: 'zendesk', name: 'Zendesk', tagline: 'تیکت‌ها و پشتیبانی', category: 'CRM و فروش' },
  { slug: 'intercom', name: 'Intercom', tagline: 'چت و چرخه عمر', category: 'CRM و فروش' },
  { slug: 'gohighlevel', name: 'GoHighLevel', tagline: 'پایپ‌لاین و مخاطبان LC', category: 'CRM و فروش', connectorId: 'ghl', envKeys: ['GHL_API_KEY', 'GHL_LOCATION_ID'] },

  // Developer
  { slug: 'github', name: 'GitHub', tagline: 'مخازن، issueها و PRها', category: 'توسعه‌دهنده', popular: true },
  { slug: 'linear', name: 'Linear', tagline: 'issueها و پروژه‌ها', category: 'توسعه‌دهنده' },
  { slug: 'jira', name: 'Jira', tagline: 'بردها و تیکت‌ها', category: 'توسعه‌دهنده' },
  { slug: 'vercel', name: 'Vercel', tagline: 'استقرارها و لاگ‌ها', category: 'توسعه‌دهنده' },
  { slug: 'sentry', name: 'Sentry', tagline: 'خطاها و traceها', category: 'توسعه‌دهنده' },
  { slug: 'gitlab', name: 'GitLab', tagline: 'مخازن و پایپ‌لاین‌ها', category: 'توسعه‌دهنده' },

  // Scheduling
  { slug: 'googlecalendar', name: 'Google Calendar', tagline: 'رویدادها و زمان‌های آزاد', category: 'زمان‌بندی', connectorId: 'calendar', popular: true, envKeys: [] },
  { slug: 'calendly', name: 'Calendly', tagline: 'لینک‌های نوبت‌دهی', category: 'زمان‌بندی' },
  { slug: 'caldotcom', name: 'Cal.com', tagline: 'زمان‌بندی باز', category: 'زمان‌بندی' },
  { slug: 'googlemeet', name: 'Google Meet', tagline: 'تماس‌های ویدیویی', category: 'زمان‌بندی' },

  // Finance
  { slug: 'stripe', name: 'Stripe', tagline: 'پرداخت‌ها و فاکتورها', category: 'مالی', connectorId: 'payments', popular: true, envKeys: ['STRIPE_SECRET_KEY'] },
  { slug: 'quickbooks', name: 'QuickBooks', tagline: 'دفترداری و سود و زیان', category: 'مالی' },
  { slug: 'xero', name: 'Xero', tagline: 'حسابداری و صورتحساب‌ها', category: 'مالی' },
  { slug: 'paypal', name: 'PayPal', tagline: 'پرداخت‌ها و برداشت‌ها', category: 'مالی', envKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] },
  { slug: 'wise', name: 'Wise', tagline: 'موجودی چند ارزی', category: 'مالی' },
  { slug: 'plaid', name: 'Plaid', tagline: 'اتصال‌های بانکی', category: 'مالی' },

  // Marketing
  { slug: 'mailchimp', name: 'Mailchimp', tagline: 'کمپین‌های ایمیلی', category: 'بازاریابی' },
  { slug: 'googleanalytics', name: 'Google Analytics', tagline: 'ترافیک و تبدیل‌ها', category: 'بازاریابی' },
  { slug: 'meta', name: 'Meta Ads', tagline: 'کمپین‌ها و مخاطبان', category: 'بازاریابی', connectorId: 'meta-ads', envKeys: ['META_ADS_ACCESS_TOKEN'] },
  { slug: 'beehiiv', name: 'beehiiv', tagline: 'خبرنامه و مشترکان', category: 'بازاریابی', connectorId: 'beehiiv', envKeys: ['BEEHIIV_API_KEY'] },
  { slug: 'buffer', name: 'Buffer', tagline: 'زمان‌بندی پست‌های اجتماعی', category: 'بازاریابی' },
  { slug: 'hootsuite', name: 'Hootsuite', tagline: 'مدیریت شبکه‌های اجتماعی', category: 'بازاریابی' },
  { slug: 'zernio', name: 'Zernio', tagline: 'انتشار بین‌پلتفرمی', category: 'بازاریابی', connectorId: 'zernio', envKeys: ['ZERNIO_API_KEY'] },
  { slug: 'webinarjam', name: 'WebinarJam', tagline: 'ثبت‌نام‌کنندگان وبینار', category: 'بازاریابی', connectorId: 'webinarjam', envKeys: ['WEBINARJAM_API_KEY'] },
  { slug: 'trakyo', name: 'Trakyo', tagline: 'انتساب ارگانیک', category: 'بازاریابی', connectorId: 'trakyo', envKeys: ['TRAKYO_API_KEY'] },

  // Storage
  { slug: 'googledrive', name: 'Google Drive', tagline: 'فایل‌ها و پوشه‌ها', category: 'ذخیره‌سازی' },
  { slug: 'dropbox', name: 'Dropbox', tagline: 'همگام‌سازی و اشتراک', category: 'ذخیره‌سازی' },
  { slug: 'box', name: 'Box', tagline: 'ابر محتوا', category: 'ذخیره‌سازی' },
  { slug: 'onedrive', name: 'OneDrive', tagline: 'فایل‌های مایکروسافت', category: 'ذخیره‌سازی' },
  { slug: 'obsidian', name: 'Notes', tagline: 'خزانه مارک‌داون', category: 'ذخیره‌سازی', connectorId: 'obsidian', envKeys: [] },

  // AI & Automation
  { slug: 'openai', name: 'OpenAI', tagline: 'مدل‌های GPT و embeddingها', category: 'هوش مصنوعی و اتوماسیون' },
  { slug: 'anthropic', name: 'Anthropic', tagline: 'مدل‌های Claude', category: 'هوش مصنوعی و اتوماسیون', popular: true },
  { slug: 'zapier', name: 'Zapier', tagline: 'اتوماسیون هر چیزی', category: 'هوش مصنوعی و اتوماسیون' },
  { slug: 'make', name: 'Make', tagline: 'گردش‌کارهای بصری', category: 'هوش مصنوعی و اتوماسیون' },
  { slug: 'n8n', name: 'n8n', tagline: 'اتوماسیون خودمیزبان', category: 'هوش مصنوعی و اتوماسیون' },

  // Creative
  { slug: 'figma', name: 'Figma', tagline: 'طراحی و پروتوتایپ', category: 'خلاق', popular: true },
  { slug: 'canva', name: 'Canva', tagline: 'قالب‌ها و گرافیک', category: 'خلاق' },
  { slug: 'miro', name: 'Miro', tagline: 'وایت‌بردها و نقشه‌ها', category: 'خلاق', connectorId: 'miro', envKeys: ['MIRO_ACCESS_TOKEN'] },
  { slug: 'loom', name: 'Loom', tagline: 'ضبط صفحه', category: 'خلاق' },
  { slug: 'typeform', name: 'Typeform', tagline: 'فرم‌ها و نظرسنجی‌ها', category: 'خلاق' },
  { slug: 'arcads', name: 'Arcads', tagline: 'تبلیغات ویدیویی هوش مصنوعی', category: 'خلاق', connectorId: 'arcads', envKeys: ['ARCADS_BASIC_AUTH'] },
];

export type CatalogEntry = Integration & { connected: boolean; keySaved: boolean };

/** The env var names the connect flow may write for an entry. Explicit
 *  envKeys win; no envKeys = a generic <SLUG>_API_KEY; [] = guidance only
 *  (the tool connects through something other than a pasted key). */
export function connectKeysFor(entry: Integration): string[] {
  if (entry.envKeys) return entry.envKeys;
  return [`${entry.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`];
}

/** Merge live connector state onto the catalog. `connected` is true only when a
 *  linked connector actually reports 'connected' — never faked. `keySaved`
 *  means every connect-flow key for the entry sits in .env.local (pass a fresh
 *  readEnvLocal()); a saved key on a connector-less tile shows as stored, not
 *  connected. */
export function connectionCatalog(
  statuses: ConnectorStatus[],
  savedEnv: Record<string, string> = {},
): CatalogEntry[] {
  const byId = new Map(statuses.map((s) => [s.id, s]));
  return INTEGRATIONS.map((i) => {
    const keys = connectKeysFor(i);
    return {
      ...i,
      connected: i.connectorId ? byId.get(i.connectorId)?.state === 'connected' : false,
      keySaved: keys.length > 0 && keys.every((k) => Boolean(savedEnv[k])),
    };
  });
}

/** Catalog grouped by category, in the canonical category order, skipping any
 *  category with no tools. */
export function integrationsByCategory(
  entries: Integration[] = INTEGRATIONS,
): Map<IntegrationCategory, Integration[]> {
  const out = new Map<IntegrationCategory, Integration[]>();
  for (const cat of INTEGRATION_CATEGORIES) {
    const tools = entries.filter((i) => i.category === cat);
    if (tools.length) out.set(cat, tools);
  }
  return out;
}
