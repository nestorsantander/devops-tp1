  const express = require('express');
  const bodyParser = require('body-parser');
  const { createClient } = require('redis');
  const path = require('path');

  const app = express();
  const port = 3000;

  let cpuLoadActive = false;
  let ramLoadActive = false;
  let redisLoadActive = false;

  // Configuración de Redis
  const client = createClient({
      url: 'redis://contRedis:6379'
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

// cargar CPU
  app.get('/generate-cpu-load', (req, res) => {
    cpuLoadActive = true;
    const start = Date.now();
    while (cpuLoadActive && Date.now() - start < 10000) {
      Math.sqrt(Math.random());
      Math.sqrt(Math.random());
      Math.sqrt(Math.random());
      Math.sqrt(Math.random());
      Math.sqrt(Math.random());
    }
    res.send({ message: 'CPU load generated for 10 segundos' });
  });

  app.get('/stop-cpu-load', (req, res) => {
    cpuLoadActive = false;
    res.send({ message: 'CPU load stopped' });
  });

// cargar RAM
  app.get('/generate-ram-load', (req, res) => {
    ramLoadActive = true;
    const largeArray = [];
    for (let i = 0; ramLoadActive && i < 1e6; i++) {
      largeArray.push({ index: i, value: Math.random() });
      largeArray.push({ index: i, value: Math.random() });
      largeArray.push({ index: i, value: Math.random() });
    }
    setTimeout(() => {
      res.send({ message: 'RAM load generated for 10 segundos' });
    }, 10000);
  });

  app.get('/stop-ram-load', (req, res) => {
    ramLoadActive = false;
    res.send({ message: 'RAM load stopped' });
  });

// cargar REDIS
  app.get('/generate-redis-write-load', async (req, res) => {
    redisLoadActive = true;
    try {
      // Generar carga de escritura
      for (let i = 0; redisLoadActive && i < 300000; i++) {
        // Genera una escritura de datos en Redis
        await client.set(`key-${i}`, `value-${i}`);
      }
      res.send({ message: 'Redis write load generated' });
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  app.get('/stop-redis-load', (req, res) => {
    redisLoadActive = false;
    res.send({ message: 'Redis load stopped' });
  });

  // --------------------------------------------------
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
