#!/usr/bin/env node
/**
 * SQLite Database Manager
 * מאגר מידע משותף אחד לכל המערכת
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class TaskDatabase {
  constructor(dbPath = null) {
    // Default path: web/database/tasks.db (works on Render)
    this.dbPath = dbPath || path.join(__dirname, 'web', 'database', 'tasks.db');
    
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    
    this.initializeTables();
  }

  initializeTables() {
    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        assignedTo INTEGER,
        deadline TEXT,
        scheduledDate TEXT,
        scheduledTime TEXT,
        estimatedDuration INTEGER,
        tags TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now')),
        completedAt TEXT,
        source TEXT DEFAULT 'web'
      )
    `);

    // Notes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        tags TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now')),
        source TEXT DEFAULT 'web'
      )
    `);

    // People table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT,
        email TEXT,
        phone TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
    `);
  }

  // ========== Tasks ==========

  getTasks(filters = {}) {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.assignedTo !== undefined) {
      query += ' AND assignedTo = ?';
      params.push(filters.assignedTo);
    }
    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    query += ' ORDER BY createdAt DESC';

    const stmt = this.db.prepare(query);
    const tasks = stmt.all(...params);

    // Parse JSON fields
    return tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      reminders: []
    }));
  }

  getTaskById(id) {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const task = stmt.get(id);
    if (!task) return null;

    return {
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      reminders: []
    };
  }

  createTask(taskData) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        title, description, status, priority, assignedTo,
        deadline, scheduledDate, scheduledTime, estimatedDuration,
        tags, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      taskData.title,
      taskData.description || '',
      taskData.status || 'todo',
      taskData.priority || 'medium',
      taskData.assignedTo || null,
      taskData.deadline || null,
      taskData.scheduledDate || null,
      taskData.scheduledTime || null,
      taskData.estimatedDuration || null,
      JSON.stringify(taskData.tags || []),
      taskData.source || 'web'
    );

    return this.getTaskById(result.lastInsertRowid);
  }

  updateTask(id, updates) {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
      
      if (updates.status === 'done') {
        fields.push('completedAt = ?');
        values.push(new Date().toISOString());
      }
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.assignedTo !== undefined) {
      fields.push('assignedTo = ?');
      values.push(updates.assignedTo);
    }
    if (updates.deadline !== undefined) {
      fields.push('deadline = ?');
      values.push(updates.deadline);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.getTaskById(id);
  }

  deleteTask(id) {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  searchTasks(query) {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE title LIKE ? OR description LIKE ?
      ORDER BY createdAt DESC
    `);

    const searchTerm = `%${query}%`;
    const tasks = stmt.all(searchTerm, searchTerm);

    return tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      reminders: []
    }));
  }

  // ========== Notes ==========

  getNotes() {
    const stmt = this.db.prepare('SELECT * FROM notes ORDER BY createdAt DESC');
    const notes = stmt.all();

    return notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));
  }

  createNote(noteData) {
    const stmt = this.db.prepare(`
      INSERT INTO notes (title, content, category, tags, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      noteData.title,
      noteData.content,
      noteData.category || 'general',
      JSON.stringify(noteData.tags || []),
      noteData.source || 'web'
    );

    return this.getNoteById(result.lastInsertRowid);
  }

  getNoteById(id) {
    const stmt = this.db.prepare('SELECT * FROM notes WHERE id = ?');
    const note = stmt.get(id);
    if (!note) return null;

    return {
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    };
  }

  searchNotes(query) {
    const stmt = this.db.prepare(`
      SELECT * FROM notes 
      WHERE title LIKE ? OR content LIKE ?
      ORDER BY createdAt DESC
    `);

    const searchTerm = `%${query}%`;
    const notes = stmt.all(searchTerm, searchTerm);

    return notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));
  }

  // ========== People ==========

  getPeople() {
    const stmt = this.db.prepare('SELECT * FROM people ORDER BY name');
    return stmt.all();
  }

  createPerson(personData) {
    const stmt = this.db.prepare(`
      INSERT INTO people (name, role, email, phone, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      personData.name,
      personData.role || null,
      personData.email || null,
      personData.phone || null,
      personData.notes || null
    );

    return this.getPersonById(result.lastInsertRowid);
  }

  getPersonById(id) {
    const stmt = this.db.prepare('SELECT * FROM people WHERE id = ?');
    return stmt.get(id);
  }

  // ========== Statistics ==========

  getStats() {
    const tasks = this.getTasks();
    const now = new Date();

    return {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => {
        if (!t.deadline || t.status === 'done') return false;
        return new Date(t.deadline) < now;
      }).length,
      totalNotes: this.getNotes().length
    };
  }

  // ========== Utility ==========

  close() {
    this.db.close();
  }

  backup() {
    const backupPath = this.dbPath + '.backup-' + Date.now();
    this.db.backup(backupPath);
    return backupPath;
  }
}

module.exports = TaskDatabase;

// CLI
if (require.main === module) {
  const db = new TaskDatabase();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'stats':
      console.log(JSON.stringify(db.getStats(), null, 2));
      break;
    case 'tasks':
      console.log(JSON.stringify(db.getTasks(), null, 2));
      break;
    case 'backup':
      const backup = db.backup();
      console.log(`Backup created: ${backup}`);
      break;
    default:
      console.log('Usage: node db.js [stats|tasks|backup]');
  }

  db.close();
}
