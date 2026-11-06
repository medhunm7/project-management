const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
mongoose
  .connect("mongodb://localhost:27017/taskmanager")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));
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
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ message: "Server error. Could not fetch tasks." });
  }
});
app.post("/tasks", async (req, res) => {
  const { title } = req.body;
  const task = new Task({ title });
  try {
  const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (err) {
    console.error("Error creating task:", err);
    res.status(400).json({ message: "Invalid data. Could not create task." });
  }
});
app.patch("/tasks/:id", async (req, res) => {
  const { status } = req.body;
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found." });
    }
    res.json(updatedTask);
  } catch (err) {
    console.error("Error updating task status:", err);
    res.status(500).json({ message: "Server error. Could not update task status." });
  }
});
app.delete("/tasks/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found." });
    }
    res.json({ message: "Task deleted." });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ message: "Server error. Could not delete task." });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
