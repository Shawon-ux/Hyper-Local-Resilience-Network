const Notification = require("../models/Notification");

const emitNotificationToUser = (io, userId, notification) => {
  if (!io || !userId || !notification) return;
  io.to(`user:${String(userId)}`).emit("notification:new", notification);
};

const createNotification = async ({
  io,
  user,
  type,
  title,
  message,
  meta = {},
}) => {
  const notification = await Notification.create({
    user,
    type,
    title,
    message,
    meta,
  });

  emitNotificationToUser(io, user, notification);
  return notification;
};

module.exports = {
  createNotification,
  emitNotificationToUser,
};
