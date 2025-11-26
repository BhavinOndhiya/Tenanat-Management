import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleCheck.js";
import Event from "../models/Event.js";
import EventParticipant from "../models/EventParticipant.js";

const router = express.Router();

router.use(authenticateToken);

const serializeEvent = (event, counters = {}, viewerStatus = null) => ({
  id: event._id.toString(),
  title: event.title,
  description: event.description,
  date: event.date,
  location: event.location,
  requiresApproval: event.requiresApproval,
  status: event.status,
  createdAt: event.createdAt,
  createdBy: event.createdBy
    ? {
        id: event.createdBy._id.toString(),
        name: event.createdBy.name,
        email: event.createdBy.email,
      }
    : null,
  participants: {
    going: counters.going || 0,
    interested: counters.interested || 0,
  },
  viewerStatus,
});

router.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const events = await Event.find({
      status: { $ne: "CANCELLED" },
      date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    })
      .populate("createdBy", "name email")
      .sort({ date: 1 })
      .lean();

    const eventIds = events.map((event) => event._id);

    const [counts, viewerParticipation] = await Promise.all([
      EventParticipant.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        {
          $group: {
            _id: { eventId: "$eventId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
      EventParticipant.find({
        eventId: { $in: eventIds },
        userId: req.user.id,
      }).lean(),
    ]);

    const countersMap = {};
    counts.forEach((row) => {
      const eventId = row._id.eventId.toString();
      const statusKey = row._id.status.toLowerCase();
      countersMap[eventId] = countersMap[eventId] || {};
      countersMap[eventId][statusKey] = row.count;
    });

    const viewerMap = viewerParticipation.reduce((acc, entry) => {
      acc[entry.eventId.toString()] = entry.status;
      return acc;
    }, {});

    res.json(
      events.map((event) =>
        serializeEvent(
          event,
          countersMap[event._id.toString()],
          viewerMap[event._id.toString()] || null
        )
      )
    );
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  requireRole(["CITIZEN", "OFFICER", "ADMIN"]),
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        date,
        location,
        requiresApproval = false,
      } = req.body;

      if (!title || !description || !date || !location) {
        return res.status(400).json({
          error: "title, description, date, and location are required",
        });
      }

      const isManager = ["ADMIN", "OFFICER"].includes(req.user.role);
      const eventStatus =
        isManager || !requiresApproval ? "PUBLISHED" : "PENDING";

      const event = await Event.create({
        title,
        description,
        date: new Date(date),
        location,
        requiresApproval,
        status: eventStatus,
        createdBy: req.user.id,
      });

      const populated = await event.populate("createdBy", "name email");

      res.status(201).json(serializeEvent(populated));
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const counts = await EventParticipant.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counters = {};
    counts.forEach((row) => {
      counters[row._id.toLowerCase()] = row.count;
    });

    const viewer = await EventParticipant.findOne({
      eventId: event._id,
      userId: req.user.id,
    });

    res.json(serializeEvent(event, counters, viewer?.status || null));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, status } = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isCreator = event.createdBy.toString() === req.user.id;

    if (!isAdmin && !isCreator) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this event" });
    }

    if (typeof title !== "undefined") event.title = title;
    if (typeof description !== "undefined") event.description = description;
    if (typeof date !== "undefined") event.date = new Date(date);
    if (typeof location !== "undefined") event.location = location;
    if (typeof status !== "undefined") event.status = status;

    await event.save();

    const populated = await event.populate("createdBy", "name email");

    const counts = await EventParticipant.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counters = {};
    counts.forEach((row) => {
      counters[row._id.toLowerCase()] = row.count;
    });

    res.json(serializeEvent(populated, counters));
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isCreator = event.createdBy.toString() === req.user.id;

    if (!isAdmin && !isCreator) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this event" });
    }

    await Event.findByIdAndDelete(id);
    await EventParticipant.deleteMany({ eventId: id });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/:id/participation", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["INTERESTED", "GOING"].includes(status)) {
      return res.status(400).json({ error: "Invalid participation status" });
    }

    const eventExists = await Event.exists({ _id: id });
    if (!eventExists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const participation = await EventParticipant.findOneAndUpdate(
      { eventId: new mongoose.Types.ObjectId(id), userId: req.user.id },
      { status },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      id: participation._id.toString(),
      eventId: participation.eventId.toString(),
      status: participation.status,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/participants",
  requireRole(["ADMIN", "OFFICER"]),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const participants = await EventParticipant.find({
        eventId: id,
      })
        .populate("userId", "name email role")
        .sort({ status: 1 })
        .lean();

      res.json(
        participants.map((participant) => ({
          id: participant._id.toString(),
          status: participant.status,
          user: participant.userId
            ? {
                id: participant.userId._id.toString(),
                name: participant.userId.name,
                email: participant.userId.email,
                role: participant.userId.role,
              }
            : null,
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
