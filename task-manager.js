#!/usr/bin/env node
/**
 * Task Manager - מנוע ניהול משימות פנימי
 * מטפל בכל הלוגיקה של משימות, הערות, ואנשים
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database');
const TASKS_FILE = path.join(DB_PATH, 'tasks.json');
const NOTES_FILE = path.join(DB_PATH, 'notes.json');
const PEOPLE_FILE = path.join(DB_PATH, 'people.json');

// ========== Utility Functions ==========

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Error loading ${file}:`, err.message);
    return null;
  }
}

function saveJSON(file, data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error saving ${file}:`, err.message);
    return false;
  }
}

// ========== Task Management ==========

class TaskManager {
  constructor() {
    this.tasks = loadJSON(TASKS_FILE);
    this.notes = loadJSON(NOTES_FILE);
    this.people = loadJSON(PEOPLE_FILE);
  }

  // יצירת משימה חדשה
  createTask(data) {
    const task = {
      id: this.tasks.nextId++,
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo', // todo, in-progress, done
      priority: data.priority || 'medium', // low, medium, high, urgent
      assignedTo: data.assignedTo || null, // person ID
      deadline: data.deadline || null,
      scheduledDate: data.scheduledDate || null, // תאריך ביצוע
      scheduledTime: data.scheduledTime || null,
      estimatedDuration: data.estimatedDuration || null, // בדקות
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      reminders: data.reminders || [] // [{date, sent: boolean}]
    };

    this.tasks.tasks.push(task);
    saveJSON(TASKS_FILE, this.tasks);
    return task;
  }

  // עדכון משימה
  updateTask(id, updates) {
    const task = this.tasks.tasks.find(t => t.id === id);
    if (!task) return null;

    Object.assign(task, updates);
    task.updatedAt = new Date().toISOString();

    if (updates.status === 'done' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }

    saveJSON(TASKS_FILE, this.tasks);
    return task;
  }

  // מחיקת משימה
  deleteTask(id) {
    const index = this.tasks.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.tasks.tasks.splice(index, 1);
    saveJSON(TASKS_FILE, this.tasks);
    return true;
  }

  // שליפת משימות
  getTasks(filters = {}) {
    let tasks = [...this.tasks.tasks];

    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
    }

    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter(t => 
        filters.tags.some(tag => t.tags.includes(tag))
      );
    }

    // מיון לפי עדיפות ותאריך יעד
    tasks.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return tasks;
  }

  // חיפוש משימות
  searchTasks(query) {
    const lowerQuery = query.toLowerCase();
    return this.tasks.tasks.filter(t => 
      t.title.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // משימות שצריך להזכיר עליהן היום
  getTasksNeedingReminder() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    return this.tasks.tasks.filter(t => {
      if (t.status === 'done') return false;

      // משימה עם deadline היום או מחר
      if (t.deadline) {
        const deadline = new Date(t.deadline);
        const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 1 && daysUntil >= 0) return true;
      }

      // משימה מתוזמנת להיום
      if (t.scheduledDate === today) return true;

      return false;
    });
  }

  // ========== Notes Management ==========

  createNote(data) {
    const note = {
      id: this.notes.nextId++,
      content: data.content,
      tags: data.tags || [],
      context: data.context || '', // הקשר נוסף
      relatedTaskId: data.relatedTaskId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.notes.notes.push(note);
    saveJSON(NOTES_FILE, this.notes);
    return note;
  }

  searchNotes(query) {
    const lowerQuery = query.toLowerCase();
    return this.notes.notes.filter(n =>
      n.content.toLowerCase().includes(lowerQuery) ||
      n.context.toLowerCase().includes(lowerQuery) ||
      n.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  getNotesByDate(startDate, endDate) {
    return this.notes.notes.filter(n => {
      const noteDate = new Date(n.createdAt);
      return noteDate >= new Date(startDate) && noteDate <= new Date(endDate);
    });
  }

  // ========== People Management ==========

  getPerson(identifier) {
    // חיפוש לפי ID, שם, או אימייל
    return this.people.people.find(p =>
      p.id === identifier ||
      p.name === identifier ||
      p.email === identifier
    );
  }

  addPerson(data) {
    const person = {
      id: this.people.nextId++,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || 'collaborator',
      notes: data.notes || ''
    };

    this.people.people.push(person);
    saveJSON(PEOPLE_FILE, this.people);
    return person;
  }

  // ========== Smart Task Detection ==========

  // ניסיון לזהות משימה מתוך טקסט חופשי
  detectTaskFromText(text) {
    const detected = {
      isTask: false,
      title: '',
      deadline: null,
      assignedTo: null,
      priority: 'medium'
    };

    // מילות מפתח למשימות
    const taskKeywords = ['תזכיר', 'תזכורת', 'משימה', 'צריך', 'חייב', 'לעשות'];
    const hasTaskKeyword = taskKeywords.some(kw => text.includes(kw));

    if (hasTaskKeyword) {
      detected.isTask = true;
      detected.title = text.substring(0, 100); // נקצר אם ארוך מדי
    }

    // זיהוי תאריך
    const datePatterns = [
      /עד (\d{1,2})\/(\d{1,2})/,
      /עד מחר/i,
      /עד היום/i,
      /עד הערב/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        // כאן צריך לוגיקה יותר מתוחכמת לפרסור תאריכים
        detected.deadline = 'detected'; // placeholder
      }
    }

    // זיהוי אדם מוקצה
    this.people.people.forEach(person => {
      if (text.includes(person.name)) {
        detected.assignedTo = person.id;
      }
    });

    // זיהוי עדיפות
    if (text.includes('דחוף') || text.includes('חשוב')) {
      detected.priority = 'urgent';
    } else if (text.includes('לא דחוף')) {
      detected.priority = 'low';
    }

    return detected;
  }
}

// ========== CLI Interface ==========

function main() {
  const tm = new TaskManager();
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: task-manager.js <command> [args...]');
    console.log('Commands: create, list, update, delete, search, remind');
    return;
  }

  switch (command) {
    case 'create':
      const task = tm.createTask({
        title: args[1] || 'New Task',
        description: args[2] || ''
      });
      console.log('Created:', JSON.stringify(task, null, 2));
      break;

    case 'list':
      const tasks = tm.getTasks();
      console.log(JSON.stringify(tasks, null, 2));
      break;

    case 'search':
      const results = tm.searchTasks(args[1] || '');
      console.log(JSON.stringify(results, null, 2));
      break;

    case 'remind':
      const reminders = tm.getTasksNeedingReminder();
      console.log('Tasks needing reminder:', JSON.stringify(reminders, null, 2));
      break;

    default:
      console.log('Unknown command:', command);
  }
}

// אם רץ ישירות (לא כ-require)
if (require.main === module) {
  main();
}

module.exports = TaskManager;
