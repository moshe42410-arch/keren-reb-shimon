# 🔑 איך למצוא את ה-API KEY שלך

## שלב 1: לך ל-Google Cloud Console

1. פתח את הדפדפן ולך ל: **https://console.cloud.google.com/**
2. התחבר עם אותו חשבון Google שבו יצרת את ה-API Key

## שלב 2: בחר את הפרויקט

1. לחץ על שם הפרויקט למעלה (אם יש לך כמה פרויקטים)
2. אם אין לך פרויקט, צור אחד חדש

## שלב 3: מצא את ה-API Key

### דרך 1: דרך Credentials (הכי קל)

1. בתפריט השמאלי, לחץ על **"APIs & Services"** (או "APIs והשירותים")
2. לחץ על **"Credentials"** (או "אישורים")
3. תמצא רשימה של **"API keys"**
4. לחץ על ה-API Key שלך (או "Create Credentials" > "API Key" אם אין לך)
5. **העתק את המפתח** - זה ה-`VITE_GOOGLE_SHEETS_API_KEY` שלך

### דרך 2: דרך IAM & Admin

1. בתפריט השמאלי, לחץ על **"IAM & Admin"**
2. לחץ על **"Service Accounts"**
3. אם יש לך Service Account, תראה אותו כאן

---

## ⚠️ אם אין לך API Key

אם אין לך API Key, צור אחד חדש:

1. לך ל-**"APIs & Services" > "Credentials"**
2. לחץ על **"Create Credentials" > "API Key"**
3. העתק את המפתח שנוצר
4. (מומלץ) לחץ על "Restrict Key" והגבל אותו רק ל-**Google Sheets API**

---

## 📝 הערה חשובה

אני לא יכול לשלוח לך את ה-API Key שלך כי:
- זה מידע פרטי שלך
- רק אתה יכול לגשת לחשבון Google שלך
- זה חלק מהאבטחה של Google

אבל זה לוקח רק 2 דקות למצוא! 😊
