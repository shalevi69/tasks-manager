#!/usr/bin/env node
/**
 * Task Manager Web Server
 * שרת Express לניהול משימות ומאגר מידע
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const TaskDatabase = require('../db.js');
const { authMiddleware, showCredentials } = require('./auth.js');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors());
app.use(express.json());

// Public static files (no auth needed)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Database
const db = new TaskDatabase();

// ========== API Routes (Protected) ==========

// Apply authentication to all /api/* routes
app.use('/api/*', authMiddleware);

// Tasks
app.get('/api/tasks', (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : undefined,
      priority: req.query.priority
    };
    const tasks = db.getTasks(filters);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = db.createTask(req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const task = db.updateTask(id, req.body);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = db.deleteTask(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tasks/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const results = db.searchTasks(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notes
app.get('/api/notes', (req, res) => {
  try {
    const notes = db.getNotes();
    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const note = db.createNote(req.body);
    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/notes/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const results = db.searchNotes(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// People
app.get('/api/people', (req, res) => {
  try {
    res.json({ success: true, data: db.getPeople() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/people', (req, res) => {
  try {
    const person = db.createPerson(req.body);
    res.json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Task Manager server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 API available at http://0.0.0.0:${PORT}/api`);
  console.log(`🌐 Public access: http://34.69.195.180:${PORT}`);
  console.log('');
  showCredentials();
});

module.exports = app;
