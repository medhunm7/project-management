import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

// CORS setup
app.use(
  cors({
    origin: CLIENT_URL && CLIENT_URL !== "*" ? [CLIENT_URL, "http://localhost:5173", "http://localhost:3000"] : "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// In-Memory Fallback Store
let inMemoryTasks = [
  {
    _id: "demo-1",
    title: "Complete College Assessment Deployment",
    status: "Ongoing",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "demo-2",
    title: "Setup CI/CD pipelines on Vercel and Render",
    status: "Completed",
    createdAt: new Date().toISOString(),
  },
  {
    _id: "demo-3",
    title: "Verify Atlas Cloud Database Connection",
    status: "Pending",
    createdAt: new Date().toISOString(),
  },
];
let mongoConnected = false;

// Task Mongoose Schema
const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Ongoing", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);
const Task = mongoose.model("Task", TaskSchema);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (MONGO_URI && !MONGO_URI.includes("<db_username>")) {
  mongoose
    .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      mongoConnected = true;
      console.log("✅ MongoDB Connected successfully");
    })
    .catch((err) => {
      console.warn("⚠️ MongoDB connection error, using in-memory store:", err.message);
    });
} else {
  console.log("ℹ️ Running in resilient in-memory mode (MONGO_URI not configured or contains placeholder)");
}

// Health Check Endpoints
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    database: mongoConnected ? "MongoDB" : "In-Memory Store",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Task Manager API is running",
    status: "OK",
  });
});

// GET /tasks
app.get("/tasks", async (req, res) => {
  try {
    if (mongoConnected) {
      const tasks = await Task.find().sort({ createdAt: -1 });
      return res.json(tasks);
    }
    res.json(inMemoryTasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Server error. Could not fetch tasks." });
  }
});

// POST /tasks
app.post("/tasks", async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Task title is required." });
  }

  try {
    if (mongoConnected) {
      const task = new Task({ title: title.trim() });
      const newTask = await task.save();
      return res.status(201).json(newTask);
    }

    const newTask = {
      _id: `task-${Date.now()}`,
      title: title.trim(),
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    inMemoryTasks.unshift(newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ message: "Invalid data. Could not create task." });
  }
});

// PATCH /tasks/:id
app.patch("/tasks/:id", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["Pending", "Ongoing", "Completed"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    if (mongoConnected) {
      const updatedTask = await Task.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true, runValidators: true }
      );
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found." });
      }
      return res.json(updatedTask);
    }

    const taskIndex = inMemoryTasks.findIndex((t) => t._id === req.params.id);
    if (taskIndex === -1) {
      return res.status(404).json({ message: "Task not found." });
    }
    inMemoryTasks[taskIndex].status = status;
    res.json(inMemoryTasks[taskIndex]);
  } catch (err) {
    console.error("Error updating task status:", err);
    res.status(500).json({ message: "Server error. Could not update task status." });
  }
});

// DELETE /tasks/:id
app.delete("/tasks/:id", async (req, res) => {
  try {
    if (mongoConnected) {
      const deletedTask = await Task.findByIdAndDelete(req.params.id);
      if (!deletedTask) {
        return res.status(404).json({ message: "Task not found." });
      }
      return res.json({ message: "Task deleted." });
    }

    const taskIndex = inMemoryTasks.findIndex((t) => t._id === req.params.id);
    if (taskIndex === -1) {
      return res.status(404).json({ message: "Task not found." });
    }
    inMemoryTasks.splice(taskIndex, 1);
    res.json({ message: "Task deleted." });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ message: "Server error. Could not delete task." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
