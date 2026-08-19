# คู่มือติดตั้งและ Deploy — Gemba Walk

คู่มือนี้พาตั้งแต่ deploy หน้าเว็บ ไปจนถึงต่อระบบหลังบ้านบน Cloudflare (D1 + R2 + Worker)

## 🟢 สถานะตอนนี้

| ปลายทาง | สถานะ | URL |
|---|---|---|
| **Cloudflare Pages** (ตัวหลัก) | ✅ ใช้งานได้แล้ว | <https://gemba-audit.pages.dev> |
| GitHub Pages (ตัวสำรอง) | ⚠️ รอเปิดสวิตช์ 1 จุด | <https://topmaha.github.io/Gemba_Audit/> |
| **D1 schema + seed** | ✅ เขียนและทดสอบแล้ว | `worker/schema.sql` · `worker/seed.sql` |
| R2 + Worker API | ⬜ ยังไม่เริ่ม (งานที่ 4–5) | — |

---

## สารบัญ

- [ส่วนที่ 1 — คำสั่งที่ต้องรู้](#ส่วนที่-1--คำสั่งที่ต้องรู้)
- [ส่วนที่ 2 — Cloudflare Pages (ตัวหลัก · deploy แล้ว)](#ส่วนที่-2--cloudflare-pages-ตัวหลัก--deploy-แล้ว-)
- [ส่วนที่ 3 — GitHub Pages (ตัวสำรอง · ยังไม่ทำงาน)](#ส่วนที่-3--github-pages-ตัวสำรอง--ยังไม่ทำงาน-)
- [ส่วนที่ 4 — ฐานข้อมูล D1](#ส่วนที่-4--ฐานข้อมูล-d1)
- [ภาคผนวก ก — ทำไมของเดิมถึงพัง](#ภาคผนวก-ก--ทำไมของเดิมถึงพัง)

---

## ส่วนที่ 1 — คำสั่งที่ต้องรู้

| คำสั่ง | ใช้เมื่อไหร่ |
|---|---|
| `npm run dev` | พัฒนาในเครื่อง (พอร์ต 8080) |
| `npm run deploy` | **build + ขึ้นเว็บจริง** — คำสั่งเดียวจบ |
| `npm run build` | build อย่างเดียว สำหรับ deploy ที่ root ของโดเมน |
| `npm run build:ghpages` | build สำหรับ GitHub Pages (base `/Gemba_Audit/`) |
| `npm run build:file` | build แบบ relative path สำหรับดับเบิลคลิกเปิด `file://` |
| `npm run lint` | ตรวจชนิดข้อมูล (`tsc --noEmit`) |
| `npm run test` | รันชุดทดสอบ (Vitest) |

### คำสั่ง wrangler ทั้งหมดที่ต้องรันเอง

รวมไว้ที่เดียวตามลำดับ — คัดลอกทีละบล็อกได้เลย

**ครั้งเดียวต่อเครื่อง**

```bash
npx wrangler login
```

**สร้างฐานข้อมูล D1 (ครั้งเดียวต่อโปรเจกต์)**

```bash
npx wrangler d1 create gemba-audit
```

คำสั่งนี้จะพิมพ์ `database_id` ออกมา **ต้องคัดลอกไปใส่ใน `worker/wrangler.toml`** แทนคำว่า
`PLACEHOLDER_เปลี่ยนหลังรัน_d1_create` ก่อนทำขั้นถัดไป

**สร้างตารางและใส่ข้อมูลตั้งต้น** (รันจากโฟลเดอร์ `worker/`)

```bash
cd worker && npx wrangler d1 execute gemba-audit --remote --file=./schema.sql
```

```bash
cd worker && npx wrangler d1 execute gemba-audit --remote --file=./seed.sql
```

**ตรวจว่าข้อมูลเข้าจริง**

```bash
cd worker && npx wrangler d1 execute gemba-audit --remote --command "SELECT COUNT(*) AS n FROM managers"
```

**ดูประวัติ deploy หน้าเว็บ**

```bash
npx wrangler pages deployment list --project-name=gemba-audit
```

> โปรเจกต์ Pages ชื่อ `gemba-audit` ถูกสร้างไว้ให้แล้ว ไม่ต้องสร้างซ้ำ
> ส่วนคำสั่งของ R2 · secret · deploy Worker จะเพิ่มเมื่อทำตัว API เสร็จ

---

## ส่วนที่ 2 — Cloudflare Pages (ตัวหลัก · deploy แล้ว ✅)

**URL ใช้งานจริง: <https://gemba-audit.pages.dev>**

โปรเจกต์ถูกสร้างและ deploy ให้เรียบร้อยแล้วด้วย wrangler ไม่ต้องไปกดใน dashboard
หัวข้อนี้จึงเป็นแค่วิธี deploy รอบถัดไปกับวิธีตรวจสอบ

### 2.1 deploy รอบถัดไป

แก้โค้ดเสร็จแล้วสั่งคำสั่งเดียวจบ (build + อัปโหลดในตัว)

```bash
npm run deploy
```

ครั้งแรกในเครื่องใหม่ต้องล็อกอิน Cloudflare ก่อนหนึ่งครั้ง

```bash
npx wrangler login
```

### 2.2 ตรวจว่าใช้ได้จริง

```bash
curl -s -o /dev/null -w "หน้าแรก: %{http_code}\n" https://gemba-audit.pages.dev/
```

```bash
curl -s https://gemba-audit.pages.dev/ | grep -o "/assets/[^\"]*"
```

```bash
curl -s https://gemba-audit.pages.dev/plan | grep -c "assets/index"
```

**เกณฑ์ผ่าน**

- คำสั่งแรกได้ **200**
- คำสั่งที่สองเห็น path ขึ้นต้นด้วย `/assets/` (ทับหน้า ไม่ใช่ `./assets/`)
- คำสั่งที่สามได้เลข **มากกว่า 0** = deep link ถูกเสิร์ฟด้วย index.html ตาม `_redirects`

> ⚠️ `curl` ทุก path จะได้ 200 หมด เพราะกฎ `/* /index.html 200` ใน `_redirects`
> ดังนั้นอย่าใช้แค่รหัสสถานะตัดสิน ให้ดูเนื้อหาที่ได้กลับมาด้วย

**ทดสอบในเบราว์เซอร์**

1. เปิด <https://gemba-audit.pages.dev> → ต้องเห็นหน้าเข้าสู่ระบบ ไม่ใช่ "กำลังโหลด Gemba Walk…"
2. ล็อกอินด้วยรหัส `1001`
3. กด F5 กลางหน้า `/plan` → ต้องไม่จอขาว

### 2.3 ผลตรวจล่าสุด (19 ส.ค. 2569)

| รายการ | ผล |
|---|---|
| หน้าแรก | 200 · แอปขึ้นจริง ไม่ค้างที่ข้อความสำรอง |
| asset path | `/assets/index-BGXmK2UY.js` · `/assets/index-C95F_pcd.css` |
| ล็อกอิน `1001` | ผ่าน · เข้าหน้า `/plan` ได้ |
| กด F5 ที่ `/plan` | 200 · ไม่จอขาว · session ยังอยู่ |
| Console error | ไม่มี |

### 2.4 ต่อ D1 + R2 ทีหลัง

Worker จะ deploy แยกในส่วนถัดไป แล้วเพิ่มตัวแปร `VITE_API_URL` ให้ frontend
ถ้าผูก custom domain เดียวกันทั้งสองตัวจะได้ same-origin ไม่ต้องยุ่งกับ CORS เลย

---

## ส่วนที่ 3 — GitHub Pages (ตัวสำรอง · ยังไม่ทำงาน ⚠️)

URL: <https://topmaha.github.io/Gemba_Audit/> — **ตอนนี้ยังค้างที่ข้อความ "กำลังโหลด Gemba Walk…"**

workflow `.github/workflows/deploy.yml` ถูกติดตั้งและรันสำเร็จแล้ว แต่หน้าเว็บยังไม่เปลี่ยน
เพราะ **ค่า Source ของ Pages ยังเป็น `Deploy from a branch`** ซึ่งเอา repo ดิบไปเสิร์ฟทับ

ตรวจสอบได้จาก

```bash
curl -s https://topmaha.github.io/Gemba_Audit/ | grep "src/main.tsx"
```

ถ้ายังเห็น `<script type="module" src="/src/main.tsx">` แปลว่ายังไม่ได้แก้

### วิธีแก้ (ทำครั้งเดียว ประมาณ 10 วินาที)

1. เปิด <https://github.com/TopMaha/Gemba_Audit/settings/pages>
2. **Build and deployment** → **Source** → เปลี่ยนเป็น **`GitHub Actions`**
3. ไปแท็บ Actions → run ล่าสุด → **Re-run all jobs**

ไม่จำเป็นต้องทำก็ได้ ถ้าใช้ Cloudflare เป็นหลักอยู่แล้ว — ปล่อยไว้เฉย ๆ ไม่กระทบอะไร

---

## ส่วนที่ 4 — ฐานข้อมูล D1

### 4.1 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `worker/schema.sql` | สร้างตาราง + index ทั้งหมด (ใช้ `CREATE TABLE IF NOT EXISTS` รันซ้ำได้) |
| `worker/seed.sql` | ข้อมูลตั้งต้น (ใช้ `INSERT OR IGNORE` รันซ้ำได้ ไม่เกิดแถวซ้ำ) |
| `worker/wrangler.toml` | ผูก binding `DB` เข้ากับฐานข้อมูล |

### 4.2 ตารางทั้งหมด 15 ตาราง

โครงนี้**สะท้อนข้อมูลจริงที่แอปใช้** ไม่ใช่สคีมาระบบเช็คลิสต์ทั่วไป
(แอปนี้ไม่มีคำถามรายข้อ ไม่มีคะแนน OK/NG — วัดผลจากพฤติกรรมการเดินแทน)

| ตาราง | หน้าที่ |
|---|---|
| `managers` | ผู้จัดการ 12 คน — ล็อกอินด้วย `manager_code` |
| `superusers` | ผู้ดูแลระบบ (เข้าที่ `/admin`) |
| `areas` | พื้นที่ 26 แห่ง โครงสร้างต้นไม้ผ่าน `parent_id` |
| `walk_themes` | หัวข้อการเดิน 8 หัวข้อ |
| `gemba_plans` | แผนการเดิน |
| `plan_themes` | หัวข้อของแต่ละแผน (สูงสุด 3) |
| `gemba_walk_records` | บันทึกการเดินจริง — `plan_id` เป็น NULL ได้ = Ad-hoc |
| `record_themes` | หัวข้อของแต่ละบันทึก |
| `record_photos` | รูปหน้างาน เก็บ `photo_key` ที่ชี้ไปยัง R2 |
| `record_participants` | ชื่อผู้ร่วมเดิน |
| `change_history` | ร่องรอยการแก้ไขรายฟิลด์ |
| `weekly_focus` + `focus_themes` | ประกาศหัวข้อประจำสัปดาห์ |
| `login_history` | ประวัติการเข้าสู่ระบบ |
| `app_settings` | ตั้งค่าระบบ (แถวเดียว บังคับด้วย `CHECK (id = 1)`) |

### 4.3 กติกาสำคัญที่คนเขียน Worker ต้องรู้

**ต้องใส่ `ORDER BY` ใน `group_concat` เสมอ**

ฟิลด์อาร์เรย์อย่าง `theme_ids` ถูกแตกเป็นตารางลูก เวลาประกอบกลับต้องเรียงตาม `sort_order`
ไม่งั้น `theme_ids[0]` จะเพี้ยน (frontend ใช้ตัวแรกเป็นหัวข้อหลัก)

```sql
-- ถูก
SELECT group_concat(theme_id ORDER BY sort_order) FROM plan_themes WHERE plan_id = ?

-- ผิด — ลำดับไม่แน่นอน
SELECT group_concat(theme_id) FROM plan_themes WHERE plan_id = ?
```

**เวลาไทยต้อง `+7 hours` เสมอ** — D1 ทำงานบน UTC ส่วนแอปใช้ Asia/Bangkok

```sql
date('now', '+7 hours')     -- วันนี้ตามเวลาไทย
```

**พฤติกรรมตอนลบ**

| ลบอะไร | เกิดอะไรขึ้น |
|---|---|
| ผู้จัดการที่มีบันทึกการเดิน | ❌ ถูกบล็อก (RESTRICT) — หลักฐานต้องไม่หาย ให้ใช้ `is_active = 0` แทน |
| พื้นที่ที่มีแผน/บันทึกผูกอยู่ | ❌ ถูกบล็อก (RESTRICT) |
| แผน | ✅ ได้ — บันทึกที่ผูกอยู่**ไม่หาย** แต่ `plan_id` กลายเป็น NULL (นับเป็น Ad-hoc) |
| บันทึกการเดิน | ✅ ได้ — หัวข้อ/รูป/ผู้ร่วมเดินหายตาม (CASCADE) |

### 4.4 ผลทดสอบ schema (รันจริงบน D1 local)

| รายการ | ผล |
|---|---|
| `schema.sql` | ✅ สร้าง 15 ตาราง + 19 index ไม่มี error |
| `seed.sql` | ✅ 12 ผู้จัดการ · 26 พื้นที่ · 8 หัวข้อ · 10 แผน · 5 บันทึก |
| รัน `seed.sql` ซ้ำ | ✅ ไม่เกิดแถวซ้ำ จำนวนเท่าเดิม |
| วันที่สัมพัทธ์ | ✅ วันนี้ 2026-08-19 (พุธ) → สัปดาห์ 08-16 ถึง 08-22 ถูกต้อง |
| FK RESTRICT | ✅ ลบผู้จัดการ/พื้นที่ที่มีของผูกอยู่ ถูกบล็อก |
| FK SET NULL | ✅ ลบแผนแล้วบันทึกอยู่ต่อ `plan_id` เป็น null |
| FK CASCADE | ✅ ลบบันทึกแล้วหัวข้อ/ผู้ร่วมเดินหายตาม |
| CHECK constraint | ✅ ใส่ `status` นอกรายการที่กำหนด ถูกบล็อก |
| index ถูกใช้จริง | ✅ `SEARCH ... USING INDEX` ไม่ใช่ `SCAN` ทั้งตาราง |

---

## ภาคผนวก ก — ทำไมของเดิมถึงพัง

**อาการ:** เปิดเว็บแล้วค้างที่ "กำลังโหลด Gemba Walk…"

**สาเหตุที่ 1 — GitHub Pages เสิร์ฟไฟล์ดิบ**

GitHub Pages เสิร์ฟไฟล์ตามที่อยู่ใน repo ตรง ๆ ไม่ได้รัน `npm run build` ให้
`index.html` จึงชี้ไปที่ `/src/main.tsx` ซึ่งเป็น TypeScript + JSX ที่เบราว์เซอร์อ่านไม่ออก
สคริปต์ตาย → `<div id="root">` ไม่เคยถูกแทนที่ → เห็นข้อความสำรองค้างอยู่

**สาเหตุที่ 2 — asset path เป็น relative ทั้งที่แอปใช้ client-side routing**

`vite.config.ts` เดิมตั้ง `base: './'` ทำให้ `dist/index.html` อ้างไฟล์เป็น `./assets/index-xxx.js`
พอเปิด deep link เช่น `/coaching/mgr_01` เบราว์เซอร์จะตีความ `./assets/…` เทียบกับ `/coaching/`
กลายเป็นไปขอ `/coaching/assets/index-xxx.js` ซึ่งไม่มีอยู่จริง → 404 → จอขาว

บั๊กนี้ซ่อนตัวอยู่ ถ้าไม่แก้ตอนนี้จะไปโผล่ตอน deploy สำเร็จแล้วพอดี

**สิ่งที่แก้**

| ไฟล์ | สถานะ | แก้อะไร |
|---|---|---|
| `vite.config.ts` | แก้ไข | `base: './'` → `base: '/'` พร้อมคอมเมนต์อธิบายเหตุผล |
| `package.json` | แก้ไข | เพิ่ม script `deploy`, `build:ghpages`, `build:file` + wrangler เป็น devDependency |
| `public/_redirects` | **ใหม่** | SPA fallback `/* /index.html 200` ให้ Cloudflare Pages |
| `.node-version` | **ใหม่** | ตรึง Node 20 ตอน build บน Cloudflare |
| `.github/workflows/deploy.yml` | **ใหม่** | build + deploy ขึ้น GitHub Pages อัตโนมัติทุก push |
| `src/main.tsx` | แก้ไข | ผูก `basename` ของ BrowserRouter กับ `import.meta.env.BASE_URL` |
| `.claude/launch.json` | แก้ไข | เพิ่ม config `gemba-preview` ไว้ทดสอบไฟล์ที่ build แล้ว |
| `README.md` | แก้ไข | อัปเดตวิธีเปิดแบบ `file://` ให้ใช้ `build:file` |
| `.gitignore` | แก้ไข | เพิ่ม `.wrangler` และ `.dev.vars` (กัน secret หลุดขึ้น repo) |

