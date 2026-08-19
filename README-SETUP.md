# คู่มือติดตั้งและ Deploy — Gemba Walk

คู่มือนี้พาตั้งแต่ deploy หน้าเว็บ ไปจนถึงต่อระบบหลังบ้านบน Cloudflare (D1 + R2 + Worker)

## 🟢 สถานะตอนนี้

| ปลายทาง | สถานะ | URL |
|---|---|---|
| **Cloudflare Pages** (ตัวหลัก) | ✅ ใช้งานได้แล้ว | <https://gemba-audit.pages.dev> |
| GitHub Pages (ตัวสำรอง) | ⚠️ รอเปิดสวิตช์ 1 จุด | <https://topmaha.github.io/Gemba_Audit/> |
| D1 + R2 + Worker | ⬜ ยังไม่เริ่ม (งานที่ 3–5) | — |

---

## สารบัญ

- [ส่วนที่ 1 — คำสั่งที่ต้องรู้](#ส่วนที่-1--คำสั่งที่ต้องรู้)
- [ส่วนที่ 2 — Cloudflare Pages (ตัวหลัก · deploy แล้ว)](#ส่วนที่-2--cloudflare-pages-ตัวหลัก--deploy-แล้ว-)
- [ส่วนที่ 3 — GitHub Pages (ตัวสำรอง · ยังไม่ทำงาน)](#ส่วนที่-3--github-pages-ตัวสำรอง--ยังไม่ทำงาน-)
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

ตอนนี้มีแค่ 2 คำสั่ง — ที่เหลือจะเพิ่มเมื่อทำ D1 + R2 + Worker ในงานถัดไป

```bash
npx wrangler login
```

```bash
npx wrangler pages deployment list --project-name=gemba-audit
```

คำสั่งแรกล็อกอิน Cloudflare (ทำครั้งเดียวต่อเครื่อง) คำสั่งที่สองดูประวัติ deploy

> โปรเจกต์ Pages ชื่อ `gemba-audit` ถูกสร้างไว้ให้แล้วด้วย `wrangler pages project create`
> ไม่ต้องสร้างซ้ำ

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

