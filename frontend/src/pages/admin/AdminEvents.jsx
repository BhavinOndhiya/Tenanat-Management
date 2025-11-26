import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participantsMap, setParticipantsMap] = useState({});
  const [participantsLoading, setParticipantsLoading] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    requiresApproval: false,
  });

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminEvents();
      setEvents(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.date) {
      showToast.error("Please select an event date/time");
      return;
    }
    setSaving(true);
    try {
      await api.createAdminEvent({
        ...form,
        date: new Date(form.date).toISOString(),
      });
      showToast.success("Event created");
      setForm({
        title: "",
        description: "",
        date: "",
        location: "",
        requiresApproval: false,
      });
      loadEvents();
    } catch (error) {
      showToast.error(error.message || "Unable to create event");
    } finally {
      setSaving(false);
    }
  };

  const updateEventStatus = async (eventId, status) => {
    try {
      await api.updateAdminEvent(eventId, { status });
      showToast.success(`Event marked as ${status.toLowerCase()}`);
      loadEvents();
    } catch (error) {
      showToast.error(error.message || "Unable to update event");
    }
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm("Delete this event?")) {
      return;
    }
    try {
      await api.deleteAdminEvent(eventId);
      showToast.success("Event removed");
      loadEvents();
    } catch (error) {
      showToast.error(error.message || "Unable to delete event");
    }
  };

  const toggleParticipants = async (eventId) => {
    if (participantsMap[eventId]) {
      setParticipantsMap((prev) => {
        const copy = { ...prev };
        delete copy[eventId];
        return copy;
      });
      return;
    }

    try {
      setParticipantsLoading(eventId);
      const data = await api.getEventParticipants(eventId);
      setParticipantsMap((prev) => ({ ...prev, [eventId]: data }));
    } catch (error) {
      showToast.error(error.message || "Unable to load participants");
    } finally {
      setParticipantsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Events & Functions
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Publish celebrations, manage approvals, and track interest.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-[var(--color-text-secondary)] py-10">
              No events planned yet.
            </p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-[var(--color-border)] rounded-xl px-4 py-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-[var(--color-text-primary)]">
                        {event.title}
                      </p>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {new Date(event.date).toLocaleString()} ·{" "}
                        {event.location}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        Created by {event.createdBy?.name || "Unknown"} ·
                        Status: {event.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {event.status !== "PUBLISHED" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            updateEventStatus(event.id, "PUBLISHED")
                          }
                        >
                          Publish
                        </Button>
                      )}
                      {event.status !== "CANCELLED" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            updateEventStatus(event.id, "CANCELLED")
                          }
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleParticipants(event.id)}
                      >
                        {participantsMap[event.id] ? "Hide" : "Participants"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteEvent(event.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="text-[var(--color-text-secondary)] mt-3">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-[var(--color-text-secondary)]">
                    <span>
                      Interested: {event.participants?.interested || 0}
                    </span>
                    <span>Going: {event.participants?.going || 0}</span>
                    {event.requiresApproval && (
                      <span className="px-2 py-0.5 text-xs uppercase tracking-wide rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)]">
                        Requires approval
                      </span>
                    )}
                  </div>
                  {participantsMap[event.id] && (
                    <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                      {participantsLoading === event.id ? (
                        <Loader size="sm" />
                      ) : participantsMap[event.id].length === 0 ? (
                        <p className="text-[var(--color-text-secondary)] text-sm">
                          No participants yet.
                        </p>
                      ) : (
                        <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                          {participantsMap[event.id].map((entry) => (
                            <li key={entry.id} className="flex justify-between">
                              <span>
                                {entry.user?.name} · {entry.user?.email}
                              </span>
                              <span className="font-semibold">
                                {entry.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Create society event
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Description
              </label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Date & time
              </label>
              <input
                type="datetime-local"
                required
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                Location
              </label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires-approval"
                checked={form.requiresApproval}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    requiresApproval: event.target.checked,
                  }))
                }
                className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label
                htmlFor="requires-approval"
                className="text-sm text-[var(--color-text-secondary)]"
              >
                Requires admin approval
              </label>
            </div>
            <Button type="submit" fullWidth loading={saving}>
              Create Event
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminEvents;
