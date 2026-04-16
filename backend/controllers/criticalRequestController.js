const CriticalRequest = require('../models/CriticalRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

const urgencyPriority = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const statusPriority = {
  pending: 0,
  approved: 1,
  in_progress: 2,
  fulfilled: 3,
  rejected: 4,
};

const formatRequest = (request) => ({
  ...request.toObject(),
  urgencyRank: urgencyPriority[request.urgency] || 0,
  statusRank: statusPriority[request.status] ?? 0,
});

exports.createRequest = async (req, res) => {
  const { title, description, urgency, location, exactLocation, contactNumber } = req.body;

  if (!title?.trim() || !description?.trim() || !location?.trim() || !exactLocation?.trim() || !contactNumber?.trim()) {
    return res.status(400).json({ message: 'Title, description, location, exact location, and contact number are required.' });
  }

  const request = await CriticalRequest.create({
    title: title.trim(),
    description: description.trim(),
    urgency: ['Low', 'Medium', 'High', 'Critical'].includes(urgency) ? urgency : 'Medium',
    postedBy: req.user._id,
    location: location.trim(),
    exactLocation: exactLocation.trim(),
    contactNumber: contactNumber.trim(),
  });

  await request.populate('postedBy', 'name email location phone');

  res.status(201).json(request);
};

exports.listRequests = async (req, res) => {
  const filter = req.user.isAdmin
    ? {}
    : { status: { $in: ['approved', 'in_progress', 'fulfilled'] } };

  const requests = await CriticalRequest.find(filter)
    .populate('postedBy', 'name email location')
    .populate('helper', 'name email')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email');

  const sorted = requests
    .map(formatRequest)
    .sort((a, b) => {
      if (a.statusRank !== b.statusRank) {
        return a.statusRank - b.statusRank;
      }
      if (b.urgencyRank !== a.urgencyRank) {
        return b.urgencyRank - a.urgencyRank;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  res.json(sorted);
};

exports.getMyRequests = async (req, res) => {
  const requests = await CriticalRequest.find({
    $or: [{ postedBy: req.user._id }, { helper: req.user._id }],
  })
    .populate('postedBy', 'name email location')
    .populate('helper', 'name email')
    .populate('approvedBy', 'name email')
    .populate('rejectedBy', 'name email');

  const sorted = requests
    .map(formatRequest)
    .sort((a, b) => {
      if (a.statusRank !== b.statusRank) {
        return a.statusRank - b.statusRank;
      }
      if (b.urgencyRank !== a.urgencyRank) {
        return b.urgencyRank - a.urgencyRank;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  res.json(sorted);
};

exports.approveRequest = async (req, res) => {
  const request = await CriticalRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  if (request.status !== 'pending') {
    return res
      .status(400)
      .json({ message: 'Only pending requests can be approved.' });
  }

  request.status = 'approved';
  request.approvedBy = req.user._id;
  await request.save();

  const recipients = await User.find({ isAdmin: false, _id: { $ne: request.postedBy } }).select('_id');
  const notificationEntries = recipients.map((recipient) => ({
    user: recipient._id,
    type: 'REQUEST_APPROVED_AVAILABLE',
    title: 'New help request is available',
    message: `A community request for ${request.title} has been approved and is ready to be claimed.`,
    isRead: false,
    meta: {
      requestId: request._id,
      requesterId: request.postedBy,
    },
  }));

  if (notificationEntries.length > 0) {
    await Notification.create(notificationEntries);
  }

  await request.populate('postedBy', 'name email location phone');
  await request.populate('helper', 'name email');
  await request.populate('approvedBy', 'name email');

  req.app.get('io')?.emit('requestApproved', { requestId: request._id, title: request.title });

  res.json(request);
};

exports.rejectRequest = async (req, res) => {
  const request = await CriticalRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  if (request.status !== 'pending') {
    return res
      .status(400)
      .json({ message: 'Only pending requests can be rejected.' });
  }

  request.status = 'rejected';
  request.rejectedBy = req.user._id;
  await request.save();

  await request.populate('postedBy', 'name email location');
  await request.populate('helper', 'name email');
  await request.populate('rejectedBy', 'name email');

  res.json(request);
};

exports.claimRequest = async (req, res) => {
  const request = await CriticalRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  if (request.postedBy.toString() === req.user._id.toString()) {
    return res
      .status(400)
      .json({ message: 'You cannot help your own request.' });
  }

  if (request.status !== 'approved') {
    return res
      .status(400)
      .json({ message: 'Only approved requests can be claimed.' });
  }

  if (request.helper) {
    return res
      .status(400)
      .json({ message: 'This request already has a helper.' });
  }

  request.status = 'in_progress';
  request.helper = req.user._id;
  await request.save();

  await request.populate('postedBy', 'name email location');
  await request.populate('helper', 'name email');

  req.app.get('io')?.emit('requestClaimed', { requestId: request._id, helperId: req.user._id });

  res.json(request);
};

exports.fulfillRequest = async (req, res) => {
  const request = await CriticalRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  if (request.postedBy.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: 'Only the requester can mark the request fulfilled.' });
  }

  if (request.status !== 'in_progress') {
    return res
      .status(400)
      .json({ message: 'Only in-progress requests can be fulfilled.' });
  }

  request.status = 'fulfilled';
  await request.save();

  await request.populate('postedBy', 'name email location');
  await request.populate('helper', 'name email');

  req.app.get('io')?.emit('requestFulfilled', { requestId: request._id });

  res.json(request);
};
