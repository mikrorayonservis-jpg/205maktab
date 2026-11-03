/**
 * Rəsmi Elektron Jurnal inteqrasiyasının imkanlar reyestri (tək mənbə).
 *
 * Hər imkan ayrıca texniki faktdır və UI-də ayrıca status kimi göstərilir. Statuslar yalnız
 * sübut olunmuş vəziyyəti əks etdirir — "qoşulub", "sinxronlaşdırılıb" kimi ifadələr texniki əsas olmadan istifadə edilmir.
 * Mərhələ 2–4 (mygov ID ilə giriş, rəsmi məlumatların oxunması/yazılması) rəsmi icazə və sənədlər olmadan aktivləşdirilmir.
 * Ətraflı: docs/integration/OFFICIAL_JOURNAL_INTEGRATION.md
 */

export type Verification =
  | "VERIFIED"
  | "NOT_VERIFIED"
  | "REQUIRES_MINISTRY_CONFIRMATION"
  | "REQUIRES_IDP_CONFIRMATION"
  | "REQUIRES_LEGAL_REVIEW"
  | "UNSUPPORTED";

export type CapabilityKey = "portal_redirect" | "idp_login" | "official_read" | "official_write" | "sync";

export interface Capability {
  key: CapabilityKey;
  phase: 1 | 2 | 3 | 4;
  title: string;
  /** Bu quraşdırmada aktivdirmi (yalnız Mərhələ 1 aktivdir) */
  enabled: boolean;
  verification: Verification;
  /** İstifadəçiyə göstərilən dürüst izah */
  statusText: string;
  /** Aktivləşdirmək üçün nə tələb olunur */
  requirement: string | null;
  checkedOn: string;
}

export const CAPABILITIES: readonly Capability[] = [
  {
    key: "portal_redirect",
    phase: 1,
    title: "Rəsmi portala keçid",
    enabled: true,
    verification: "VERIFIED",
    statusText: "Aktivdir — rəsmi portal yeni tabda açılır, giriş rəsmi tərəfdə mygov ID ilə aparılır.",
    requirement: null,
    checkedOn: "03.11.2026",
  },
  {
    key: "idp_login",
    phase: 2,
    title: "mygov ID ilə bu sayta giriş",
    enabled: false,
    verification: "REQUIRES_IDP_CONFIRMATION",
    statusText: "Qoşulmayıb. Bu sayt mygov ID-nin qeydiyyatlı tərəfdaşı deyil.",
    requirement: "İnnovasiya və Rəqəmsal İnkişaf Agentliyi (İDDA) ilə inteqrasiya razılaşması, client qeydiyyatı və texniki sənədlər.",
    checkedOn: "03.11.2026",
  },
  {
    key: "official_read",
    phase: 3,
    title: "Rəsmi məlumatların göstərilməsi",
    enabled: false,
    verification: "REQUIRES_MINISTRY_CONFIRMATION",
    statusText: "Yoxdur. Rəsmi jurnalın açıq API-si tapılmayıb; rəsmi qiymət və davamiyyət bu sayta ötürülmür.",
    requirement: "Elm və Təhsil Nazirliyinin yazılı icazəsi, məlumat mübadiləsi razılaşması və rəsmi API sənədləri.",
    checkedOn: "03.11.2026",
  },
  {
    key: "official_write",
    phase: 4,
    title: "Rəsmi jurnala buradan yazmaq",
    enabled: false,
    verification: "UNSUPPORTED",
    statusText: "Mümkün deyil. Rəsmi qiymət və davamiyyət yalnız rəsmi portalda daxil edilir.",
    requirement: "Nazirliyin açıq yazma icazəsi, sınaq mühiti və təsdiqlənmiş API.",
    checkedOn: "03.11.2026",
  },
  {
    key: "sync",
    phase: 3,
    title: "Məlumat sinxronizasiyası",
    enabled: false,
    verification: "UNSUPPORTED",
    statusText: "Aparılmır. Məktəbdaxili jurnal rəsmi jurnaldan asılı olmayan ayrıca qeydlərdir.",
    requirement: "Mərhələ 3 icazəsi.",
    checkedOn: "03.11.2026",
  },
];

export const VERIFICATION_LABEL: Record<Verification, string> = {
  VERIFIED: "Təsdiqlənib",
  NOT_VERIFIED: "Təsdiqlənməyib",
  REQUIRES_MINISTRY_CONFIRMATION: "Nazirliyin təsdiqi tələb olunur",
  REQUIRES_IDP_CONFIRMATION: "mygov ID operatorunun təsdiqi tələb olunur",
  REQUIRES_LEGAL_REVIEW: "Hüquqi rəy tələb olunur",
  UNSUPPORTED: "Dəstəklənmir",
};

export function capability(key: CapabilityKey): Capability {
  const c = CAPABILITIES.find((x) => x.key === key);
  if (!c) throw new Error(`Naməlum imkan: ${key}`);
  return c;
}
