const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json());
app.use(cors());

// Directories and file paths
const uploadsDirectory = path.join(__dirname, 'uploads');
const tasksFilePath = path.join(__dirname, 'tasks.json');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDirectory);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `${uniqueSuffix}_${file.originalname}`;
        cb(null, fileName);
    }
});
const upload = multer({ storage });

// Load tasks from JSON file on server start
let tasks = [];
try {
    const data = fs.readFileSync(tasksFilePath, 'utf8');
    tasks = JSON.parse(data);
} catch (err) {
    console.error('Error reading tasks file:', err);
}

// Middleware to save tasks to file after each modification
function saveTasksToFile() {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2), 'utf8');
    console.log('Tasks saved to file.');
}

// Routes
// Get all tasks
app.get('/tasks', (req, res) => {
    res.json(tasks);
});

// Create a new task with optional file upload
app.post('/tasks', upload.single('taskDocumentation'), (req, res) => {
    console.log('Received task upload request:', req.file, req.body);

    const task = {
        taskId: req.body.taskId,
        project: req.body.project,
        taskName: req.body.taskName,
        taskDescription: req.body.taskDescription,
        taskDocumentationName: req.file ? req.file.filename : null, // Set the file name if exists
        taskDocumentationKey: req.file ? req.file.filename : null, // Set the key (filename) for downloading if exists
        responsiblePerson: req.body.responsiblePerson,
        internalDeadline: req.body.internalDeadline,
        userDeadline: req.body.userDeadline,
        status: req.body.status,
        changingStatusDate: req.body.changingStatusDate,
        functionalTaskId: req.body.functionalTaskId, // Optional field for technical tasks
        estimateDeadline: req.body.estimateDeadline // Optional field for technical tasks
    };

    tasks.push(task);
    saveTasksToFile();

    res.status(201).json(task);
});

// Download a specific file by file key
app.get('/download/:fileKey', (req, res) => {
    const fileKey = req.params.fileKey;
    const filePath = path.join(uploadsDirectory, fileKey);

    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('Error accessing file:', err);
            return res.status(404).send('File not found');
        }
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Internal Server Error');
            }
        });
    });
});

// Delete a task
app.delete('/tasks/:id', (req, res) => {
    const taskId = req.params.id;
    tasks = tasks.filter(task => task.taskId !== taskId);
    saveTasksToFile();
    res.status(204).send();
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Function to generate a unique task ID (example)
function generateTaskId() {
    return 'T' + Date.now(); // Example ID generation based on timestamp
}
