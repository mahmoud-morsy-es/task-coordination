document.addEventListener('DOMContentLoaded', function () {
    let tasks = []; // Initialize tasks array

    // DOM elements
    const functionalForm = document.getElementById('functionalForm');
    const functionalTable = document.getElementById('functionalTable').getElementsByTagName('tbody')[0];
    const technicalForm = document.getElementById('technicalForm');
    const technicalTable = document.getElementById('technicalTable').getElementsByTagName('tbody')[0];

    // Event listeners for form submissions
    functionalForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent form submission
        const task = await addTaskToTable(functionalForm, true); // true indicates functional team
        await saveTask(task);
    });

    technicalForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent form submission
        const task = await addTaskToTable(technicalForm, false); // false indicates technical team
        await saveTask(task);
    });

    // Load tasks from the server on initial page load
    async function loadTasks() {
        try {
            const response = await fetch('http://localhost:3000/tasks');
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading tasks:', error);
            return [];
        }
    }

    // Save task to the server
    async function saveTask(task) {
        try {
            const formData = new FormData();
            for (const key in task) {
                formData.append(key, task[key]);
            }

            const response = await fetch('http://localhost:3000/tasks', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save task');
            }

            const savedTask = await response.json();
            tasks.push(savedTask); // Add saved task to local array
            populateTables(); // Update tables with new task
            functionalForm.reset(); // Reset form fields
            technicalForm.reset(); // Reset form fields
        } catch (error) {
            console.error('Error saving task:', error);
        }
    }

    // Add task to respective table and handle file upload
    async function addTaskToTable(form, isFunctionalTeam) {
        const formData = new FormData(form);
        const task = {};

        formData.forEach((value, key) => {
            if (key === 'taskDocumentation') {
                const file = value instanceof File ? value : null; // Check if the value is a File object
                task['taskDocumentation'] = file; // Store the file object in taskDocumentation key
            } else {
                task[key] = value;
            }
        });

        task.taskId = getNextTaskId(isFunctionalTeam); // Generate task ID

        return task; // Return the created task object
    }

    // Generate next task ID based on team type
    function getNextTaskId(isFunctionalTeam) {
        const prefix = isFunctionalTeam ? 'FT' : 'TT';
        const tasksWithPrefix = tasks.filter(task => task.taskId && task.taskId.startsWith(prefix));
        const maxId = tasksWithPrefix.reduce((max, task) => {
            const numericPart = parseInt(task.taskId.slice(2), 10);
            return numericPart > max ? numericPart : max;
        }, 0);

        const nextId = maxId + 1;
        return `${prefix}${nextId.toString().padStart(2, '0')}`;
    }

    // Populate both functional and technical team tables
    async function populateTables() {
        try {
            tasks = await loadTasks(); // Fetch tasks from the server

            populateTable(functionalTable, task => [
                task.taskId,
                task.project,
                task.taskName,
                task.taskDescription,
                createDownloadLink(task.taskDocumentationKey, task.taskDocumentationName), // Updated to include download link
                task.responsiblePerson,
                task.internalDeadline,
                task.userDeadline,
                task.status,
                task.changingStatusDate
            ], 'FT');

            populateTable(technicalTable, task => [
                task.taskId,
                task.functionalTaskId, // Include the functional task ID in the technical table
                task.responsiblePerson,
                task.estimateDeadline,
                task.status,
                task.changingStatusDate
            ], 'TT');

            populateFunctionalTaskIdDropdown(); // Ensure dropdown is populated after loading tasks
        } catch (error) {
            console.error('Error populating tables:', error);
        }
    }

    // Helper function to populate a specific table
    function populateTable(table, getRowData, prefix) {
        table.innerHTML = ''; // Clear table body

        tasks.filter(task => task.taskId && task.taskId.startsWith(prefix)).forEach(task => {
            const rowData = getRowData(task);
            const newRow = table.insertRow();

            rowData.forEach(value => {
                const cell = newRow.insertCell();
                if (typeof value === 'string') {
                    cell.textContent = value;
                } else {
                    cell.appendChild(value); // Append elements like download links
                }
            });

            const actionsCell = newRow.insertCell();
          /*  const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit';
            editButton.addEventListener('click', () => editTask(task.taskId));
            actionsCell.appendChild(editButton);*/

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete';
            deleteButton.addEventListener('click', () => deleteTask(task.taskId));
            actionsCell.appendChild(deleteButton);
        });
    }

    // Populate the functional task ID dropdown in the technical form
    function populateFunctionalTaskIdDropdown() {
        const functionalTaskIds = tasks.filter(task => task.taskId && task.taskId.startsWith('FT')).map(task => task.taskId);
        const functionalTaskIdSelect = technicalForm.querySelector('select[name="functionalTaskId"]');
        functionalTaskIdSelect.innerHTML = '';

        functionalTaskIds.forEach(taskId => {
            const option = document.createElement('option');
            option.value = taskId;
            option.textContent = taskId;
            functionalTaskIdSelect.appendChild(option);
        });
    }

    // Helper function to create a download link for task documentation
    function createDownloadLink(fileKey, fileName) {
        if (!fileKey) return ''; // If no file key, return empty string

        const downloadLink = document.createElement('a');
        downloadLink.textContent = fileName;
        downloadLink.href = `http://localhost:3000/download/${fileKey}`;
        downloadLink.target = '_blank'; // Open in a new tab
        downloadLink.setAttribute('download', fileName); // Set the download attribute

        return downloadLink;
    }

    // Edit a task (simulated for demonstration)
    function editTask(taskId) {
        console.log('Editing task:', taskId);
        // Implement edit functionality as per your requirements
    }

    // Delete task from the server
    async function deleteTask(taskId) {
        try {
            const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                tasks = tasks.filter(task => task.taskId !== taskId); // Remove task from local array
                populateTables(); // Update tables after deletion
                console.log(`Task ${taskId} deleted successfully.`);
            } else {
                console.error('Failed to delete task:', response.statusText);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    // Initial population of tables on page load
    populateTables();
});
