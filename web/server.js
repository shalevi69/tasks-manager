#!/usr/bin/env node
/**
 * Task Manager Web Server
 * שרת Express לניהול משימות ומאגר מידע
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const TaskManager = require('../task-manager.js');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Task Manager
const tm = new TaskManager();

// ========== API Routes ==========

// Tasks
app.get('/api/tasks', (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : undefined,
      priority: req.query.priority
    };
    const tasks = tm.getTasks(filters);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = tm.createTask(req.body);
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const task = tm.updateTask(id, req.body);
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
    const deleted = tm.deleteTask(id);
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
    const results = tm.searchTasks(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notes
app.get('/api/notes', (req, res) => {
  try {
    const notes = tm.notes.notes;
    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const note = tm.createNote(req.body);
    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/notes/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const results = tm.searchNotes(query);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// People
app.get('/api/people', (req, res) => {
  try {
    res.json({ success: true, data: tm.people.people });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/people', (req, res) => {
  try {
    const person = tm.addPerson(req.body);
    res.json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Statistics
app.get('/api/stats', (req, res) => {
  try {
    const allTasks = tm.tasks.tasks;
    const stats = {
      total: allTasks.length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      inProgress: allTasks.filter(t => t.status === 'in-progress').length,
      done: allTasks.filter(t => t.status === 'done').length,
      overdue: allTasks.filter(t => {
        if (!t.deadline || t.status === 'done') return false;
        return new Date(t.deadline) < new Date();
      }).length,
      totalNotes: tm.notes.notes.length
    };
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
});

module.exports = app;
