const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('redis');
const path = require('path');

const app = express();
const port = 3000;

// Configuración de Redis
const client = createClient({
    url: 'redis://localhost:7001'
});

client.on('error', (err) => {
  console.error('Error connecting to Redis', err);
});

client.connect().then(() => {
  console.log('Connected to Redis');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Ruta para servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  
// Ruta para obtener todas las tareas
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await client.lRange('tasks', 0, -1);
    const parsedTasks = tasks.map(task => JSON.parse(task));
    res.send(parsedTasks);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/tasks', async (req, res) => {
    const taskText = req.body.task;
    const taskId = Date.now(); // Generar un ID único basado en el tiempo
    const task = { id: taskId, text: taskText, completed: false };
  
    try {
      const reply = await client.rPush('tasks', JSON.stringify(task));
      res.status(201).send({ message: 'Task added', reply });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

// Ruta para eliminar una tarea
app.delete('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
  
    try {
      const tasks = await client.lRange('tasks', 0, -1);
      const taskIndex = tasks.findIndex(task => JSON.parse(task).id == taskId);
  
      if (taskIndex === -1) {
        return res.status(404).send('Task not found');
      }
  
      await client.lRem('tasks', 1, tasks[taskIndex]); // Eliminar la tarea por su valor
  
      res.send({ message: 'Task deleted' });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

// Ruta para marcar una tarea como completada
app.put('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    const completed = req.body.completed; // Obtener el nuevo estado
  
    try {
      const tasks = await client.lRange('tasks', 0, -1);
      const taskIndex = tasks.findIndex(task => JSON.parse(task).id == taskId);
      if (taskIndex === -1) {
        return res.status(404).send('Task not found');
      }
  
      const task = JSON.parse(tasks[taskIndex]);
      task.completed = completed; // Actualizar el estado
      const reply = await client.lSet('tasks', taskIndex, JSON.stringify(task));
      res.send(reply);
    } catch (err) {
      res.status(500).send(err);
    }
  });

// Ruta para eliminar todas las tareas
app.delete('/tasks', async (req, res) => {
    try {
      // Eliminar la lista 'tasks' en Redis
      const reply = await client.del('tasks');
      res.send({ message: 'All tasks deleted', reply });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
