# bayt-al-arab-chat

نسخة مبدئية لشات — تحتوي على Backend (Node/Express + Socket.IO) وFrontend (Vite + React).

ملف هذا الفرع يقدم scaffold أولي لتشغيل الشات محليًا.

ملفات مضافة:
- backend/: الخادم وملفات الاعتماد
- frontend/: واجهة React بسيطة
- .env.example: أمثلة متغيرات البيئة

تشغيل محلي (محليًا على جهازك):
1) Backend:
   cd backend
   npm install
   ضع متغير MONGO_URI في ملف .env (انظر .env.example)
   npm run dev  # يحتاج nodemon أو npm start

2) Frontend:
   cd frontend
   npm install
   في ملف .env.local ضع VITE_BACKEND_URL=http://localhost:4000
   npm run dev


