const { Notification, User } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { paged } = require('../../utils/schemas');

async function recipientsFor({ roles = [], departmentHeadOf = null }) {
  const or = [];
  if (roles.length) or.push({ role: { $in: roles } });
  if (departmentHeadOf) or.push({ role: 'DEPT_HEAD', departmentId: departmentHeadOf });
  if (!or.length) return [];
  const users = await User.find({ isActive: true, $or: or }).select('_id').lean();
  return users.map((u) => u._id);
}

// Duplicate dedupeKey inserts are expected (one alert per level per period) and silently skipped.
async function notifyMany(userIds, { type, message, link = null, dedupeKey }) {
  if (!userIds.length) return 0;
  const docs = userIds.map((userId) => ({ userId, type, message, link, isRead: false, ...(dedupeKey ? { dedupeKey } : {}) }));
  try {
    const inserted = await Notification.insertMany(docs, { ordered: false });
    return inserted.length;
  } catch (err) {
    const writeErrors = err.writeErrors || [];
    if (writeErrors.length && writeErrors.every((e) => (e.code ?? e.err?.code) === 11000)) {
      return (err.insertedDocs || []).length;
    }
    throw err;
  }
}

async function list(userId, { page, limit, unreadOnly }) {
  const filter = { userId };
  if (unreadOnly === 'true') filter.isRead = false;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);
  return { ...paged(items, total, page, limit), unreadCount };
}

async function markRead(userId, id) {
  const n = await Notification.findOneAndUpdate({ _id: id, userId }, { $set: { isRead: true } }, { new: true }).lean();
  if (!n) throw ApiError.notFound('Notification not found');
  return n;
}

async function markAllRead(userId) {
  const r = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
  return { updated: r.modifiedCount };
}

module.exports = { recipientsFor, notifyMany, list, markRead, markAllRead };
