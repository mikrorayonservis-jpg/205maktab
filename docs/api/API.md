# API sənədləri

**Cavab formatı:** `{ "ok": true, "data": ... }` və ya `{ "ok": false, "error": { "code", "message", "fields?" } }`

**Ümumi qaydalar**
- Bütün mutasiya sorğuları (`POST/PUT/PATCH/DELETE`) `X-CSRF-Token` başlığı tələb edir (dəyər `q205_csrf` cookie-sindən) və Origin eyni sayt olmalıdır.
- Autentifikasiya: `q205_sid` (HTTPS-də `__Host-q205_sid`) HttpOnly cookie.
- Status kodları: 400 (biznes qaydası), 401 (daxil olunmayıb), 403 (icazə/CSRF), 404, 409 (konflikt/dublikat), 422 (validasiya, `fields`), 429 (rate limit), 500.
- Bütün API cavabları `Cache-Control: no-store`.

## Autentifikasiya — `/api/auth/*`
| Metod | Yol | Gövdə | İcazə |
|---|---|---|---|
| POST | `/login` | `{email, password}` | açıq · rate limit: IP 30/10dəq, e-poçt 8/15dəq |
| POST | `/logout` | — | — |
| GET | `/me` | — | — |
| POST | `/register` | `{code, email, firstName, lastName, password, passwordConfirm}` | açıq · dəvət kodu |
| POST | `/verify-email` | `{token}` | açıq |
| POST | `/resend-verification` | `{email}` | açıq |
| POST | `/forgot-password` | `{email}` | açıq (istifadəçi mövcudluğu açıqlanmır) |
| POST | `/reset-password` | `{token, password, passwordConfirm}` | açıq |
| POST | `/change-password` | `{currentPassword, password, passwordConfirm}` | daxil olmuş |
| GET/DELETE | `/sessions` | — | daxil olmuş (DELETE: digər sessiyaları bağlayır) |
| POST | `/redeem` | `{code}` | daxil olmuş (valideyn əlavə uşaq) |

## Elektron jurnal
| Metod | Yol | Qeyd |
|---|---|---|
| GET | `/api/grades?studentId&classId&subjectId&from&to` | Nəticə həmişə istifadəçinin əhatəsi ilə filtrlənir |
| POST | `/api/grades` | `{classId, subjectId, date, type, entries:[{studentId, value(2-5), note}]}` · `grades.manage_own` + təyinat |
| PATCH/DELETE | `/api/grades/:id` | Yalnız həmin sinif+fənnin müəllimi; soft delete; audit |
| GET | `/api/journal?classId&subjectId&from&to` | Jurnal vərəqi |
| GET | `/api/attendance?classId&date&period` | Qeyd forması (period 0 = gündəlik, sinif rəhbəri; 1–8 = dərsin müəllimi) |
| GET | `/api/attendance?studentId&from&to` | Şagirdin tarixçəsi (əhatə yoxlanılır) |
| POST | `/api/attendance` | `{classId, date, period, entries:[{studentId, status, note}]}` |
| GET | `/api/attendance/report?classId&from&to` | Sinif hesabatı |
| GET | `/api/schedule?classId|teacherId|subjectId` | Şagird/valideyn yalnız öz sinfi |
| POST | `/api/schedule/lessons` | `schedule.manage` · konflikt → 409 `SCHEDULE_CONFLICT` |
| PATCH/DELETE | `/api/schedule/lessons/:id` | `schedule.manage` |
| GET | `/api/schedule/conflicts` | Mövcud müəllim konfliktləri |
| GET/POST | `/api/homework` | Siyahı (əhatə) / yaratma (müəllim + təyinat) |
| GET/PATCH/DELETE | `/api/homework/:id` | |
| GET/POST | `/api/homework/:id/submissions` | Müəllim siyahısı / şagird cavabı |
| PATCH | `/api/homework/submissions/:id` | `{grade, feedback, status}` |
| GET | `/api/teacher/assignments` | Müəllimin təyinatları və rəhbər olduğu siniflər |
| GET | `/api/classes/:id/students` | Sinif siyahısı (əhatə) |
| GET | `/api/reports/summary` | `reports.view` |
| GET | `/api/notifications` · POST `/api/notifications/read` | Yalnız öz bildirişləri |

## Rəsmi Elektron Jurnal (Path B — yalnız keçid)
| Metod | Yol | Qeyd |
|---|---|---|
| POST | `/api/official-journal/open` | `{target: "jurnal" \| "digital"}` · müəllim/sinif rəhbəri/direktor/müavin, digərlərinə 403 · CSRF · 60/saat · yalnız audit qeydi (`official_journal.open`) yazır. Rəsmi sistemə heç bir sorğu göndərilmir, token/cookie ötürülmür |

| GET | `/api/integrations/journal/status` | Eyni rollar · ayrı-ayrı faktlar: yerli sessiya, rəsmi identifikasiya (`false`), portalın son açılması, rəsmi API icazəsi (`false`), sinxronizasiya (dəstəklənmir), imkanlar reyestri (Mərhələ 1–4) |

Səhifə: `/official-journal` (icazəsiz rollara 404). Mərhələ 2–4 üçün dizayn: `docs/integration/OFFICIAL_JOURNAL_INTEGRATION.md`. Ünvanlar `site_settings`-dəki `official_journal_url`, `official_digital_teacher_url`, `official_digital_director_url` açarlarından oxunur; yalnız `https://` + `*.edu.az`/`*.gov.az` qəbul edilir (`PUT /api/admin/settings` başqa ünvanda 422 qaytarır).

## Fayllar
| Metod | Yol | Qeyd |
|---|---|---|
| POST | `/api/uploads` | multipart `{purpose, file}`; təyinatlar: news, gallery, event, document, avatar, content (ictimai) · homework, submission (şəxsi). Magic-byte MIME yoxlaması, limitlər: şəkil 8 MB, PDF 15 MB |
| GET | `/api/files/:id` | Şəxsi fayl, hər sorğuda hüquq yoxlaması |
| GET | `/media/*` | İctimai fayl |

## Redaksiya
| Metod | Yol | Qeyd |
|---|---|---|
| GET | `/api/news?category&q&page` | İctimai lent |
| GET/POST | `/api/editorial` | `scope=mine|queue|all` |
| GET/PUT/DELETE | `/api/editorial/:id` | |
| POST | `/api/editorial/:id/transition` | `{action: submit|request_changes|approve|reject|publish|unpublish|restore, note}` |

## Administrator
| Metod | Yol | Qeyd |
|---|---|---|
| GET/POST | `/api/admin/r/:resource` | Ümumi CRUD (`school-years, subjects, classes, assignments, teachers, students, news-categories, events, galleries, documents, leadership, achievements, links, bell-times`); `?q&page&pageSize&sort&dir&f_<filtr>` |
| GET/PATCH/DELETE | `/api/admin/r/:resource/:id` | |
| POST | `/api/admin/r/:resource/bulk` | `{action:"delete", ids}` |
| GET | `/api/admin/r/:resource/export` | CSV (formula injection-a qarşı qorunur) |
| GET | `/api/admin/options?source=` | Seçim siyahıları |
| GET · GET/PATCH | `/api/admin/users`, `/api/admin/users/:id` | `{isActive, roles}`; yüksək rollar yalnız super_admin |
| GET/POST · DELETE | `/api/admin/invitations`, `/:id` | Kod yalnız yaradılarkən qaytarılır |
| GET/POST/DELETE | `/api/admin/parent-links` | |
| GET/PUT | `/api/admin/settings`, `/api/admin/pages/:slug` | |
| GET/POST · PATCH/DELETE | `/api/admin/galleries/:id/images[/:imageId]`, `/videos[/:videoId]` | Video: yalnız YouTube/Vimeo |
| GET | `/api/admin/audit?action&entity&userEmail&from&to&page&format=csv` | `audit.view` |
| POST | `/api/admin/broadcast` | `notifications.broadcast` |
