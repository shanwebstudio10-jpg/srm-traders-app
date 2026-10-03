# S.R.M. Traders - Website + Admin + WhatsApp (ஒரே Cloudflare project)

ஒரே project-ல் எல்லாம்: Website (`/`), Admin panel (`/admin/`), API (`/api/...`), Database (Cloudflare D1).
npm install வேண்டாம், build command வேண்டாம். அதனால் முன்பு வந்த build errors வராது.

## 1. கணினியில் சோதிக்க (VS Code Terminal)
```
npx wrangler dev
```
முதல்முறை "Ok to proceed?" என்று கேட்டால் `y` அழுத்தவும்.
- Website: http://localhost:8787
- Admin: http://localhost:8787/admin/  (user: `admin`, password: `admin123` - `.dev.vars` file-ல் உள்ளது)

## 2. GitHub-க்கு அனுப்ப
github.com -> New repository -> பெயர் `srm-traders-app` (README சேர்க்க வேண்டாம்). பிறகு:
```
git init
git add .
git commit -m "SRM Traders app"
git branch -M main
git remote add origin https://github.com/shanwebstudio10-jpg/srm-traders-app.git
git push -u origin main
```

## 3. Cloudflare-ல் deploy
1. Workers & Pages -> **Create application** -> **Continue with GitHub** -> `srm-traders-app` repo.
2. Project name: `srm-traders-app`
3. Build command: **காலியாக** | Deploy command: `npx wrangler deploy` | Root directory: `/`
4. **Deploy** அழுத்தவும்.

## 4. Admin password அமைக்க (கட்டாயம்)
Worker `srm-traders-app` -> **Settings -> Variables and Secrets -> Add** (வகை: **Secret**):
- `ADMIN_PASSWORD` = உங்கள் password
- `JWT_SECRET` = நீளமான random எழுத்துக்கள் (30+)

## 5. திறந்து பார்க்க
- Website: `https://srm-traders-app.<உங்கள்-பெயர்>.workers.dev`
- Admin: அதே முகவரி + `/admin/`

முதல் முறை திறக்கும்போது tables தானாக உருவாகும்; Settings-ல் முகவரி, எண்கள் தானாக நிரப்பப்படும்.

## 6. தினசரி பயன்பாடு
- **Admin -> Products:** புதிய product, photo, எடிட், மறைத்தல்.
- **Admin -> Enquiries:** வாடிக்கையாளர் "Get Quote" அல்லது cart மூலம் அனுப்பிய enquiries. Excel (CSV) download.
- **Admin -> Settings:** முகவரி, எண்கள், WhatsApp எண் மாற்றினால் website-ல் உடனே மாறும்.
- Code மாற்றினால்: `git add .` / `git commit -m "update"` / `git push` -> Cloudflare தானாக deploy செய்யும்.

## 7. Domain வாங்கிய பிறகு
Worker -> **Settings -> Domains & Routes -> Add -> Custom domain**. Code மாற்றம் தேவையில்லை.

## Folder அமைப்பு
```
wrangler.toml        Cloudflare அமைப்பு (database id இதில் உள்ளது)
src/                 API (worker.js, auth.js, db.js)
public/              Website (index, products, contact), css, js, images
public/admin/        Admin panel
docs/FUTURE.md       எதிர்காலத்தில் சேர்க்கக்கூடியவை
```
