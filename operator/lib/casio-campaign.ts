import { getCasioKnowledge } from '@/lib/casio-knowledge';

export type CampaignPhase = { id: string; title: string; question: string; objective: string; output: string; status: 'ready' | 'development' };

export function casioCampaignModel() {
  const casio = getCasioKnowledge();
  const playbooks = casio.دارایی_ها.پلی_بوک_ها;
  const find = (name: string) => playbooks.find((item) => item.نام_پلی_بوک.includes(name));
  const phases: CampaignPhase[] = [
    { id: 'topic', title: 'چرا موضوع', question: 'چرا این موضوع اکنون برای مخاطب ارزشمند یا ضروری است؟', objective: 'اثبات مسئله و اهمیت آموزش', output: '۵ محور محتوا: خطر، هزینه ندانستن، قدرت دانستن، سوءبرداشت، داستان واقعی', status: 'ready' },
    { id: 'instructor', title: 'چرا مدرس', question: 'چرا این مدرس مطمئن‌ترین منبع یادگیری است؟', objective: 'ایجاد اعتماد محتوایی', output: 'تجربه عملی، سابقه، سبک تدریس و روایت موفقیت', status: 'ready' },
    { id: 'institution', title: 'چرا مؤسسه', question: 'چرا آموزش باید از کاسیو دریافت شود؟', objective: 'فعال‌سازی اعتبار برند', output: 'استاندارد، ضمانت یادگیری، کنترل کیفیت و پشتیبانی', status: 'ready' },
    { id: 'urgency', title: 'چرا اقدام فوری', question: 'چرا مخاطب نباید تصمیم را به تعویق بیندازد؟', objective: 'کاهش مقاومت و ایجاد فوریت معتبر', output: 'ظرفیت، ددلاین، مشوق و پیشنهاد ردنشدنی', status: 'ready' },
  ];
  return { master: find('راهنمای طراحی و اجرای کمپین'), sheet: find('برگه کمپین'), offer: find('پیشنهاد رد نشدنی'), phases };
}
