/**
 * Incognito
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
  _____                   _                _     _                                                                      
 |  __ \                 | |              | |   | |                                                                     
 | |__) |   ___    _ __  | |_    ___    __| |   | |__    _   _                                                          
 |  ___/   / _ \  | '__| | __|  / _ \  / _` |   | '_ \  | | | |                                                         
 | |      | (_) | | |    | |_  |  __/ | (_| |   | |_) | | |_| |                                                         
 |_|       \___/  |_|     \__|  \___|  \__,_|   |_.__/   \__, |                                                         
                                                          __/ |                                                         
                                                         |___/                                                          
                                _     _                     _       _   _          _                               _    
     /\                        | |   | |                   | |     | \ | |        | |                             | |   
    /  \     _ __ ___     ___  | |_  | |__    _   _   ___  | |_    |  \| |   ___  | |_  __      __   ___    _ __  | | __
   / /\ \   | '_ ` _ \   / _ \ | __| | '_ \  | | | | / __| | __|   | . ` |  / _ \ | __| \ \ /\ / /  / _ \  | '__| | |/ /
  / ____ \  | | | | | | |  __/ | |_  | | | | | |_| | \__ \ | |_    | |\  | |  __/ | |_   \ V  V /  | (_) | | |    |   < 
 /_/    \_\ |_| |_| |_|  \___|  \__| |_| |_|  \__, | |___/  \__|   |_| \_|  \___|  \__|   \_/\_/    \___/  |_|    |_|\_\
                                               __/ |                                                                    
                                              |___/                                                                     
*/

const STORAGE_KEY = 'incog||scheduler';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const OPENING_LIMITS = {
    Ruth: 5,
    Braxton: 2
};

const DEFAULT_DATA = {
    settings: {
        startDate: new Date().toISOString().slice(0, 10),
        weeks: 1,
        theme: 'light'
    },
    shifts: [
        { code: 1, name: 'Opening SL', start: '06:00', end: '14:00', hours: 8, role: 'manager', skill: 'opening' },
        { code: 2, name: 'Mid SL', start: '10:00', end: '18:00', hours: 8, role: 'manager', skill: 'mid' },
        { code: 3, name: 'Closing SL', start: '14:00', end: '22:00', hours: 8, role: 'manager', skill: 'closing' },
        { code: 4, name: 'Opening Crew', start: '06:00', end: '14:00', hours: 8, role: 'crew' },
        { code: 5, name: 'Mid Crew', start: '10:00', end: '18:00', hours: 8, role: 'crew' },
        { code: 6, name: 'Closing Crew', start: '14:00', end: '22:00', hours: 8, role: 'crew' }
    ],
    employees: [
        { id: 'ruth', name: 'Ruth', role: 'manager', skills: ['opening', 'mid'], targetHours: 40 },
        { id: 'braxton', name: 'Braxton', role: 'manager', skills: ['opening', 'closing'], targetHours: 40 },
        { id: 'maria', name: 'Maria', role: 'manager', skills: ['mid', 'closing'], targetHours: 40 },
        { id: 'diego', name: 'Diego', role: 'crew', skills: ['grill', 'prep'], targetHours: 32 },
        { id: 'taylor', name: 'Taylor', role: 'crew', skills: ['drive', 'register'], targetHours: 28 },
        { id: 'jordan', name: 'Jordan', role: 'crew', skills: ['register', 'prep'], targetHours: 30 },
        { id: 'casey', name: 'Casey', role: 'crew', skills: ['prep'], targetHours: 24 },
        { id: 'miles', name: 'Miles', role: 'crew', skills: ['drive'], targetHours: 20 }
    ],
    demand: {
        days: Array(7).fill('Base'),
        baseCoverage: {
            openingCrew: 2,
            midCrew: 3,
            closingCrew: 2
        },
        adjustments: {
            Base: { openingCrew: 0, midCrew: 0, closingCrew: 0 },
            Busy: { openingCrew: 1, midCrew: 1, closingCrew: 1 },
            Truck: { openingCrew: 0, midCrew: 1, closingCrew: 1 }
        }
    },
    requests: {
        requested: {},
        regular: {}
    },
    schedule: {},
    previousSchedule: null
};

function scheduler(app) {
    app.search.title.style.display = 'block';
    app.search.title.textContent = 'Scheduling App';
    app.search.input.style.display = 'none';
    app.search.back.style.display = 'inline';
    app.search.back.href = '#';

    const data = loadData();

    document.body.setAttribute('data-scheduler-theme', data.settings.theme);

    const state = {
        data,
        selectedWeek: 0,
        selectedCell: null,
        tabs: {}
    };

    const container = app.createElement('div', [], { class: 'scheduler' });
    const header = app.createElement('div', [], { class: 'scheduler__header' });
    const tabBar = app.createElement('div', [], { class: 'scheduler__tabs' });
    const content = app.createElement('div', [], { class: 'scheduler__content' });

    header.append(
        app.createElement('div', 'Hardee\'s Scheduling App', { class: 'scheduler__title' }),
        app.createElement('div', buildHeaderControls(app, state), { class: 'scheduler__header-controls' })
    );

    const tabConfig = [
        { id: 'schedule', label: 'Schedule' },
        { id: 'generate', label: 'Generate' },
        { id: 'employees', label: 'Employees' },
        { id: 'shifts', label: 'Shifts' },
        { id: 'demand', label: 'Demand' },
        { id: 'requests', label: 'Day Off Requests' },
        { id: 'settings', label: 'Settings' }
    ];

    tabConfig.forEach((tab, index) => {
        const button = app.createElement('button', tab.label, {
            class: ['scheduler__tab', index === 0 ? 'is-active' : ''],
            events: {
                click: () => switchTab(state, tab.id)
            }
        });
        tabBar.append(button);
        state.tabs[tab.id] = {
            button,
            section: app.createElement('section', [], {
                class: ['scheduler__panel', index === 0 ? 'is-active' : '']
            })
        };
        content.append(state.tabs[tab.id].section);
    });

    container.append(header, tabBar, content);
    app.main.scheduler = container;

    renderSchedulePanel(app, state);
    renderGeneratePanel(app, state);
    renderEmployeesPanel(app, state);
    renderShiftsPanel(app, state);
    renderDemandPanel(app, state);
    renderRequestsPanel(app, state);
    renderSettingsPanel(app, state);

    const handleKeydown = (event) => {
        if (!state.selectedCell) return;
        if (!/^[0-9]$/.test(event.key)) return;
        applyShiftToCell(state, Number(event.key));
    };

    document.addEventListener('keydown', handleKeydown);
    app.once('exit', () => {
        document.removeEventListener('keydown', handleKeydown);
    });
}

function buildHeaderControls(app, state) {
    const wrapper = document.createElement('div');

    const weekSelect = document.createElement('select');
    weekSelect.className = 'scheduler__select';
    const weeks = Math.max(1, Number(state.data.settings.weeks) || 1);
    for (let i = 0; i < weeks; i += 1) {
        const option = document.createElement('option');
        option.value = String(i);
        option.textContent = `Week ${i + 1}`;
        weekSelect.append(option);
    }
    weekSelect.addEventListener('change', () => {
        state.selectedWeek = Number(weekSelect.value);
        ensureWeek(state.data, state.selectedWeek);
        saveData(state.data);
        renderSchedulePanel(app, state);
        renderDemandPanel(app, state);
        renderRequestsPanel(app, state);
    });

    const themeToggle = document.createElement('button');
    themeToggle.className = 'scheduler__button';
    themeToggle.textContent = state.data.settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    themeToggle.addEventListener('click', () => {
        state.data.settings.theme = state.data.settings.theme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-scheduler-theme', state.data.settings.theme);
        themeToggle.textContent = state.data.settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        saveData(state.data);
    });

    wrapper.append(
        createField('Week', weekSelect),
        themeToggle
    );

    return wrapper;
}

function switchTab(state, tabId) {
    Object.values(state.tabs).forEach((tab) => {
        tab.button.classList.remove('is-active');
        tab.section.classList.remove('is-active');
    });
    state.tabs[tabId].button.classList.add('is-active');
    state.tabs[tabId].section.classList.add('is-active');
}

function renderSchedulePanel(app, state) {
    const panel = state.tabs.schedule.section;
    panel.textContent = '';

    ensureWeek(state.data, state.selectedWeek);

    const controls = app.createElement('div', [], { class: 'scheduler__toolbar' });

    const numericInput = document.createElement('input');
    numericInput.type = 'number';
    numericInput.min = '0';
    numericInput.max = String(Math.max(...state.data.shifts.map(shift => shift.code)));
    numericInput.placeholder = 'Shift #';
    numericInput.className = 'scheduler__input';

    const applyButton = document.createElement('button');
    applyButton.className = 'scheduler__button';
    applyButton.textContent = 'Apply to Selected Cell';
    applyButton.addEventListener('click', () => {
        const value = Number(numericInput.value);
        if (!Number.isNaN(value)) {
            applyShiftToCell(state, value);
            numericInput.value = '';
        }
    });

    const clearButton = document.createElement('button');
    clearButton.className = 'scheduler__button scheduler__button--danger';
    clearButton.textContent = 'Clear Schedule';
    clearButton.addEventListener('click', () => {
        clearSchedule(state);
        renderSchedulePanel(app, state);
    });

    const printAllButton = document.createElement('button');
    printAllButton.className = 'scheduler__button';
    printAllButton.textContent = 'Print Full Page';
    printAllButton.addEventListener('click', () => {
        document.body.classList.remove('print-schedule-only');
        window.print();
    });

    const printScheduleButton = document.createElement('button');
    printScheduleButton.className = 'scheduler__button';
    printScheduleButton.textContent = 'Print Schedule Only';
    printScheduleButton.addEventListener('click', () => {
        document.body.classList.add('print-schedule-only');
        window.print();
        document.body.classList.remove('print-schedule-only');
    });

    controls.append(
        app.createElement('div', [
            app.createElement('span', 'Numeric shift selection', { class: 'scheduler__label' }),
            numericInput,
            applyButton
        ], { class: 'scheduler__control-group' }),
        app.createElement('div', [clearButton, printAllButton, printScheduleButton], { class: 'scheduler__control-group' })
    );

    panel.append(controls);

    const schedule = state.data.schedule[state.selectedWeek];
    const table = document.createElement('table');
    table.className = 'scheduler__table';

    const headerRow = document.createElement('tr');
    headerRow.append(document.createElement('th'));
    getWeekDates(state.data.settings.startDate, state.selectedWeek).forEach((date, index) => {
        const dayHeader = document.createElement('th');
        dayHeader.innerHTML = `<span>${DAYS[index]}</span><small>${date}</small>`;
        headerRow.append(dayHeader);
    });
    headerRow.append(document.createElement('th'));

    const thead = document.createElement('thead');
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');

    const shiftOptions = buildShiftOptions(state.data.shifts);
    state.data.employees.forEach((employee) => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.innerHTML = `<strong>${employee.name}</strong><span>${employee.role}</span>`;
        row.append(nameCell);

        const hours = calculateEmployeeHours(state.data, schedule, employee.id);

        for (let day = 0; day < 7; day += 1) {
            const cell = document.createElement('td');
            const select = document.createElement('select');
            select.className = 'scheduler__cell-select';
            select.dataset.employee = employee.id;
            select.dataset.day = String(day);
            select.innerHTML = shiftOptions;
            select.value = String(schedule[day]?.[employee.id] || 0);
            select.addEventListener('change', () => {
                updateScheduleCell(state, employee.id, day, Number(select.value));
                renderSchedulePanel(app, state);
            });
            select.addEventListener('focus', () => {
                state.selectedCell = { employeeId: employee.id, day };
                highlightSelectedCell(select);
            });
            cell.append(select);
            row.append(cell);
        }

        const hoursCell = document.createElement('td');
        hoursCell.innerHTML = `<span>${hours}</span><small>${employee.targetHours} hrs</small>`;
        row.append(hoursCell);
        tbody.append(row);
    });

    table.append(tbody);
    panel.append(table);

    panel.append(buildLegend(state.data.shifts));
}

function renderGeneratePanel(app, state) {
    const panel = state.tabs.generate.section;
    panel.textContent = '';

    const buttonGroup = app.createElement('div', [], { class: 'scheduler__button-group' });

    const leaderButton = app.createElement('button', 'Generate Shift Leaders', {
        class: 'scheduler__button',
        events: {
            click: () => {
                runGeneration(state, { leadersOnly: true });
                renderSchedulePanel(app, state);
            }
        }
    });

    const crewButton = app.createElement('button', 'Generate Crew', {
        class: 'scheduler__button',
        events: {
            click: () => {
                runGeneration(state, { crewOnly: true });
                renderSchedulePanel(app, state);
            }
        }
    });

    const allButton = app.createElement('button', 'Generate All', {
        class: 'scheduler__button scheduler__button--primary',
        events: {
            click: () => {
                runGeneration(state, { leadersOnly: false, crewOnly: false });
                renderSchedulePanel(app, state);
            }
        }
    });

    buttonGroup.append(leaderButton, crewButton, allButton);

    const rules = app.createElement('div', [
        app.createElement('h3', 'Scheduling Logic Principles'),
        buildList([
            'Must-fill shifts assigned first',
            'Employees behind on hours prioritized',
            'Avoid repeating same weekday shifts week-to-week',
            'Demand increases staffing but never reduces base coverage',
            'No employee may hold more than one shift per day'
        ]),
        app.createElement('h3', 'Shift Coverage Rules'),
        buildList([
            'Exactly one Opening Manager / Shift Leader',
            'Exactly one Mid Shift Leader',
            'Exactly one Closing Shift Leader',
            'Opening SL restricted to Ruth (5 days) and Braxton (2 days) only'
        ]),
        app.createElement('h3', 'Hour & Day Rules'),
        buildList([
            'Managers target 40 hours',
            'Crew target their defined weekly hours',
            'At least 2 days off per rolling 7-day window',
            'Days off may span week boundaries'
        ])
    ], { class: 'scheduler__rules' });

    panel.append(buttonGroup, rules);
}

function renderEmployeesPanel(app, state) {
    const panel = state.tabs.employees.section;
    panel.textContent = '';

    const table = document.createElement('table');
    table.className = 'scheduler__table';

    const header = document.createElement('tr');
    ['Name', 'Role', 'Skills', 'Target Hours', 'Actions'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        header.append(th);
    });
    const thead = document.createElement('thead');
    thead.append(header);
    table.append(thead);

    const tbody = document.createElement('tbody');
    state.data.employees.forEach((employee, index) => {
        const row = document.createElement('tr');
        row.append(
            createTextCell(employee.name, (value) => updateEmployee(state, index, { name: value })),
            createSelectCell(['manager', 'crew'], employee.role, (value) => updateEmployee(state, index, { role: value })),
            createTextCell(employee.skills.join(', '), (value) => updateEmployee(state, index, { skills: value.split(',').map(entry => entry.trim()).filter(Boolean) })),
            createNumberCell(employee.targetHours, (value) => updateEmployee(state, index, { targetHours: Number(value) || 0 })),
            createActionCell([{
                label: 'Remove',
                className: 'scheduler__button scheduler__button--danger',
                onClick: () => {
                    state.data.employees.splice(index, 1);
                    saveData(state.data);
                    renderEmployeesPanel(app, state);
                    renderSchedulePanel(app, state);
                }
            }])
        );
        tbody.append(row);
    });

    table.append(tbody);

    const addButton = app.createElement('button', 'Add Employee', {
        class: 'scheduler__button',
        events: {
            click: () => {
                state.data.employees.push({
                    id: `employee-${Date.now()}`,
                    name: 'New Employee',
                    role: 'crew',
                    skills: [],
                    targetHours: 20
                });
                saveData(state.data);
                renderEmployeesPanel(app, state);
                renderSchedulePanel(app, state);
            }
        }
    });

    const exportButton = app.createElement('button', 'Export Employees', {
        class: 'scheduler__button',
        events: {
            click: () => exportEmployees(state.data.employees)
        }
    });

    const importTextarea = document.createElement('textarea');
    importTextarea.className = 'scheduler__textarea';
    importTextarea.placeholder = 'Paste employee JSON here...';

    const importButton = app.createElement('button', 'Import Employees', {
        class: 'scheduler__button',
        events: {
            click: () => {
                try {
                    const parsed = JSON.parse(importTextarea.value);
                    if (!Array.isArray(parsed)) throw new Error('Invalid JSON');
                    state.data.employees = parsed.map((employee) => ({
                        id: employee.id || `employee-${createId()}`,
                        name: employee.name || 'Employee',
                        role: employee.role || 'crew',
                        skills: employee.skills || [],
                        targetHours: employee.targetHours || 20
                    }));
                    saveData(state.data);
                    renderEmployeesPanel(app, state);
                    renderSchedulePanel(app, state);
                } catch (error) {
                    alert('Please paste a valid JSON array of employees.');
                }
            }
        }
    });

    panel.append(
        table,
        app.createElement('div', [addButton, exportButton], { class: 'scheduler__button-group' }),
        app.createElement('div', [
            app.createElement('h3', 'Import Employees'),
            importTextarea,
            importButton
        ], { class: 'scheduler__form-section' })
    );
}

function renderShiftsPanel(app, state) {
    const panel = state.tabs.shifts.section;
    panel.textContent = '';

    const table = document.createElement('table');
    table.className = 'scheduler__table';

    const header = document.createElement('tr');
    ['Code', 'Name', 'Start', 'End', 'Hours', 'Role', 'Skill', 'Actions'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        header.append(th);
    });
    const thead = document.createElement('thead');
    thead.append(header);
    table.append(thead);

    const tbody = document.createElement('tbody');
    state.data.shifts.forEach((shift, index) => {
        const row = document.createElement('tr');
        row.append(
            createNumberCell(shift.code, (value) => updateShift(state, index, { code: Number(value) || 0 })),
            createTextCell(shift.name, (value) => updateShift(state, index, { name: value })),
            createTextCell(shift.start, (value) => updateShift(state, index, { start: value })),
            createTextCell(shift.end, (value) => updateShift(state, index, { end: value })),
            createNumberCell(shift.hours, (value) => updateShift(state, index, { hours: Number(value) || 0 })),
            createSelectCell(['manager', 'crew'], shift.role, (value) => updateShift(state, index, { role: value })),
            createTextCell(shift.skill || '', (value) => updateShift(state, index, { skill: value || null })),
            createActionCell([{
                label: 'Remove',
                className: 'scheduler__button scheduler__button--danger',
                onClick: () => {
                    state.data.shifts.splice(index, 1);
                    saveData(state.data);
                    renderShiftsPanel(app, state);
                    renderSchedulePanel(app, state);
                }
            }])
        );
        tbody.append(row);
    });

    table.append(tbody);

    const addButton = app.createElement('button', 'Add Shift', {
        class: 'scheduler__button',
        events: {
            click: () => {
                state.data.shifts.push({
                    code: state.data.shifts.length + 1,
                    name: 'New Shift',
                    start: '09:00',
                    end: '17:00',
                    hours: 8,
                    role: 'crew',
                    skill: null
                });
                saveData(state.data);
                renderShiftsPanel(app, state);
                renderSchedulePanel(app, state);
            }
        }
    });

    panel.append(table, addButton);
}

function renderDemandPanel(app, state) {
    const panel = state.tabs.demand.section;
    panel.textContent = '';

    const scheduleControls = document.createElement('div');
    scheduleControls.className = 'scheduler__form-grid';

    state.data.demand.days.forEach((value, index) => {
        const select = document.createElement('select');
        select.className = 'scheduler__select';
        ['Base', 'Busy', 'Truck'].forEach((optionValue) => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            select.append(option);
        });
        select.value = value;
        select.addEventListener('change', () => {
            state.data.demand.days[index] = select.value;
            saveData(state.data);
            renderSchedulePanel(app, state);
        });
        scheduleControls.append(createField(`${DAY_LABELS[index]} Demand`, select));
    });

    const coverage = state.data.demand.baseCoverage;
    const adjustments = state.data.demand.adjustments;

    const baseSection = app.createElement('div', [
        app.createElement('h3', 'Base Coverage (never reduced)'),
        createNumberField('Opening Crew', coverage.openingCrew, (value) => updateCoverage(state, 'openingCrew', value)),
        createNumberField('Mid Crew', coverage.midCrew, (value) => updateCoverage(state, 'midCrew', value)),
        createNumberField('Closing Crew', coverage.closingCrew, (value) => updateCoverage(state, 'closingCrew', value))
    ], { class: 'scheduler__form-section' });

    const adjustmentSection = app.createElement('div', [
        app.createElement('h3', 'Demand Adjustments (additive only)'),
        buildAdjustmentFields(state, 'Busy', adjustments.Busy),
        buildAdjustmentFields(state, 'Truck', adjustments.Truck)
    ], { class: 'scheduler__form-section' });

    panel.append(
        app.createElement('h3', 'Demand Profile by Day'),
        scheduleControls,
        baseSection,
        adjustmentSection
    );
}

function renderRequestsPanel(app, state) {
    const panel = state.tabs.requests.section;
    panel.textContent = '';

    ensureWeek(state.data, state.selectedWeek);

    const requestedSection = buildRequestsTable(state, 'requested');
    const regularSection = buildRequestsTable(state, 'regular');

    panel.append(
        app.createElement('h3', 'Requested Days Off (specific requests)'),
        requestedSection,
        app.createElement('h3', 'Regular Days Off (recurring)'),
        regularSection
    );
}

function renderSettingsPanel(app, state) {
    const panel = state.tabs.settings.section;
    panel.textContent = '';

    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    startDateInput.value = state.data.settings.startDate;
    startDateInput.className = 'scheduler__input';
    startDateInput.addEventListener('change', () => {
        state.data.settings.startDate = startDateInput.value;
        saveData(state.data);
        renderSchedulePanel(app, state);
        renderDemandPanel(app, state);
    });

    const weeksInput = document.createElement('input');
    weeksInput.type = 'number';
    weeksInput.min = '1';
    weeksInput.max = '8';
    weeksInput.value = state.data.settings.weeks;
    weeksInput.className = 'scheduler__input';
    weeksInput.addEventListener('change', () => {
        state.data.settings.weeks = Number(weeksInput.value) || 1;
        saveData(state.data);
        renderSchedulePanel(app, state);
    });

    const themeSelect = document.createElement('select');
    themeSelect.className = 'scheduler__select';
    ['light', 'dark'].forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        themeSelect.append(option);
    });
    themeSelect.value = state.data.settings.theme;
    themeSelect.addEventListener('change', () => {
        state.data.settings.theme = themeSelect.value;
        document.body.setAttribute('data-scheduler-theme', state.data.settings.theme);
        saveData(state.data);
    });

    panel.append(
        app.createElement('div', [
            app.createElement('h3', 'Schedule Settings'),
            createField('Start Date', startDateInput),
            createField('Weeks to Display', weeksInput)
        ], { class: 'scheduler__form-section' }),
        app.createElement('div', [
            app.createElement('h3', 'Theme'),
            createField('Scheduler Theme', themeSelect)
        ], { class: 'scheduler__form-section' })
    );
}

function runGeneration(state, options) {
    const data = state.data;
    ensureWeek(data, state.selectedWeek);

    const schedule = data.schedule[state.selectedWeek];
    const previousWeek = data.schedule[state.selectedWeek - 1] || data.previousSchedule;
    const shifts = data.shifts;

    const assignedHours = {};
    const assignedDays = {};
    data.employees.forEach((employee) => {
        assignedHours[employee.id] = 0;
        assignedDays[employee.id] = 0;
    });

    const currentOpenings = {
        Ruth: 0,
        Braxton: 0
    };

    if (!options.leadersOnly) {
        for (let day = 0; day < 7; day += 1) {
            data.employees.forEach((employee) => {
                schedule[day][employee.id] = 0;
            });
        }
    }

    for (let day = 0; day < 7; day += 1) {
        const dayAssignments = new Set();
        data.employees.forEach((employee) => {
            const assigned = schedule[day][employee.id];
            if (assigned) {
                dayAssignments.add(employee.id);
                const shift = shifts.find(entry => entry.code === assigned);
                if (shift) {
                    assignedHours[employee.id] += shift.hours;
                    assignedDays[employee.id] += 1;
                }
            }
        });

        const demand = getDemandCoverage(data, day);
        const shiftTargets = [
            { code: 1, role: 'manager', skill: 'opening', count: 1 },
            { code: 2, role: 'manager', skill: 'mid', count: 1 },
            { code: 3, role: 'manager', skill: 'closing', count: 1 },
            { code: 4, role: 'crew', count: demand.openingCrew },
            { code: 5, role: 'crew', count: demand.midCrew },
            { code: 6, role: 'crew', count: demand.closingCrew }
        ];

        shiftTargets.forEach((target) => {
            if (options.leadersOnly && target.role !== 'manager') return;
            if (options.crewOnly && target.role !== 'crew') return;

            for (let slot = 0; slot < target.count; slot += 1) {
                const candidate = findCandidate({
                    data,
                    day,
                    target,
                    assignedHours,
                    assignedDays,
                    dayAssignments,
                    previousWeek,
                    currentOpenings
                });

                if (candidate) {
                    schedule[day][candidate.id] = target.code;
                    dayAssignments.add(candidate.id);
                    assignedDays[candidate.id] += 1;
                    const shift = shifts.find(entry => entry.code === target.code);
                    assignedHours[candidate.id] += shift ? shift.hours : 0;
                    if (target.code === 1 && (candidate.name in currentOpenings)) {
                        currentOpenings[candidate.name] += 1;
                    }
                }
            }
        });
    }

    data.previousSchedule = schedule;
    saveData(data);
}

function findCandidate({ data, day, target, assignedHours, assignedDays, dayAssignments, previousWeek, currentOpenings }) {
    const candidates = data.employees.filter((employee) => {
        if (dayAssignments.has(employee.id)) return false;
        if (assignedDays[employee.id] >= 5) return false;
        if (employee.role !== target.role) return false;
        if (target.skill && !employee.skills.includes(target.skill)) return false;
        if (isDayOff(data, employee.id, day)) return false;

        if (target.code === 1) {
            if (!(employee.name in OPENING_LIMITS)) return false;
            if (currentOpenings[employee.name] >= OPENING_LIMITS[employee.name]) return false;
        }

        return true;
    });

    if (!candidates.length) return null;

    const scored = candidates.map((employee) => {
        const deficit = employee.targetHours - assignedHours[employee.id];
        const previousShift = previousWeek?.[day]?.[employee.id] || 0;
        const repeatPenalty = previousShift === target.code ? 10 : 0;
        const score = deficit - repeatPenalty;
        return { employee, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].employee;
}

function clearSchedule(state) {
    ensureWeek(state.data, state.selectedWeek);
    const schedule = state.data.schedule[state.selectedWeek];
    for (let day = 0; day < 7; day += 1) {
        state.data.employees.forEach((employee) => {
            schedule[day][employee.id] = 0;
        });
    }
    saveData(state.data);
}

function updateScheduleCell(state, employeeId, day, value) {
    ensureWeek(state.data, state.selectedWeek);
    state.data.schedule[state.selectedWeek][day][employeeId] = value;
    saveData(state.data);
}

function applyShiftToCell(state, value) {
    if (!state.selectedCell) return;
    updateScheduleCell(state, state.selectedCell.employeeId, state.selectedCell.day, value);
}

function highlightSelectedCell(select) {
    document.querySelectorAll('.scheduler__cell-select.is-selected').forEach((element) => {
        element.classList.remove('is-selected');
    });
    select.classList.add('is-selected');
}

function buildShiftOptions(shifts) {
    const options = ['<option value="0">0 - Off</option>'];
    shifts.forEach((shift) => {
        options.push(`<option value="${shift.code}">${shift.code} - ${shift.name}</option>`);
    });
    return options.join('');
}

function buildLegend(shifts) {
    const list = document.createElement('div');
    list.className = 'scheduler__legend';
    list.innerHTML = `
        <h3>Shift Legend</h3>
        <ul>
            <li><strong>0</strong> - Off</li>
            ${shifts.map(shift => `<li><strong>${shift.code}</strong> - ${shift.name} (${shift.start}-${shift.end})</li>`).join('')}
        </ul>
    `;
    return list;
}

function updateEmployee(state, index, changes) {
    state.data.employees[index] = { ...state.data.employees[index], ...changes };
    saveData(state.data);
}

function updateShift(state, index, changes) {
    state.data.shifts[index] = { ...state.data.shifts[index], ...changes };
    saveData(state.data);
}

function updateCoverage(state, key, value) {
    state.data.demand.baseCoverage[key] = Math.max(0, Number(value) || 0);
    saveData(state.data);
}

function exportEmployees(employees) {
    const blob = new Blob([JSON.stringify(employees, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees.json';
    link.click();
    URL.revokeObjectURL(url);
}

function createField(label, element) {
    const wrapper = document.createElement('label');
    wrapper.className = 'scheduler__field';
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(span, element);
    return wrapper;
}

function createTextCell(value, onChange) {
    const cell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.className = 'scheduler__input';
    input.addEventListener('change', () => onChange(input.value));
    cell.append(input);
    return cell;
}

function createNumberCell(value, onChange) {
    const cell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = value;
    input.className = 'scheduler__input';
    input.addEventListener('change', () => onChange(input.value));
    cell.append(input);
    return cell;
}

function createSelectCell(options, value, onChange) {
    const cell = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'scheduler__select';
    options.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.append(option);
    });
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));
    cell.append(select);
    return cell;
}

function createActionCell(actions) {
    const cell = document.createElement('td');
    const wrapper = document.createElement('div');
    wrapper.className = 'scheduler__button-group';
    actions.forEach((action) => {
        const button = document.createElement('button');
        button.className = action.className;
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        wrapper.append(button);
    });
    cell.append(wrapper);
    return cell;
}

function createNumberField(label, value, onChange) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.value = value;
    input.className = 'scheduler__input';
    input.addEventListener('change', () => onChange(input.value));
    return createField(label, input);
}

function buildAdjustmentFields(state, label, values) {
    const wrapper = document.createElement('div');
    wrapper.className = 'scheduler__form-grid';
    wrapper.append(
        createNumberField(`${label} Opening`, values.openingCrew, (value) => updateAdjustment(state, label, 'openingCrew', value)),
        createNumberField(`${label} Mid`, values.midCrew, (value) => updateAdjustment(state, label, 'midCrew', value)),
        createNumberField(`${label} Closing`, values.closingCrew, (value) => updateAdjustment(state, label, 'closingCrew', value))
    );
    return wrapper;
}

function updateAdjustment(state, label, key, value) {
    state.data.demand.adjustments[label][key] = Math.max(0, Number(value) || 0);
    saveData(state.data);
}

function buildRequestsTable(state, type) {
    const table = document.createElement('table');
    table.className = 'scheduler__table';

    const headerRow = document.createElement('tr');
    headerRow.append(document.createElement('th'));
    DAYS.forEach((day) => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.append(th);
    });
    const thead = document.createElement('thead');
    thead.append(headerRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    state.data.employees.forEach((employee) => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = employee.name;
        row.append(nameCell);

        for (let day = 0; day < 7; day += 1) {
            const cell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = Boolean(state.data.requests[type][employee.id]?.includes(day));
            checkbox.addEventListener('change', () => {
                const list = state.data.requests[type][employee.id] || [];
                if (checkbox.checked) {
                    if (!list.includes(day)) list.push(day);
                } else {
                    const index = list.indexOf(day);
                    if (index !== -1) list.splice(index, 1);
                }
                state.data.requests[type][employee.id] = list;
                saveData(state.data);
            });
            cell.append(checkbox);
            row.append(cell);
        }

        tbody.append(row);
    });

    table.append(tbody);
    return table;
}

function buildList(items) {
    const list = document.createElement('ul');
    items.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.append(li);
    });
    return list;
}

function ensureWeek(data, weekIndex) {
    if (!data.schedule[weekIndex]) {
        data.schedule[weekIndex] = {};
    }
    for (let day = 0; day < 7; day += 1) {
        if (!data.schedule[weekIndex][day]) {
            data.schedule[weekIndex][day] = {};
        }
        data.employees.forEach((employee) => {
            if (!(employee.id in data.schedule[weekIndex][day])) {
                data.schedule[weekIndex][day][employee.id] = 0;
            }
        });
    }
}

function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return cloneDefaults();

    try {
        const parsed = JSON.parse(stored);
        return mergeDefaults(DEFAULT_DATA, parsed);
    } catch (error) {
        return cloneDefaults();
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mergeDefaults(defaults, stored) {
    const merged = { ...defaults, ...stored };
    merged.settings = { ...defaults.settings, ...stored.settings };
    merged.demand = {
        ...defaults.demand,
        ...stored.demand,
        baseCoverage: { ...defaults.demand.baseCoverage, ...stored.demand?.baseCoverage },
        adjustments: {
            ...defaults.demand.adjustments,
            ...stored.demand?.adjustments
        }
    };
    merged.requests = {
        ...defaults.requests,
        ...stored.requests
    };
    merged.employees = stored.employees?.length ? stored.employees : defaults.employees;
    merged.shifts = stored.shifts?.length ? stored.shifts : defaults.shifts;
    merged.schedule = stored.schedule || {};
    merged.previousSchedule = stored.previousSchedule || null;
    return merged;
}

function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function createId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getWeekDates(startDate, weekIndex) {
    const date = new Date(startDate);
    if (Number.isNaN(date.getTime())) return Array(7).fill('');
    date.setDate(date.getDate() + weekIndex * 7);
    return Array.from({ length: 7 }).map((_, index) => {
        const current = new Date(date);
        current.setDate(date.getDate() + index);
        return current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
}

function calculateEmployeeHours(data, schedule, employeeId) {
    const shiftMap = new Map(data.shifts.map(shift => [shift.code, shift.hours]));
    let total = 0;
    for (let day = 0; day < 7; day += 1) {
        const code = schedule[day]?.[employeeId] || 0;
        total += shiftMap.get(code) || 0;
    }
    return total;
}

function getDemandCoverage(data, day) {
    const type = data.demand.days[day] || 'Base';
    const base = data.demand.baseCoverage;
    const adjustment = data.demand.adjustments[type] || data.demand.adjustments.Base;
    return {
        openingCrew: base.openingCrew + adjustment.openingCrew,
        midCrew: base.midCrew + adjustment.midCrew,
        closingCrew: base.closingCrew + adjustment.closingCrew
    };
}

function isDayOff(data, employeeId, day) {
    const requested = data.requests.requested[employeeId] || [];
    const regular = data.requests.regular[employeeId] || [];
    return requested.includes(day) || regular.includes(day);
}

export { scheduler };
