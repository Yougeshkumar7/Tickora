// Tickora - Habit Tracking Application
// All data stored in localStorage

// ==================== SECURITY & UTILITIES ====================

// Sanitize user input to prevent XSS
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.textContent || div.innerText || '';
}

// Validate activity name
function validateActivityName(name) {
    if (!name || typeof name !== 'string') return false;
    const sanitized = sanitizeInput(name).trim();
    if (sanitized.length === 0 || sanitized.length > 100) return false;
    return sanitized;
}

// Debounce function for performance
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

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== DATA MANAGEMENT ====================

// Get today's date as YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Get current week dates (last 7 days)
function getWeekDates() {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// Get all dates in current month
function getMonthDates() {
    const dates = [];
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// Initialize data structure
function initializeData() {
    const today = getTodayDate();
    const data = {
        activities: [],
        dailyData: {},
        lastResetDate: today,
        theme: 'light',
        appOpens: [],
        currentStreak: 0,
        bestStreak: 0,
        lastOpenDate: today
    };
    localStorage.setItem('tickoraData', JSON.stringify(data));
    return data;
}

// Get data from localStorage
function getData() {
    try {
        const stored = localStorage.getItem('tickoraData');
        if (!stored) {
            return initializeData();
        }
        const parsed = JSON.parse(stored);
        // Validate data structure
        if (!parsed || typeof parsed !== 'object') {
            return initializeData();
        }
        // Ensure required properties exist
        if (!Array.isArray(parsed.activities)) parsed.activities = [];
        if (typeof parsed.dailyData !== 'object') parsed.dailyData = {};
        if (!Array.isArray(parsed.appOpens)) parsed.appOpens = [];
        return parsed;
    } catch (error) {
        console.error('Error reading data:', error);
        return initializeData();
    }
}

// Save data to localStorage
function saveData(data) {
    try {
        // Validate data before saving
        if (!data || typeof data !== 'object') {
            console.error('Invalid data structure');
            return;
        }
        // Limit data size to prevent localStorage overflow
        const dataString = JSON.stringify(data);
        if (dataString.length > 5000000) { // ~5MB limit
            console.error('Data too large to save');
            return;
        }
        localStorage.setItem('tickoraData', dataString);
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded');
            alert('Storage limit reached. Please delete some old data.');
        } else {
            console.error('Error saving data:', error);
        }
    }
}

// Check and reset for new day
function checkDailyReset() {
    const data = getData();
    const today = getTodayDate();
    
    if (data.lastResetDate !== today) {
        data.lastResetDate = today;
        saveData(data);
    }
}

// Track app open for streak
function trackAppOpen() {
    const data = getData();
    const today = getTodayDate();
    
    if (!data.appOpens) {
        data.appOpens = [];
    }
    
    if (!data.appOpens.includes(today)) {
        data.appOpens.push(today);
        updateStreak(data);
        data.lastOpenDate = today;
        saveData(data);
    }
}

// Update streak based on app opens
function updateStreak(data) {
    if (!data.appOpens || data.appOpens.length === 0) {
        data.currentStreak = 0;
        data.bestStreak = 0;
        return;
    }
    
    const sortedDates = data.appOpens.sort();
    const today = getTodayDate();
    const todayDate = new Date(today);
    
    let currentStreak = 0;
    let checkDate = new Date(todayDate);
    
    if (sortedDates.includes(today)) {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
        
        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (sortedDates.includes(dateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    } else {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().split('T')[0];
        
        if (sortedDates.includes(yesterdayStr)) {
            currentStreak = 1;
            checkDate.setDate(checkDate.getDate() - 1);
            
            while (true) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (sortedDates.includes(dateStr)) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }
    }
    
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDatesObj = sortedDates.map(d => new Date(d)).sort((a, b) => a - b);
    
    for (let i = 0; i < sortedDatesObj.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prevDate = new Date(sortedDatesObj[i - 1]);
            const currDate = new Date(sortedDatesObj[i]);
            const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }
    }
    bestStreak = Math.max(bestStreak, tempStreak, currentStreak);
    
    data.currentStreak = currentStreak;
    data.bestStreak = bestStreak;
}

// ==================== ACTIVITIES MANAGEMENT ====================

// Add new activity
function addActivity(name) {
    const validatedName = validateActivityName(name);
    if (!validatedName) {
        alert('Please enter a valid activity name (1-100 characters).');
        return;
    }
    
    const data = getData();
    
    if (data.activities.includes(validatedName)) {
        alert('This activity already exists!');
        return;
    }
    
    if (data.activities.length >= 50) {
        alert('Maximum 50 activities allowed.');
        return;
    }
    
    data.activities.push(validatedName);
    saveData(data);
    renderActivities();
    updateProgress();
    generateCalendar();
}

// Delete activity
function deleteActivity(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    
    const data = getData();
    data.activities = data.activities.filter(a => a !== name);
    
    Object.keys(data.dailyData).forEach(date => {
        if (data.dailyData[date][name] !== undefined) {
            delete data.dailyData[date][name];
        }
    });
    
    saveData(data);
    renderActivities();
    updateProgress();
    updateWeeklyStats();
    updateMonthlyStats();
    updateStreakDisplay();
    generateCalendar();
}

// Toggle activity completion
function toggleActivity(activityName) {
    const data = getData();
    const today = getTodayDate();
    
    if (!data.dailyData[today]) {
        data.dailyData[today] = {};
    }
    
    const currentStatus = data.dailyData[today][activityName] || false;
    data.dailyData[today][activityName] = !currentStatus;
    
    saveData(data);
    updateProgress();
    updateWeeklyStats();
    updateMonthlyStats();
    updateStreakDisplay();
    generateCalendar();
}

// Get activity completion status for today
function getActivityStatus(activityName) {
    const data = getData();
    const today = getTodayDate();
    
    if (!data.dailyData[today]) {
        return false;
    }
    
    return data.dailyData[today][activityName] || false;
}

// ==================== PROGRESS CALCULATION ====================

function calculateProgress() {
    const data = getData();
    const today = getTodayDate();
    const activities = data.activities;
    
    if (activities.length === 0) {
        return 0;
    }
    
    let completed = 0;
    const todayData = data.dailyData[today] || {};
    
    activities.forEach(activity => {
        if (todayData[activity] === true) {
            completed++;
        }
    });
    
    return Math.round((completed / activities.length) * 100);
}

// Throttled progress update for better performance
const updateProgressThrottled = throttle(function() {
    const percentage = calculateProgress();
    const progressFill = document.getElementById('progressFill');
    const percentageText = document.getElementById('percentageText');
    
    if (progressFill && percentageText) {
        requestAnimationFrame(() => {
            progressFill.style.width = percentage + '%';
            percentageText.textContent = percentage + '% completed';
        });
    }
}, 100);

function updateProgress() {
    updateProgressThrottled();
}

// ==================== STATISTICS CALCULATION ====================

function calculateSuccessPercentage(dateRange) {
    const data = getData();
    const activities = data.activities;
    
    if (activities.length === 0 || dateRange.length === 0) {
        return { completedDays: 0, overall: 0 };
    }
    
    let daysWithData = 0;
    let completedDays = 0;
    let totalDayPercentage = 0;
    
    dateRange.forEach(date => {
        const dayData = data.dailyData[date] || {};
        let dayCompleted = 0;
        let hasData = false;
        
        activities.forEach(activity => {
            if (dayData[activity] === true) {
                dayCompleted++;
            }
            if (dayData[activity] !== undefined) {
                hasData = true;
            }
        });
        
        if (hasData) {
            daysWithData++;
            const dayPercentage = (dayCompleted / activities.length) * 100;
            totalDayPercentage += dayPercentage;
            
            if (dayPercentage === 100) {
                completedDays++;
            }
        }
    });
    
    const overall = daysWithData > 0 ? Math.round(totalDayPercentage / daysWithData) : 0;
    
    return { completedDays, overall };
}

function calculateWeeklyStats() {
    const weekDates = getWeekDates();
    return calculateSuccessPercentage(weekDates);
}

function calculateMonthlyStats() {
    const monthDates = getMonthDates();
    return calculateSuccessPercentage(monthDates);
}

function updateWeeklyStats() {
    const stats = calculateWeeklyStats();
    const completedDaysEl = document.getElementById('weeklyCompletedDays');
    const overallEl = document.getElementById('weeklyOverall');
    
    if (completedDaysEl) completedDaysEl.textContent = stats.completedDays;
    if (overallEl) overallEl.textContent = stats.overall + '%';
}

function updateMonthlyStats() {
    const stats = calculateMonthlyStats();
    const monthDates = getMonthDates();
    const completedDaysEl = document.getElementById('monthlyCompletedDays');
    const totalDaysEl = document.getElementById('monthlyTotalDays');
    const overallEl = document.getElementById('monthlyOverall');
    
    if (completedDaysEl) completedDaysEl.textContent = stats.completedDays;
    if (totalDaysEl) totalDaysEl.textContent = monthDates.length;
    if (overallEl) overallEl.textContent = stats.overall + '%';
}

function updateStreakDisplay() {
    const data = getData();
    const currentStreakEl = document.getElementById('currentStreak');
    if (currentStreakEl) {
        currentStreakEl.textContent = data.currentStreak || 0;
    }
}

// ==================== RENDERING ====================

function renderActivities() {
    const data = getData();
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    activityList.innerHTML = '';
    
    if (data.activities.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-state';
        emptyLi.textContent = 'No activities yet. Add one to get started!';
        fragment.appendChild(emptyLi);
        activityList.appendChild(fragment);
        return;
    }
    
    data.activities.forEach((activity, index) => {
        const li = document.createElement('li');
        const isCompleted = getActivityStatus(activity);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isCompleted;
        checkbox.addEventListener('change', () => toggleActivity(activity));
        
        const label = document.createElement('label');
        const span = document.createElement('span');
        span.textContent = activity;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteActivity(activity));
        
        li.appendChild(label);
        li.appendChild(deleteBtn);
        
        fragment.appendChild(li);
    });
    
    activityList.appendChild(fragment);
}

function renderSuggestions() {
    const suggestions = [
        'Gym / Workout',
        'Coding Practice',
        'Book Reading',
        'Study / Revision',
        'Jogging / Walk',
        'Meditation',
        'Namaz / Prayer',
        'Skill Learning'
    ];
    
    const suggestionsContainer = document.getElementById('suggestions');
    if (!suggestionsContainer) return;
    
    const fragment = document.createDocumentFragment();
    suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const span = document.createElement('span');
        span.className = 'suggestion-item';
        
        const text = document.createTextNode(suggestion + ' ');
        
        const addBtn = document.createElement('button');
        addBtn.className = 'suggestion-add-btn';
        addBtn.textContent = '+ Add';
        addBtn.addEventListener('click', () => addActivity(suggestion));
        
        span.appendChild(text);
        span.appendChild(addBtn);
        fragment.appendChild(span);
    });
    
    suggestionsContainer.appendChild(fragment);
}

// Update date display
function updateDateDisplay() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString('en-US', options);
    const dateDisplayEl = document.getElementById('dateDisplay');
    if (dateDisplayEl) {
        dateDisplayEl.textContent = dateString;
    }
}

// Generate monthly calendar view
function generateCalendar() {
    const data = getData();
    const activities = data.activities;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const calendarContainer = document.getElementById('calendarContainer');
    if (!calendarContainer) return;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const fragment = document.createDocumentFragment();
    calendarContainer.innerHTML = '';
    
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';
    
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = data.dailyData[dateStr] || {};
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        let completedCount = 0;
        let hasData = false;
        let completionPercentage = 0;
        
        if (activities.length > 0) {
            activities.forEach(activity => {
                if (dayData[activity] === true) {
                    completedCount++;
                }
                if (dayData[activity] !== undefined) {
                    hasData = true;
                }
            });
            
            completionPercentage = (completedCount / activities.length) * 100;
            
            if (completionPercentage === 100) {
                dayCell.classList.add('completed');
            } else if (completionPercentage > 0 && completionPercentage < 100) {
                dayCell.classList.add('partial');
            } else if (hasData) {
                dayCell.classList.add('empty');
            }
        }
        
        const todayStr = getTodayDate();
        if (dateStr === todayStr) {
            dayCell.classList.add('today');
        }
        
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        if (activities.length > 0) {
            const percentageSpan = document.createElement('span');
            percentageSpan.className = 'day-percentage';
            if (hasData) {
                percentageSpan.textContent = Math.round(completionPercentage) + '%';
            } else {
                percentageSpan.textContent = '-';
            }
            dayCell.appendChild(percentageSpan);
        }
        
        dayCell.addEventListener('click', () => showDayDetails(dateStr, day, month, year));
        
        calendarGrid.appendChild(dayCell);
    }
    
    fragment.appendChild(calendarGrid);
    calendarContainer.appendChild(fragment);
}

// Show day details in a modal/popup
function showDayDetails(dateStr, day, month, year) {
    const data = getData();
    const dayData = data.dailyData[dateStr] || {};
    const activities = data.activities;
    
    let completedCount = 0;
    let totalCount = activities.length;
    
    activities.forEach(activity => {
        if (dayData[activity] === true) {
            completedCount++;
        }
    });
    
    const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const modal = document.createElement('div');
    modal.className = 'day-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '×';
    
    modalHeader.appendChild(headerTitle);
    modalHeader.appendChild(closeBtn);
    
    const modalStats = document.createElement('div');
    modalStats.className = 'modal-stats';
    const statsPara = document.createElement('p');
    const statsStrong = document.createElement('strong');
    statsStrong.textContent = completionPercentage + '%';
    statsPara.appendChild(document.createTextNode('Completion: '));
    statsPara.appendChild(statsStrong);
    statsPara.appendChild(document.createTextNode(` (${completedCount} / ${totalCount})`));
    modalStats.appendChild(statsPara);
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    if (activities.length === 0) {
        const noActivities = document.createElement('p');
        noActivities.className = 'no-activities';
        noActivities.textContent = 'No activities added yet.';
        modalBody.appendChild(noActivities);
    } else {
        activities.forEach(activity => {
            const activityDiv = document.createElement('div');
            activityDiv.className = 'modal-activity';
            
            const statusSpan = document.createElement('span');
            const isCompleted = dayData[activity] === true;
            const isStarted = dayData[activity] !== undefined;
            statusSpan.className = 'activity-status ' + (isCompleted ? 'completed' : (isStarted ? 'not-completed' : 'not-started'));
            statusSpan.textContent = isCompleted ? '✓' : (isStarted ? '○' : '-');
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'activity-name';
            nameSpan.textContent = activity;
            
            activityDiv.appendChild(statusSpan);
            activityDiv.appendChild(nameSpan);
            modalBody.appendChild(activityDiv);
        });
    }
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalStats);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.remove());
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// ==================== THEME MANAGEMENT ====================

function loadTheme() {
    const data = getData();
    const theme = data.theme || 'light';
    const themeBtn = document.getElementById('themeToggleBtn');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeBtn) themeBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeBtn) themeBtn.textContent = '🌙';
    }
}

function toggleTheme() {
    const data = getData();
    const currentTheme = data.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    data.theme = newTheme;
    saveData(data);
    loadTheme();
}

// ==================== NOTIFICATIONS ====================

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function sendDailyReminderNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const data = getData();
        const today = getTodayDate();
        const todayData = data.dailyData[today] || {};
        const activities = data.activities;
        
        if (activities.length === 0) {
            const notification = new Notification('Tickora Daily Reminder', {
                body: `Don't forget to complete your activities today! 🎯`,
                icon: '🔔'
            });
            setTimeout(() => notification.close(), 5000);
            return;
        }
        
        let incompleteCount = 0;
        activities.forEach(activity => {
            if (!todayData[activity]) {
                incompleteCount++;
            }
        });
        
        if (incompleteCount > 0) {
            const notification = new Notification('Tickora Daily Reminder', {
                body: `You have ${incompleteCount} incomplete activity${incompleteCount > 1 ? 'ies' : ''} today. Complete them to maintain your streak! 💪`,
                icon: '🔔'
            });
            setTimeout(() => notification.close(), 5000);
        } else {
            const notification = new Notification('Tickora Daily Reminder', {
                body: `Great job! All activities completed today! 🎉 Keep up the streak!`,
                icon: '🔔'
            });
            setTimeout(() => notification.close(), 5000);
        }
    }
}

function scheduleDailyReminder() {
    const today = getTodayDate();
    const reminderKey = `daily_reminder_${today}`;
    
    if (!localStorage.getItem(reminderKey)) {
        sendDailyReminderNotification();
        localStorage.setItem(reminderKey, 'sent');
    }
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', function() {
    try {
        checkDailyReset();
        trackAppOpen();
        loadTheme();
        requestNotificationPermission();
        scheduleDailyReminder();
        
        updateDateDisplay();
        renderActivities();
        renderSuggestions();
        updateProgress();
        updateWeeklyStats();
        updateMonthlyStats();
        updateStreakDisplay();
        generateCalendar();
        
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleTheme);
        }
        
        const addActivityBtn = document.getElementById('addActivityBtn');
        const addActivityForm = document.getElementById('addActivityForm');
        const saveActivityBtn = document.getElementById('saveActivityBtn');
        const cancelActivityBtn = document.getElementById('cancelActivityBtn');
        const activityInput = document.getElementById('activityInput');
        
        if (addActivityBtn && addActivityForm) {
            addActivityBtn.addEventListener('click', () => {
                addActivityForm.style.display = 'block';
                addActivityBtn.style.display = 'none';
                if (activityInput) activityInput.focus();
            });
        }
        
        if (cancelActivityBtn && addActivityForm && addActivityBtn) {
            cancelActivityBtn.addEventListener('click', () => {
                addActivityForm.style.display = 'none';
                addActivityBtn.style.display = 'block';
                if (activityInput) activityInput.value = '';
            });
        }
        
        if (saveActivityBtn && activityInput && addActivityForm && addActivityBtn) {
            saveActivityBtn.addEventListener('click', () => {
                const name = activityInput.value.trim();
                if (name) {
                    addActivity(name);
                    activityInput.value = '';
                    addActivityForm.style.display = 'none';
                    addActivityBtn.style.display = 'block';
                }
            });
        }
        
        if (activityInput && saveActivityBtn) {
            activityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveActivityBtn.click();
                }
            });
        }
        
        
        // Check for new day every minute (throttled)
        const checkNewDay = throttle(() => {
            const data = getData();
            const today = getTodayDate();
            if (data.lastResetDate !== today) {
                checkDailyReset();
                trackAppOpen();
                renderActivities();
                updateProgress();
                updateWeeklyStats();
                updateMonthlyStats();
                updateStreakDisplay();
                generateCalendar();
            }
        }, 60000);
        
        setInterval(checkNewDay, 60000);
    } catch (error) {
        console.error('Error initializing app:', error);
    }
});

// Make functions available globally for onclick handlers
window.toggleActivity = toggleActivity;
window.deleteActivity = deleteActivity;
window.addActivity = addActivity;
