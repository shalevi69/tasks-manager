# 🎯 מערכת ניהול משימות ותזכורות

**מערכת מלאה לניהול משימות, תזכורות ומאגר מידע - מיוחד לשלו יפרח**

---

## ✅ מה הושלם עד כה

### 🔧 Backend (מנוע פנימי)
- ✅ **Task Manager (`task-manager.js`)** - מנוע ניהול משימות מלא
  - יצירה, עדכון, מחיקה של משימות
  - חיפוש וסינון מתקדם
  - ניהול אנשים (הקצאות)
  - מערכת תגיות
  - זיהוי משימות חכם מטקסט חופשי
  
- ✅ **מאגר נתונים (JSON)**
  - `database/tasks.json` - משימות
  - `database/notes.json` - הערות ומידע
  - `database/people.json` - אנשי קשר

### 🌐 Web Server
- ✅ **Express Server** רץ על http://localhost:3456
- ✅ **REST API מלא**:
  - `GET /api/tasks` - רשימת משימות (+ סינונים)
  - `POST /api/tasks` - יצירת משימה
  - `PUT /api/tasks/:id` - עדכון משימה
  - `DELETE /api/tasks/:id` - מחיקת משימה
  - `GET /api/tasks/search` - חיפוש משימות
  - `GET /api/notes` - רשימת הערות
  - `POST /api/notes` - יצירת הערה
  - `GET /api/notes/search` - חיפוש הערות
  - `GET /api/people` - רשימת אנשים
  - `POST /api/people` - הוספת אדם
  - `GET /api/stats` - סטטיסטיקות

### 💻 Frontend (ממשק משתמש)
- ✅ **אתר מלא ומעוצב**
  - דף בית עם סטטיסטיקות
  - טאבים: משימות / מאגר מידע
  - רשימת משימות עם כרטיסיות
  - חיפוש וסינון
  - Modal לעריכת משימות
  - Modal להוספת הערות
  - עיצוב responsive (מובייל + דסקטופ)
  - RTL (עברית) מלא
  - צבעים וסטטוסים ויזואליים

---

## 🚀 איך להשתמש

### הפעלת השרת
```bash
cd /root/.clawdbot/workspace/tasks/web
node server.js
```

השרת ירוץ על: **http://localhost:3456**

### גישה לאתר
פתח דפדפן וגלוש ל: **http://localhost:3456**

### CLI (שורת פקודה)
```bash
cd /root/.clawdbot/workspace/tasks

# יצירת משימה
node task-manager.js create "כותרת המשימה" "תיאור"

# רשימת משימות
node task-manager.js list

# חיפוש
node task-manager.js search "מילת חיפוש"

# משימות שצריך להזכיר
node task-manager.js remind
```

---

## ⏳ מה עוד צריך (לבוקר)

### 1. אבטחה - Google OAuth
**דורש את שלו:**
- הגדרת Google Cloud Project
- OAuth 2.0 credentials
- הוספת shalevi69@gmail.com למשתמשים מורשים

**קבצים להוסיף:**
- `web/auth.js` - מודול אימות
- עדכון `server.js` עם middleware לאימות

### 2. אינטגרציה עם Google Calendar
**דורש את שלו:**
- הפעלת Calendar API
- הוספת scope ל-OAuth

**פיצ'רים:**
- סנכרון משימות עם תאריכי ביצוע ליומן
- יצירת events אוטומטית
- עדכון דו-כיווני

### 3. התראות WhatsApp אוטומטיות
**כבר יש לי גישה ל-WhatsApp!**

צריך לבנות:
- Cron job שבודק משימות עם deadline מתקרב
- שליחת הודעות דרך קבוצת "משימות ותזכורות"
- לוגיקה חכמה - מתי להזכיר (יום לפני / בוקר ביום / שעתיים לפני)

### 4. הקצאת משימות לאחרים
**כמעט מוכן!**

צריך:
- מנגנון שליחת התראה למבצע (WhatsApp / Email)
- מעקב אחרי משימות שהוקצו
- תזכורות למבצעים

### 5. Expose לאינטרנט
**אופציות:**
- ngrok (זמני, לפיתוח)
- Reverse proxy עם domain
- Deploy לשרת ייעודי

---

## 📁 מבנה הפרויקט

```
/root/.clawdbot/workspace/tasks/
├── README.md                  # המסמך הזה
├── TASKS_PROJECT_PLAN.md     # תוכנית מפורטת
├── task-manager.js            # המנוע הפנימי
├── database/
│   ├── tasks.json            # משימות
│   ├── notes.json            # הערות
│   └── people.json           # אנשים
└── web/
    ├── package.json
    ├── server.js             # Express server
    ├── server.log            # לוג השרת
    └── public/
        ├── index.html        # הממשק הראשי
        ├── style.css         # עיצוב
        └── app.js            # לוגיקת Frontend
```

---

## 🎨 Features Highlights

✅ **עיצוב מקצועי ונקי**  
✅ **RTL מלא** - עברית כשורה  
✅ **Responsive** - עובד מעולה במובייל  
✅ **חיפוש בזמן אמת**  
✅ **סינון לפי סטטוס ועדיפות**  
✅ **סטטיסטיקות ודשבורד**  
✅ **תגיות וקטגוריות**  
✅ **הקצאת משימות לאנשים**  
✅ **תאריכי יעד ותזמון**  
✅ **מאגר מידע נפרד**  

---

## 🔐 Security (לטיפול בבוקר)

**כרגע:** השרת פתוח ללא אימות (localhost only)

**צריך להוסיף:**
1. Google OAuth 2.0
2. Session management
3. HTTPS (אם exposed)
4. Rate limiting
5. Input validation

---

## 🚧 Known Issues

- ❌ **אין אימות** - כל מי שיכול לגשת לשרת יכול לראות ולערוך
- ❌ **לא exposed** - רק localhost, אי אפשר לגשת מבחוץ
- ❌ **אין התראות אוטומטיות** - צריך לבנות
- ❌ **אין סנכרון ליומן** - צריך אינטגרציה עם Google Calendar

---

## 📝 הערות לשלו

**בבוקר כשתקום:**

1. **תפתח את האתר** בדפדפן:  
   `http://localhost:3456`

2. **תבדוק שהכל עובד** - נסה ליצור משימה, לחפש, לערוך

3. **נעבור על הצעדים הבאים ביחד:**
   - הגדרת Google OAuth
   - חיבור ליומן
   - התראות אוטומטיות
   - Expose לאינטרנט (אם צריך)

4. **נפתח את קבוצת WhatsApp "משימות ותזכורות"** ונתחיל להשתמש!

---

**המערכת מוכנה ופועלת! 🎉**  
**מחכה לך בבוקר להמשך! 💪**

---

**נבנה על ידי:** אבנר 🤖  
**תאריך:** 2026-02-28  
**זמן בנייה:** לילה אחד 🌙
