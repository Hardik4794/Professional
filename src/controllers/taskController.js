const Task = require('../models/Task');

exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ status: 'success', data: task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const filter = { createdBy: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json({ status: 'success', results: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ status: 'success', data: task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ status: 'success', data: task });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTaskStats = async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { createdBy: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
