const form = document.getElementById('todo-form');
const input = document.getElementById('new-task');
const dueInput = document.getElementById('due-date');
const priorityInput = document.getElementById('priority');
const categorySelect = document.getElementById('category-select');
const taskList = document.getElementById('task-list');
const archiveList = document.getElementById('archive-list');

const newCatBtn = document.getElementById('add-category-btn');
const newCatForm = document.getElementById('new-category-form');
const newCatName = document.getElementById('new-category-name');
const newCatColor = document.getElementById('new-category-color');
const newCatIcon = document.getElementById('new-category-icon');
const saveCatBtn = document.getElementById('save-category');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let archived = JSON.parse(localStorage.getItem('archived')) || [];
let customCategories = JSON.parse(localStorage.getItem('categories')) || {
  "General": { color: "#888", icon: "" },
  "Work": { color: "#007acc", icon: "💼" },
  "Personal": { color: "#e91e63", icon: "🏠" },
  "Errands": { color: "#4caf50", icon: "🛒" }
};

let currentFilter = 'all';

function saveAll() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('archived', JSON.stringify(archived));
  localStorage.setItem('categories', JSON.stringify(customCategories));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function isLightColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
}

function refreshCategorySelect() {
  categorySelect.innerHTML = '';
  for (let cat in customCategories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = `${customCategories[cat].icon || ''} ${cat}`;
    categorySelect.appendChild(opt);
  }
}

function createTaskElement(task, index, isArchive = false) {
  const li = document.createElement('li');
  li.className = `task-item priority-${task.priority}`;

  const catColor = customCategories[task.category]?.color || '#888';
  li.style.backgroundColor = catColor;
  if (isLightColor(catColor)) li.classList.add('light-text');

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const icon = customCategories[task.category]?.icon || '';
  meta.innerHTML = `
    <strong>${icon} ${task.text}</strong>
    <small>Category: ${task.category}</small>
    <small>Priority: ${task.priority}</small>
    <small>Created: ${formatDate(task.createdAt)}</small>
    ${task.dueDate ? `<small>Due: ${formatDate(task.dueDate)}</small>` : ''}
    ${task.completedAt ? `<small>Completed: ${formatDate(task.completedAt)}</small>` : ''}
  `;
  li.appendChild(meta);

  if (task.subtasks && task.subtasks.length) {
    const subList = document.createElement('ul');
    subList.className = 'subtasks';
    task.subtasks.forEach((s, i) => {
      const subItem = document.createElement('li');
      subItem.innerHTML = `<input type="checkbox" ${s.done ? 'checked' : ''}/> ${s.text}`;
      subItem.querySelector('input').onchange = () => {
        s.done = !s.done;
        saveAll();
      };
      subList.appendChild(subItem);
    });
    li.appendChild(subList);
  }

  if (!isArchive) {
    const buttons = document.createElement('div');
    buttons.className = 'task-buttons';

    const completeBtn = document.createElement('button');
    completeBtn.textContent = '✓';
    completeBtn.onclick = () => {
      tasks.splice(index, 1);
      task.done = true;
      task.completedAt = new Date().toISOString();
      archived.push(task);
      saveAll();
      renderAll();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = () => {
      tasks.splice(index, 1);
      saveAll();
      renderAll();
    };

    buttons.appendChild(completeBtn);
    buttons.appendChild(deleteBtn);
    li.appendChild(buttons);
  }

  return li;
}

function renderGroupedTasks(container, taskArray, isArchive = false) {
  container.innerHTML = '';
  const grouped = {};

  taskArray.forEach((task, index) => {
    if (!grouped[task.category]) grouped[task.category] = [];
    grouped[task.category].push({ ...task, originalIndex: index });
  });

  for (let category in grouped) {
    const section = document.createElement('div');
    section.className = 'category-section';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.textContent = `${customCategories[category]?.icon || ''} ${category}`;
    header.style.backgroundColor = customCategories[category]?.color;
    if (isLightColor(customCategories[category]?.color)) header.style.color = '#000';
    else header.style.color = '#fff';

    const taskGroup = document.createElement('ul');
    taskGroup.className = 'category-tasks';

    grouped[category].forEach(({ ...task }, i) => {
      const idx = grouped[category][i].originalIndex;
      taskGroup.appendChild(createTaskElement(task, idx, isArchive));
    });

    header.addEventListener('click', () => taskGroup.classList.toggle('collapsed'));

    section.appendChild(header);
    section.appendChild(taskGroup);
    container.appendChild(section);

    if (!isArchive) Sortable.create(taskGroup, {
      animation: 150,
      onEnd: () => {
        const flat = [...taskGroup.children].map(el => el.querySelector('strong').textContent.trim());
        const reordered = grouped[category].sort((a, b) => {
          return flat.indexOf(`${customCategories[a.category]?.icon || ''} ${a.text}`) -
                 flat.indexOf(`${customCategories[b.category]?.icon || ''} ${b.text}`);
        });
        let cursor = 0;
        tasks = tasks.filter(t => t.category !== category).concat(reordered.map(t => ({ ...t, done: false })));
        saveAll();
      }
    });
  }
}

function renderAll() {
  const filtered = tasks.filter(task => {
    const now = new Date();
    if (currentFilter === 'today') {
      return task.dueDate && new Date(task.dueDate).toDateString() === now.toDateString();
    } else if (currentFilter === 'overdue') {
      return task.dueDate && new Date(task.dueDate) < now;
    } else if (currentFilter === 'high') {
      return task.priority === 'high';
    }
    return true;
  });

  renderGroupedTasks(taskList, filtered, false);
  renderGroupedTasks(archiveList, archived, true);
}

// Category handling
newCatBtn.onclick = () => {
  newCatForm.style.display = newCatForm.style.display === 'none' ? 'flex' : 'none';
};
saveCatBtn.onclick = () => {
  const name = newCatName.value.trim();
  if (!name) return;
  customCategories[name] = {
    color: newCatColor.value,
    icon: newCatIcon.value.trim()
  };
  newCatName.value = '';
  newCatColor.value = '#000000';
  newCatIcon.value = '';
  saveAll();
  refreshCategorySelect();
  newCatForm.style.display = 'none';
};

// Filter logic
document.querySelectorAll('#filters button').forEach(btn => {
  btn.onclick = () => {
    currentFilter = btn.dataset.filter;
    renderAll();
  };
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  const category = categorySelect.value;
  const priority = priorityInput.value;
  const dueDate = dueInput.value || null;

  if (text && category) {
    const task = {
      text,
      category,
      priority,
      createdAt: new Date().toISOString(),
      dueDate,
      completedAt: null,
      done: false,
      subtasks: []
    };

    tasks.push(task);
    scheduleReminder(task);
    saveAll();
    renderAll();
    input.value = '';
    dueInput.value = '';
  }
});

// Notification scheduling
function scheduleReminder(task) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") Notification.requestPermission();

  if (task.dueDate) {
    const delay = new Date(task.dueDate) - new Date();
    if (delay > 0 && delay < 86400000) {
      setTimeout(() => {
        new Notification("Task Due", {
          body: `${task.text} is due now!`
        });
      }, delay);
    }
  }
}

// Init
refreshCategorySelect();
renderAll();
