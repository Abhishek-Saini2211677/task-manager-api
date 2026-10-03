const mongoose = require('mongoose');
const { TASK_STATUS, TASK_PRIORITY } = require('../utils/constants');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, default: '', maxlength: 1000 },
    status: { type: String, enum: TASK_STATUS, default: 'Pending' },
    priority: { type: String, enum: TASK_PRIORITY, default: 'Medium' },
    dueDate: { type: Date, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    // createdAt = "Created Date", updatedAt kept for auditing
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

taskSchema.index({ user: 1, status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
