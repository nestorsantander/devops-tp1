const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('redis');

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

// Ruta para obtener todas las tareas
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await client.lRange('tasks', 0, -1);
    res.json(tasks.map(task => JSON.parse(task)));
  } catch (err) {
    res.status(500).send(err);
  }
});

// Ruta para agregar una nueva tarea
app.post('/tasks', async (req, res) => {
  const task = req.body;
  try {
    const reply = await client.rPush('tasks', JSON.stringify(task));
    res.status(201).send(reply);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Ruta para eliminar una tarea
app.delete('/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  try {
    const tasks = await client.lRange('tasks', 0, -1);
    const taskIndex = tasks.findIndex(task => JSON.parse(task).id === taskId);
    if (taskIndex === -1) {
      return res.status(404).send('Task not found');
    }
    const reply = await client.lRem('tasks', 1, tasks[taskIndex]);
    res.send(reply);
  } catch (err) {
    res.status(500).send(err);
  }
});

// Ruta para marcar una tarea como completada
app.put('/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  try {
    const tasks = await client.lRange('tasks', 0, -1);
    const taskIndex = tasks.findIndex(task => JSON.parse(task).id === taskId);
    if (taskIndex === -1) {
      return res.status(404).send('Task not found');
    }
    const task = JSON.parse(tasks[taskIndex]);
    task.completed = true;
    const reply = await client.lSet('tasks', taskIndex, JSON.stringify(task));
    res.send(reply);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
