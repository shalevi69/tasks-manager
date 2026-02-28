/**
 * Task Manager Frontend
 * מנהל את הממשק והאינטראקציה
 */

const API_BASE = 'api';

// Authentication
let API_KEY = localStorage.getItem('task-manager-api-key') || '';

let currentTasks = [];
let currentNotes = [];
let people = [];

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    initializeDateDisplay();
    loadPeople();
    loadStats();
    loadTasks();
    loadNotes();
    setupEventListeners();
});

function initializeDateDisplay() {
    const dateEl = document.getElementById('current-date');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('he-IL', options);
}

// ========== API Calls ==========
async function apiCall(endpoint, options = {}) {
    // Check for API key
    if (!API_KEY) {
        API_KEY = prompt('🔐 הזן API Key:\n\n(מצא את ה-key ב-WhatsApp מאבנר)');
        if (API_KEY) {
            localStorage.setItem('task-manager-api-key', API_KEY);
        } else {
            alert('❌ נדרש API Key לשימוש במערכת');
            return null;
        }
    }

    try {
        const response = await fetch(API_BASE + endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                ...options.headers
            }
        });
        
        // Handle 401 - Invalid API key
        if (response.status === 401) {
            localStorage.removeItem('task-manager-api-key');
            API_KEY = '';
            alert('❌ API Key לא תקף. נסה שוב.');
            return apiCall(endpoint, options);
        }

        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
    } catch (error) {
        console.error('API Error:', error);
        alert('שגיאה: ' + error.message);
        return null;
    }
}

async function loadStats() {
    const stats = await apiCall('/stats');
    if (!stats) return;

    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-todo').textContent = stats.todo;
    document.getElementById('stat-progress').textContent = stats.inProgress;
    document.getElementById('stat-done').textContent = stats.done;
    document.getElementById('stat-overdue').textContent = stats.overdue;
}

async function loadTasks(filters = {}) {
    const params = new URLSearchParams(filters);
    const tasks = await apiCall('/tasks?' + params);
    if (!tasks) return;

    currentTasks = tasks;
    renderTasks(tasks);
}

async function loadNotes() {
    const notes = await apiCall('/notes');
    if (!notes) return;

    currentNotes = notes;
    renderNotes(notes);
}

async function loadPeople() {
    people = await apiCall('/people');
    populatePeopleDropdown();
}

function populatePeopleDropdown() {
    const select = document.getElementById('task-assigned');
    select.innerHTML = '<option value="">לא מוקצה</option>';
    people.forEach(person => {
        const option = document.createElement('option');
        option.value = person.id;
        option.textContent = person.name;
        select.appendChild(option);
    });
}

// ========== Rendering ==========
function renderTasks(tasks) {
    const container = document.getElementById('tasks-list');
    
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>אין משימות להצגה</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-card status-${task.status} priority-${task.priority}" data-id="${task.id}">
            <div class="task-header">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-badges">
                    <span class="badge status status-${task.status}">${getStatusLabel(task.status)}</span>
                    ${task.priority === 'urgent' || task.priority === 'high' ? 
                        `<span class="badge priority ${task.priority}">${getPriorityLabel(task.priority)}</span>` : ''}
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                ${task.deadline ? `
                    <div class="task-meta-item ${isOverdue(task) ? 'overdue' : ''}">
                        📅 ${formatDate(task.deadline)}
                    </div>
                ` : ''}
                ${task.scheduledDate ? `
                    <div class="task-meta-item">
                        🕐 ${formatDate(task.scheduledDate)} ${task.scheduledTime || ''}
                    </div>
                ` : ''}
                ${task.assignedTo ? `
                    <div class="task-meta-item">
                        👤 ${getPersonName(task.assignedTo)}
                    </div>
                ` : ''}
                ${task.estimatedDuration ? `
                    <div class="task-meta-item">
                        ⏱️ ${task.estimatedDuration} דקות
                    </div>
                ` : ''}
            </div>
            ${task.tags.length > 0 ? `
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', () => {
            const taskId = parseInt(card.dataset.id);
            editTask(taskId);
        });
    });
}

function renderNotes(notes) {
    const container = document.getElementById('notes-list');
    
    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>אין הערות במאגר</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notes.map(note => `
        <div class="note-card" data-id="${note.id}">
            <div class="note-content">${escapeHtml(note.content)}</div>
            ${note.context ? `<div class="task-description">הקשר: ${escapeHtml(note.context)}</div>` : ''}
            <div class="note-meta">
                <span>${formatDateTime(note.createdAt)}</span>
                ${note.tags.length > 0 ? `
                    <div class="task-tags">
                        ${note.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ========== Event Listeners ==========
function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    // New Task
    document.getElementById('btn-new-task').addEventListener('click', () => {
        openTaskModal();
    });

    // New Note
    document.getElementById('btn-new-note').addEventListener('click', () => {
        openNoteModal();
    });

    // Task Form Submit
    document.getElementById('task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTask();
    });

    // Note Form Submit
    document.getElementById('note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveNote();
    });

    // Cancel buttons
    document.getElementById('btn-cancel').addEventListener('click', closeTaskModal);
    document.getElementById('btn-cancel-note').addEventListener('click', closeNoteModal);

    // Close modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    // Search & Filters
    document.getElementById('task-search').addEventListener('input', debounce(searchTasks, 300));
    document.getElementById('task-filter-status').addEventListener('change', filterTasks);
    document.getElementById('task-filter-priority').addEventListener('change', filterTasks);
    document.getElementById('note-search').addEventListener('input', debounce(searchNotes, 300));

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-section`).classList.add('active');
}

// ========== Task Modal ==========
function openTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    
    form.reset();
    
    if (task) {
        document.getElementById('modal-title').textContent = 'עריכת משימה';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-deadline').value = task.deadline || '';
        document.getElementById('task-scheduled-date').value = task.scheduledDate || '';
        document.getElementById('task-scheduled-time').value = task.scheduledTime || '';
        document.getElementById('task-duration').value = task.estimatedDuration || '';
        document.getElementById('task-assigned').value = task.assignedTo || '';
        document.getElementById('task-tags').value = task.tags.join(', ');
    } else {
        document.getElementById('modal-title').textContent = 'משימה חדשה';
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
}

function editTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    if (task) openTaskModal(task);
}

async function saveTask() {
    const taskId = document.getElementById('task-id').value;
    const tags = document.getElementById('task-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        status: document.getElementById('task-status').value,
        priority: document.getElementById('task-priority').value,
        deadline: document.getElementById('task-deadline').value || null,
        scheduledDate: document.getElementById('task-scheduled-date').value || null,
        scheduledTime: document.getElementById('task-scheduled-time').value || null,
        estimatedDuration: parseInt(document.getElementById('task-duration').value) || null,
        assignedTo: parseInt(document.getElementById('task-assigned').value) || null,
        tags: tags
    };

    let result;
    if (taskId) {
        result = await apiCall(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    } else {
        result = await apiCall('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    if (result) {
        closeTaskModal();
        await loadTasks();
        await loadStats();
    }
}

// ========== Note Modal ==========
function openNoteModal() {
    const modal = document.getElementById('note-modal');
    const form = document.getElementById('note-form');
    form.reset();
    modal.classList.add('active');
}

function closeNoteModal() {
    document.getElementById('note-modal').classList.remove('active');
}

async function saveNote() {
    const tags = document.getElementById('note-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);

    const noteData = {
        content: document.getElementById('note-content').value,
        context: document.getElementById('note-context').value,
        tags: tags
    };

    const result = await apiCall('/notes', {
        method: 'POST',
        body: JSON.stringify(noteData)
    });

    if (result) {
        closeNoteModal();
        await loadNotes();
        await loadStats();
    }
}

// ========== Search & Filter ==========
async function searchTasks() {
    const query = document.getElementById('task-search').value;
    if (query.trim()) {
        const results = await apiCall('/tasks/search?q=' + encodeURIComponent(query));
        if (results) renderTasks(results);
    } else {
        await loadTasks();
    }
}

async function filterTasks() {
    const status = document.getElementById('task-filter-status').value;
    const priority = document.getElementById('task-filter-priority').value;
    
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    
    await loadTasks(filters);
}

async function searchNotes() {
    const query = document.getElementById('note-search').value;
    if (query.trim()) {
        const results = await apiCall('/notes/search?q=' + encodeURIComponent(query));
        if (results) renderNotes(results);
    } else {
        await loadNotes();
    }
}

// ========== Utilities ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isOverdue(task) {
    if (!task.deadline || task.status === 'done') return false;
    return new Date(task.deadline) < new Date();
}

function getStatusLabel(status) {
    const labels = {
        'todo': 'לביצוע',
        'in-progress': 'בתהליך',
        'done': 'הושלם'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'urgent': 'דחוף',
        'high': 'גבוה',
        'medium': 'בינוני',
        'low': 'נמוך'
    };
    return labels[priority] || priority;
}

function getPersonName(personId) {
    const person = people.find(p => p.id === personId);
    return person ? person.name : 'לא ידוע';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
