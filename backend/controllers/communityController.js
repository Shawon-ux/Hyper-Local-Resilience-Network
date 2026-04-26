const { validationResult } = require('express-validator');
const Community = require('../models/Community');
const CommunityPost = require('../models/CommunityPost');
const { sendEmail } = require('../utils/email');

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.createCommunity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const name = String(req.body.name || '').trim();
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

  try {
    const community = await Community.create({
      name,
      description,
      leader: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json({ community });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyCommunities = async (req, res) => {
  try {
    const communities = await Community.find({ leader: req.user._id })
      .sort({ createdAt: -1 })
      .populate('joinRequests.user', 'name email address location')
      .lean();

    const sanitized = communities.map((community) => {
      const joinRequests = Array.isArray(community.joinRequests) ? community.joinRequests : [];
      const seen = new Set();
      const uniqueJoinRequests = [];

      for (const reqItem of joinRequests) {
        const id = String(reqItem?.user?._id || reqItem?.user || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        uniqueJoinRequests.push(reqItem);
      }

      return { ...community, joinRequests: uniqueJoinRequests };
    });

    res.json({ communities: sanitized });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchCommunities = async (req, res) => {
  const search = String(req.query.search || '').trim();
  const userId = String(req.user._id);

  try {
    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegExp(search), $options: 'i' } },
            { description: { $regex: escapeRegExp(search), $options: 'i' } },
          ],
        }
      : {};

    const communities = await Community.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('name description leader members joinRequests createdAt emergencyMode')
      .populate('leader', 'name')
      .lean();

    const results = communities.map((community) => {
      const leaderId = community.leader?._id ? String(community.leader._id) : '';
      const members = Array.isArray(community.members) ? community.members : [];
      const joinRequests = Array.isArray(community.joinRequests) ? community.joinRequests : [];

      const isLeader = leaderId === userId;
      const isMember = members.some((memberId) => String(memberId) === userId);
      const hasRequested = joinRequests.some((reqItem) => String(reqItem.user) === userId);

      return {
        _id: community._id,
        name: community.name,
        description: community.description,
        leader: community.leader,
        createdAt: community.createdAt,
        memberCount: members.length,
        isLeader,
        isMember,
        hasRequested,
        pendingRequestCount: joinRequests.length,
        emergencyMode: community.emergencyMode || false,
      };
    });

    res.json({ communities: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.requestToJoin = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');

  try {
    const updated = await Community.findOneAndUpdate(
      {
        _id: communityId,
        leader: { $ne: req.user._id },
        members: { $ne: req.user._id },
        'joinRequests.user': { $ne: req.user._id },
      },
      { $push: { joinRequests: { user: req.user._id, requestedAt: new Date() } } },
      { new: true }
    );

    if (updated) {
      return res.status(201).json({ message: 'Join request submitted' });
    }

    const community = await Community.findById(communityId).select('leader members joinRequests').lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (String(community.leader) === userId) {
      return res.status(400).json({ message: 'Leader is already a member' });
    }

    if (Array.isArray(community.members) && community.members.some((id) => String(id) === userId)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    if (
      Array.isArray(community.joinRequests) &&
      community.joinRequests.some((reqItem) => String(reqItem.user) === userId)
    ) {
      return res.status(400).json({ message: 'Join request already pending' });
    }

    return res.status(500).json({ message: 'Unable to submit join request' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.acceptJoinRequest = async (req, res) => {
  const leaderId = String(req.user._id);
  const communityId = String(req.params.communityId || '');
  const requestUserId = String(req.params.userId || '');

  try {
    const community = await Community.findById(communityId).populate('joinRequests.user', 'name email address location');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (String(community.leader) !== leaderId) {
      return res.status(403).json({ message: 'Only the leader can manage requests' });
    }

    const hasRequest = Array.isArray(community.joinRequests)
      ? community.joinRequests.some((reqItem) => String(reqItem.user?._id || reqItem.user) === requestUserId)
      : false;

    if (!hasRequest) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    community.joinRequests = community.joinRequests.filter(
      (reqItem) => String(reqItem.user?._id || reqItem.user) !== requestUserId
    );

    if (!community.members.some((id) => String(id) === requestUserId)) {
      community.members.push(requestUserId);
    }

    await community.save();

    const updated = await Community.findById(communityId)
      .populate('joinRequests.user', 'name email address location')
      .lean();

    res.json({ community: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.declineJoinRequest = async (req, res) => {
  const leaderId = String(req.user._id);
  const communityId = String(req.params.communityId || '');
  const requestUserId = String(req.params.userId || '');

  try {
    const community = await Community.findById(communityId).populate('joinRequests.user', 'name email address location');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (String(community.leader) !== leaderId) {
      return res.status(403).json({ message: 'Only the leader can manage requests' });
    }

    const before = Array.isArray(community.joinRequests) ? community.joinRequests.length : 0;
    community.joinRequests = (community.joinRequests || []).filter(
      (reqItem) => String(reqItem.user?._id || reqItem.user) !== requestUserId
    );

    if (community.joinRequests.length === before) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    await community.save();

    const updated = await Community.findById(communityId)
      .populate('joinRequests.user', 'name email address location')
      .lean();

    res.json({ community: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get community details and status for current user
// @route   GET /api/communities/:communityId/status
// @access  Private
exports.getCommunityStatus = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');

  try {
    const community = await Community.findById(communityId).lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isLeader = String(community.leader) === userId;
    const isMember = Array.isArray(community.members) && community.members.some((id) => String(id) === userId);
    const hasRequested =
      Array.isArray(community.joinRequests) &&
      community.joinRequests.some((reqItem) => String(reqItem.user) === userId);

    res.json({
      community: {
        _id: community._id,
        name: community.name,
        description: community.description,
        emergencyMode: community.emergencyMode || false,
      },
      status: {
        isLeader,
        isMember,
        hasRequested,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleEmergencyMode = async (req, res) => {
  const leaderId = String(req.user._id);
  const communityId = String(req.params.communityId || '');
  const { alertMessage } = req.body;

  try {
    const community = await Community.findById(communityId).populate('members', 'name email');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (String(community.leader) !== leaderId) {
      return res.status(403).json({ message: 'Only the leader can toggle emergency mode' });
    }

    community.emergencyMode = !community.emergencyMode;
    
    if (community.emergencyMode) {
      community.alertMessage = alertMessage || 'Emergency alert declared';
      
      // Send email to all members
       const emailSubject = `EMERGENCY ALERT: ${community.name}`;
       const emailText = `This Community Admin sent an emergency alert: ${community.alertMessage}\n\nPlease check the community dashboard for more details.`;
      
      const emailPromises = community.members.map(member => {
        if (member.email) {
          return sendEmail(member.email, emailSubject, emailText);
        }
        return Promise.resolve();
      });
      
      // Wait for all emails to be sent (or fail)
      await Promise.allSettled(emailPromises);
    } else {
      community.alertMessage = '';
    }

    await community.save();

    res.json({ community });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCommunityDetails = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');

  try {
    const community = await Community.findById(communityId)
      .populate('leader', 'name email')
      .populate('members', 'name email')
      .lean();

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isLeader = String(community.leader._id || community.leader) === userId;
    const isMember = Array.isArray(community.members) && community.members.some((m) => String(m._id || m) === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    res.json({
      community: {
        _id: community._id,
        name: community.name,
        description: community.description,
        leader: community.leader,
        members: community.members,
        memberCount: community.members.length,
        emergencyMode: community.emergencyMode || false,
        alertMessage: community.alertMessage || '',
        isLeader,
        isMember,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCommunityPosts = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');

  try {
    const community = await Community.findById(communityId).lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isLeader = String(community.leader) === userId;
    const isMember = Array.isArray(community.members) && community.members.some((m) => String(m) === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    const posts = await CommunityPost.find({ community: communityId })
      .populate('author', 'name email')
      .populate('acknowledgedBy', 'name email')
      .lean();

    const emergencyMode = community.emergencyMode || false;

    let filteredPosts = posts;
    if (emergencyMode) {
      filteredPosts = posts.filter((post) => post.type === 'emergency');
      filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      filteredPosts = posts;
    }

    res.json({ posts: filteredPosts, emergencyMode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPost = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');
  const { type, description, emergencyData } = req.body;

  let finalDescription = '';
  const postType = type === 'emergency' ? 'emergency' : 'normal';

  if (postType === 'emergency') {
    if (!emergencyData || !emergencyData.what || !emergencyData.amount || !emergencyData.when) {
      return res.status(400).json({ message: 'All emergency fields (what, amount, when) are required' });
    }
    finalDescription = `I want ${emergencyData.amount} ${emergencyData.what} at ${emergencyData.when}`;
  } else {
    if (!description || String(description).trim().length === 0) {
      return res.status(400).json({ message: 'Description is required' });
    }
    finalDescription = String(description).trim();
  }

  try {
    const community = await Community.findById(communityId).lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isLeader = String(community.leader) === userId;
    const isMember = Array.isArray(community.members) && community.members.some((m) => String(m) === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    const post = await CommunityPost.create({
      community: communityId,
      author: req.user._id,
      type: postType,
      description: finalDescription,
    });

    const populatedPost = await CommunityPost.findById(post._id)
      .populate('author', 'name email')
      .lean();

    res.status(201).json({ post: populatedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePostStatus = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');
  const postId = String(req.params.postId || '');
  const { status } = req.body;

  const validStatuses = ['pending', 'acknowledged'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status value. Only "pending" and "acknowledged" are allowed.' });
  }

  try {
    const community = await Community.findById(communityId).lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isLeader = String(community.leader) === userId;
    const isMember = Array.isArray(community.members) && community.members.some((m) => String(m) === userId);

    if (!isLeader && !isMember) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    const post = await CommunityPost.findOne({ _id: postId, community: communityId });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Prevent author from modifying their own post status
    if (String(post.author) === userId && !isLeader) {
      return res.status(403).json({ message: 'You cannot modify the status of your own post' });
    }

    if (!community.emergencyMode) {
      return res.status(403).json({ message: 'Emergency mode must be declared to update emergency post status' });
    }

    post.status = status;
    if (status === 'acknowledged') {
      post.acknowledgedBy = req.user._id;
    } else if (status === 'pending') {
      post.acknowledgedBy = undefined;
    }

    await post.save();

    const populatedPost = await CommunityPost.findById(post._id)
      .populate('author', 'name email')
      .populate('acknowledgedBy', 'name email')
      .lean();

    res.json({ post: populatedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePost = async (req, res) => {
  const userId = String(req.user._id);
  const communityId = String(req.params.communityId || '');
  const postId = String(req.params.postId || '');

  try {
    const post = await CommunityPost.findOne({ _id: postId, community: communityId });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isAuthor = String(post.author) === userId;
    
    // Allow author to delete if pending, or leader to delete any
    const community = await Community.findById(communityId).lean();
    const isLeader = community && String(community.leader) === userId;

    if (isAuthor) {
      if (post.status !== 'pending') {
        return res.status(403).json({ message: 'You can only delete your own pending posts' });
      }
    } else if (!isLeader) {
      return res.status(403).json({ message: 'You are not authorized to delete this post' });
    }

    await CommunityPost.deleteOne({ _id: postId });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
