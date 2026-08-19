# คู่มือติดตั้งและ Deploy — Gemba Walk

คู่มือนี้พาตั้งแต่ deploy หน้าเว็บ ไปจนถึงต่อระบบหลังบ้านบน Cloudflare (D1 + R2 + Worker)

> ส่วนที่ 0–2 พร้อมใช้แล้ว · ส่วนที่ 3–5 (D1 / Worker / เชื่อม Frontend) จะเติมเมื่อทำงานที่ 3–5 เสร็จ

---

## สารบัญ

- [ส่วนที่ 0 — ทำอะไรก่อน (อ่านก่อนเลย)](#ส่วนที่-0--ทำอะไรก่อน-อ่านก่อนเลย)
- [ส่วนที่ 1 — Deploy ขึ้น GitHub Pages (ใช้ URL เดิมได้ทันที)](#ส่วนที่-1--deploy-ขึ้น-github-pages-ใช้-url-เดิมได้ทันที)
- [ส่วนที่ 2 — Deploy ขึ้น Cloudflare Pages (ตัวหลัก)](#ส่วนที่-2--deploy-ขึ้น-cloudflare-pages-ตัวหลัก)
- [ภาคผนวก ก — ทำไมของเดิมถึงพัง](#ภาคผนวก-ก--ทำไมของเดิมถึงพัง)

---

## ส่วนที่ 0 — ทำอะไรก่อน (อ่านก่อนเลย)

**หน้าเว็บที่ยังค้างอยู่ที่ "กำลังโหลด Gemba Walk…" จะไม่หายไปเองจนกว่าจะทำ 2 ขั้นนี้**

โค้ดที่แก้แล้วยังอยู่แค่ในเครื่อง ต้อง push ขึ้น GitHub ก่อน แล้วค่อยเปิดสวิตช์ให้ GitHub build ให้

```bash
git add -A && git commit -m "deploy: build ผ่าน CI + รองรับทั้ง Cloudflare Pages และ GitHub Pages"
```

```bash
git push origin main
```

จากนั้นไปที่ **ส่วนที่ 1** เพื่อเปิดสวิตช์ GitHub Pages (URL เดิมจะใช้ได้ภายในราว 2 นาที)
ส่วน Cloudflare Pages ทำทีหลังได้ ไม่เร่ง — แต่ต้องมีก่อนจะต่อ D1 + Worker ในส่วนถัด ๆ ไป

> โปรเจกต์นี้ตั้งค่าให้ deploy ได้ **ทั้งสองที่พร้อมกันจาก repo เดียว** ไม่ต้องเลือกอย่างใดอย่างหนึ่ง
> เพราะ `basename` ของ router ผูกกับ `import.meta.env.BASE_URL` ซึ่งเปลี่ยนตามคำสั่ง build

---

## ส่วนที่ 1 — Deploy ขึ้น GitHub Pages (ใช้ URL เดิมได้ทันที)

ปลายทาง: <https://topmaha.github.io/Gemba_Audit/>

### 1.1 push โค้ดขึ้นไปก่อน

ทำตามส่วนที่ 0 ให้เรียบร้อย ไฟล์ `.github/workflows/deploy.yml` ต้องอยู่บน `main` แล้ว

### 1.2 เปิดสวิตช์ในหน้า repo (ทำครั้งเดียว)

ขั้นนี้ขาดไม่ได้ ถ้าไม่ทำ workflow จะรันแล้ว fail ที่ job `deploy`

1. เปิด <https://github.com/TopMaha/Gemba_Audit/settings/pages>
2. หัวข้อ **Build and deployment** → ช่อง **Source**
3. เปลี่ยนจาก `Deploy from a branch` เป็น **`GitHub Actions`**
4. ไม่ต้องกด Save (บันทึกเอง)

> ค่าเดิม `Deploy from a branch` คือต้นเหตุของอาการค้างที่ข้อความ "กำลังโหลด…"
> เพราะมันเอาไฟล์ในสาขามาเสิร์ฟดิบ ๆ โดยไม่ build

### 1.3 ดูผลการ build

1. เปิดแท็บ **Actions** ของ repo → จะเห็น workflow ชื่อ **Deploy to GitHub Pages**
2. รอจนติ๊กเขียวครบทั้ง 2 job (`build` และ `deploy`) ใช้เวลาราว 1–2 นาที
3. ถ้าแดง กดเข้าไปดูว่าพังขั้นไหน — ส่วนใหญ่เป็นเพราะยังไม่ได้ทำข้อ 1.2

ครั้งต่อ ๆ ไปแค่ `git push` ก็ deploy ให้เอง

### 1.4 ทดสอบว่าใช้ได้จริง

```bash
curl -s -o /dev/null -w "หน้าแรก: %{http_code}\n" https://topmaha.github.io/Gemba_Audit/
```

```bash
curl -s https://topmaha.github.io/Gemba_Audit/ | grep -o "/Gemba_Audit/assets/[^\"]*"
```

```bash
curl -s -o /dev/null -w "deep link: %{http_code}\n" https://topmaha.github.io/Gemba_Audit/history
```

**เกณฑ์ผ่าน**

- คำสั่งแรกได้ **200**
- คำสั่งที่สองต้องเห็น path ขึ้นต้นด้วย `/Gemba_Audit/assets/` — ถ้าเห็นเป็น `/assets/`
  แปลว่า workflow ไป build ด้วย `npm run build` แทน `npm run build:ghpages`
- คำสั่งที่สามได้ **200 หรือ 404 ก็ถือว่าผ่าน** เพราะ GitHub Pages ตอบสถานะ 404 พร้อมเนื้อหา
  ของ `404.html` (ซึ่งคือแอปทั้งตัว) สิ่งที่ต้องดูจริงคือเปิดในเบราว์เซอร์แล้วแอปขึ้น ไม่ใช่จอขาว
- **ในเบราว์เซอร์:** เปิด URL → ต้องเห็นหน้าเข้าสู่ระบบ ไม่ใช่ "กำลังโหลด Gemba Walk…"
  → ล็อกอินด้วย `1001` → กด F5 กลางหน้า `/Gemba_Audit/plan` → ต้องไม่จอขาว

> **เปิดแล้วยังเห็นข้อความเดิม?** กด `Ctrl` + `Shift` + `R` ล้างแคชก่อน
> เบราว์เซอร์มักจำหน้าเก่าที่พังไว้

### 1.5 ข้อจำกัดที่ต้องรู้

GitHub Pages เป็นแค่ที่วางไฟล์ static — **ต่อ D1 / R2 / Worker ตรงนี้ไม่ได้**
เมื่อถึงขั้นตอนต่อระบบหลังบ้าน API จะอยู่คนละโดเมนกับหน้าเว็บ จึงต้องตั้ง CORS ให้ Worker
อนุญาต origin `https://topmaha.github.io` ด้วย (จะเขียนวิธีไว้ในส่วนถัดไป)

ถ้าอยากได้ same-origin ไม่ต้องยุ่งกับ CORS ให้ใช้ Cloudflare Pages ในส่วนที่ 2 เป็นตัวหลัก
แล้วปล่อย GitHub Pages ไว้เป็นตัวสำรอง

---

## ส่วนที่ 2 — Deploy ขึ้น Cloudflare Pages (ตัวหลัก)

### 2.1 สิ่งที่ต้องมีก่อน

- บัญชี Cloudflare (สมัครฟรีที่ <https://dash.cloudflare.com/sign-up>)
- โค้ดถูก push ขึ้น GitHub แล้ว (`https://github.com/TopMaha/Gemba_Audit`)

### 2.2 ตรวจว่า build ผ่านในเครื่องก่อน

อย่าเพิ่งไปตั้งค่าใน dashboard ถ้ายังไม่ผ่านตรงนี้

```bash
npm ci
```

```bash
npm run build
```

ต้องได้โฟลเดอร์ `dist/` ที่มี `index.html`, `assets/`, และ `_redirects`

ตรวจซ้ำว่า path ใน `dist/index.html` ขึ้นต้นด้วย `/assets/` (ทับหน้า) **ไม่ใช่** `./assets/`

```bash
grep assets dist/index.html
```

### 2.3 ตั้งค่าใน Cloudflare Dashboard

1. เข้า <https://dash.cloudflare.com> → เมนูซ้าย **Workers & Pages**
2. กด **Create** → แท็บ **Pages** → **Connect to Git**
3. กด **Connect GitHub** แล้วอนุญาตให้ Cloudflare เข้าถึง — เลือกเฉพาะ repo `Gemba_Audit`
   ก็พอ ไม่ต้องให้สิทธิ์ทุก repo
4. เลือก repository **`TopMaha/Gemba_Audit`** → **Begin setup**
5. กรอกค่าตามตารางนี้ให้ตรงเป๊ะ

   | ช่อง | ค่าที่ต้องใส่ |
   |---|---|
   | Project name | `gemba-audit` (จะได้ URL `gemba-audit.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | **None** (อย่าเลือก Vite preset — มันจะไปทับ build command) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | เว้นว่าง (โค้ดอยู่ที่ root ของ repo) |

6. กางหัวข้อ **Environment variables (advanced)** แล้วเพิ่ม 1 ตัว

   | ชื่อตัวแปร | ค่า |
   |---|---|
   | `NODE_VERSION` | `20` |

   > ไฟล์ `.node-version` ใน repo ตั้ง `20` ไว้ให้แล้ว แต่ใส่ตัวแปรนี้ซ้ำไว้กันเหนียว
   > เพราะ Vite 6 ต้องการ Node 18 ขึ้นไป ถ้า Cloudflare หยิบ Node เวอร์ชันเก่ามา build จะพัง

   > 💡 ตัวแปร `VITE_API_URL` สำหรับชี้ไปที่ Worker จะมาเพิ่มตรงนี้ทีหลัง (ส่วนที่ 4)
   > ตอนนี้ยังไม่ต้องใส่ แอปยังใช้ข้อมูลในเครื่องได้ตามปกติ

7. กด **Save and Deploy** แล้วรอประมาณ 1–2 นาที
8. เสร็จแล้วจะได้ URL หน้าตาแบบ `https://gemba-audit.pages.dev`

### 2.4 ทดสอบว่าใช้ได้จริง

เปลี่ยน `gemba-audit.pages.dev` เป็นโดเมนจริงที่ได้มา

```bash
curl -s -o /dev/null -w "หน้าแรก: %{http_code}\n" https://gemba-audit.pages.dev/
```

```bash
curl -s -o /dev/null -w "deep link: %{http_code}\n" https://gemba-audit.pages.dev/coaching/mgr_01
```

```bash
curl -s https://gemba-audit.pages.dev/ | grep -o '/assets/[^"]*'
```

**เกณฑ์ผ่าน**

- ทั้งสองคำสั่งแรกต้องได้ **200** (ถ้า deep link ได้ 404 แปลว่า `public/_redirects` ไม่ได้ถูก deploy)
- คำสั่งที่สามต้องเห็น path ขึ้นต้นด้วย `/assets/` เช่น `/assets/index-CwVSporH.js`
- เปิดในเบราว์เซอร์แล้วต้องเห็นหน้าเข้าสู่ระบบ **ไม่ใช่** ข้อความ "กำลังโหลด Gemba Walk…"
  ถ้ายังเห็นข้อความนั้น = สคริปต์โหลดไม่ได้ ให้เปิด DevTools → แท็บ Network ดูว่าไฟล์ไหน 404
- ลองล็อกอินด้วยรหัส `1001` แล้วกดเมนูให้ครบทุกหน้า จากนั้น **กด F5 รีเฟรชกลางหน้า**
  ถ้าไม่จอขาว = SPA fallback ทำงานถูกต้อง

### 2.5 Deploy ครั้งต่อไป

`git push` ขึ้น `main` แล้ว Cloudflare จะ build ให้อัตโนมัติ ไม่ต้องทำอะไรเพิ่ม
ดู log ได้ที่ **Workers & Pages → gemba-audit → Deployments**

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
| `package.json` | แก้ไข | เพิ่ม script `build:file` (= `vite build --base=./`) สำหรับเปิดแบบ `file://` |
| `public/_redirects` | **ใหม่** | SPA fallback `/* /index.html 200` ให้ Cloudflare Pages |
| `.node-version` | **ใหม่** | ตรึง Node 20 ตอน build บน Cloudflare |
| `.github/workflows/deploy.yml` | **ใหม่** | build + deploy ขึ้น GitHub Pages อัตโนมัติทุก push |
| `src/main.tsx` | แก้ไข | ผูก `basename` ของ BrowserRouter กับ `import.meta.env.BASE_URL` |
| `.claude/launch.json` | แก้ไข | เพิ่ม config `gemba-preview` ไว้ทดสอบไฟล์ที่ build แล้ว |
| `README.md` | แก้ไข | อัปเดตวิธีเปิดแบบ `file://` ให้ใช้ `build:file` |

