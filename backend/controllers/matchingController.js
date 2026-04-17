const MicroTask = require('../models/MicroTask');
const User = require('../models/User');
const ResourceOffer = require('../models/ResourceOffer');
const CriticalRequest = require('../models/CriticalRequest');
const Notification = require('../models/Notification');

const DEFAULT_MATCH_RADIUS_METERS = Number(process.env.MATCH_RADIUS_METERS) || 500;

const urgencyPriority = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
};

const isOfferCurrentlyAvailable = (offer) => {
  const now = new Date();
  return (
    offer.status === 'Available' &&
    offer.remainingQuantity > 0 &&
    new Date(offer.availabilityStart) <= now &&
    new Date(offer.availabilityEnd) >= now
  );
};

const buildMatchScore = (request, offer, radiusMeters) => {
  const distance = getDistanceMeters(
    request.latitude,
    request.longitude,
    offer.latitude,
    offer.longitude
  );
  const distanceScore = Math.max(0, 1 - distance / radiusMeters);
  const urgencyScore = (urgencyPriority[request.urgency] || 0) / 4;
  const availabilityScore = isOfferCurrentlyAvailable(offer) ? 1 : 0;

  const score = distanceScore * 0.5 + availabilityScore * 0.3 + urgencyScore * 0.2;

  return {
    distance,
    score,
    distanceScore,
    urgencyScore,
    availabilityScore,
  };
};

const findMatchesForRequest = async (request, radiusMeters = DEFAULT_MATCH_RADIUS_METERS) => {
  if (!request.latitude || !request.longitude) {
    return [];
  }

  const now = new Date();
  const offers = await ResourceOffer.find({
    status: 'Available',
    remainingQuantity: { $gt: 0 },
    availabilityStart: { $lte: now },
    availabilityEnd: { $gte: now },
  }).populate('postedBy', 'name phone email');

  const scored = offers
    .map((offer) => {
      const { distance, score } = buildMatchScore(request, offer, radiusMeters);
      return distance <= radiusMeters
        ? {
            offerId: offer._id,
            resourceName: offer.resourceName,
            ownerId: offer.postedBy?._id,
            ownerName: offer.ownerName,
            ownerPhone: offer.phone,
            ownerEmail: offer.postedBy?.email,
            community: offer.community,
            areaName: offer.areaName,
            remainingQuantity: offer.remainingQuantity,
            availabilityStart: offer.availabilityStart,
            availabilityEnd: offer.availabilityEnd,
            distance: Number(distance.toFixed(0)),
            score,
            latitude: offer.latitude,
            longitude: offer.longitude,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5);
};

const findMatchesForOffer = async (offer, radiusMeters = DEFAULT_MATCH_RADIUS_METERS) => {
  if (!offer.latitude || !offer.longitude || !isOfferCurrentlyAvailable(offer)) {
    return [];
  }

  const requests = await CriticalRequest.find({
    status: 'approved',
    helper: null,
    latitude: { $ne: null },
    longitude: { $ne: null },
  }).populate('postedBy', 'name phone email location');

  const scored = requests
    .map((request) => {
      const { distance, score } = buildMatchScore(request, offer, radiusMeters);
      return distance <= radiusMeters
        ? {
            requestId: request._id,
            requesterId: request.postedBy?._id,
            title: request.title,
            urgency: request.urgency,
            requesterName: request.postedBy?.name,
            requesterPhone: request.postedBy?.phone,
            requesterEmail: request.postedBy?.email,
            location: request.location,
            exactLocation: request.exactLocation,
            distance: Number(distance.toFixed(0)),
            score,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5);
};

const alreadyNotified = async (userId, type, meta) => {
  if (!userId) return false;
  const query = { user: userId, type };

  if (meta.requestId) query['meta.requestId'] = meta.requestId;
  if (meta.resourceId) query['meta.resourceId'] = meta.resourceId;

  return Notification.exists(query);
};

const createMatchNotification = async ({ userId, type, title, message, meta }) => {
  if (!userId) return null;
  if (await alreadyNotified(userId, type, meta)) {
    return null;
  }

  return Notification.create({
    user: userId,
    type,
    title,
    message,
    isRead: false,
    meta,
  });
};

const notifyProximityMatchesForRequest = async (request, io) => {
  if (!request.latitude || !request.longitude) {
    return [];
  }

  const matches = await findMatchesForRequest(request);
  const created = [];

  for (const match of matches) {
    const requesterNotification = await createMatchNotification({
      userId: request.postedBy,
      type: 'PROXIMITY_MATCH_FOUND_FOR_REQUESTER',
      title: 'Nearby resource match found',
      message: `A nearby resource offer for ${match.resourceName} was found within ${match.distance} meters of your request.`,
      meta: {
        requestId: request._id,
        resourceId: match.offerId,
      },
    });
    if (requesterNotification) created.push(requesterNotification);

    const ownerNotification = await createMatchNotification({
      userId: match.ownerId || null,
      type: 'PROXIMITY_MATCH_FOUND_FOR_OWNER',
      title: 'Potential urgent request match',
      message: `A nearby urgent request (${request.title}) was identified within ${match.distance} meters of your resource offer.`,
      meta: {
        requestId: request._id,
        resourceId: match.offerId,
      },
    });
    if (ownerNotification) created.push(ownerNotification);
  }

  if (io && created.length > 0) {
    io.emit('proximityMatchesUpdated', { requestId: request._id, matches });
  }

  return matches;
};

const notifyProximityMatchesForOffer = async (offer, io) => {
  if (!offer.latitude || !offer.longitude) {
    return [];
  }

  const matches = await findMatchesForOffer(offer);
  const created = [];

  for (const match of matches) {
    const ownerNotification = await createMatchNotification({
      userId: offer.postedBy,
      type: 'PROXIMITY_MATCH_FOUND_FOR_OWNER',
      title: 'Nearby urgent request found',
      message: `An approved urgent help request (${match.title}) is within ${match.distance} meters of your offered resource.`,
      meta: {
        requestId: match.requestId,
        resourceId: offer._id,
      },
    });
    if (ownerNotification) created.push(ownerNotification);

    const requesterNotification = await createMatchNotification({
      userId: match.requesterId || null,
      type: 'PROXIMITY_MATCH_FOUND_FOR_REQUESTER',
      title: 'Resource offer found nearby',
      message: `A nearby available resource offer (${offer.resourceName}) was found within ${match.distance} meters of your request.`,
      meta: {
        requestId: match.requestId,
        resourceId: offer._id,
      },
    });
    if (requesterNotification) created.push(requesterNotification);
  }

  if (io && created.length > 0) {
    io.emit('proximityMatchesUpdatedForOffer', { resourceId: offer._id, matches });
  }

  return matches;
};

// @desc    Get top matching volunteers for a specific micro-task
// @route   GET /api/matching/microtask/:taskId
// @access  Private
exports.matchVolunteersForTask = async (req, res) => {
  try {
    const task = await MicroTask.findById(req.params.taskId).populate('postedBy', 'location');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const potentialHelpers = await User.find({ _id: { $ne: task.postedBy._id } });

    const scored = potentialHelpers.map((helper) => {
      const distance = getDistanceMeters(
        task.location.lat,
        task.location.lng,
        helper.location.lat,
        helper.location.lng
      );
      const distanceScore = Math.max(0, 1 - distance / 5000);

      let skillOverlap = 0;
      if (task.suggestedSkills.length > 0) {
        const helperSkills = helper.skills.map((s) => s.name.toLowerCase());
        const matched = task.suggestedSkills.filter((skill) =>
          helperSkills.includes(skill.toLowerCase())
        ).length;
        skillOverlap = matched / task.suggestedSkills.length;
      }

      const reputationScore = Math.min(1, helper.reputationScore / 100);
      const totalScore = distanceScore * 0.4 + skillOverlap * 0.4 + reputationScore * 0.2;

      return {
        userId: helper._id,
        name: helper.name,
        location: helper.location,
        skills: helper.skills,
        reputationScore: helper.reputationScore,
        distance: Number(distance.toFixed(2)),
        score: totalScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, 5);

    res.json({ taskId: task._id, matches: top5 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get top matching offers for a specific request
// @route   GET /api/matching/request/:requestId/offers
// @access  Private
exports.matchOffersForRequest = async (req, res) => {
  try {
    const request = await CriticalRequest.findById(req.params.requestId).populate('postedBy', 'name email location');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (!req.user.isAdmin && request.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to view matches for this request.' });
    }

    const matches = await findMatchesForRequest(request);
    res.json({ requestId: request._id, matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get matches for the current user's open requests
// @route   GET /api/matching/my-requests
// @access  Private
exports.matchOffersForMyRequests = async (req, res) => {
  try {
    const requests = await CriticalRequest.find({
      postedBy: req.user._id,
      status: 'approved',
      helper: null,
    }).populate('postedBy', 'name email location');

    const result = await Promise.all(
      requests.map(async (request) => ({
        requestId: request._id,
        title: request.title,
        urgency: request.urgency,
        status: request.status,
        location: request.location,
        exactLocation: request.exactLocation,
        latitude: request.latitude,
        longitude: request.longitude,
        matches: await findMatchesForRequest(request),
      }))
    );

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.notifyProximityMatchesForRequest = notifyProximityMatchesForRequest;
exports.notifyProximityMatchesForOffer = notifyProximityMatchesForOffer;
