// Mövzu (açıq/qaranlıq) üçün localStorage açarları. Server layout-ları da çağırdığı üçün
// "use client" modulunda deyil, adi modulda saxlanılır.
// İctimai sayt və kabinet ayrı açarlardadır, kabinetdə isə hər istifadəçinin öz açarı var:
// kabinetdə seçilən rejim saytın rejiminə və ya eyni cihazdakı başqa istifadəçiyə keçmir.
export const PUBLIC_THEME_KEY = "205_public_theme";
export const dashboardThemeKey = (userId: number) => `205_dashboard_theme:${userId}`;
