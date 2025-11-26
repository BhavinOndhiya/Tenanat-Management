import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Loader from "../components/ui/Loader";
import { api } from "../utils/api";
import { showToast } from "../utils/toast";

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    requiresApproval: true,
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await api.getEvents();
      setEvents(data);
    } catch (error) {
      showToast.error(error.message || "Unable to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleParticipation = async (eventId, status) => {
    try {
      await api.setEventParticipation(eventId, status);
      showToast.success(`Marked as ${status.toLowerCase()}`);
      fetchEvents();
    } catch (error) {
      showToast.error(error.message || "Unable to update status");
    }
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    if (!form.date) {
      showToast.error("Please select a date and time");
      return;
    }
    setSaving(true);
    try {
      await api.createEvent({
        ...form,
        date: new Date(form.date).toISOString(),
      });
      showToast.success("Event submitted");
      setForm({
        title: "",
        description: "",
        date: "",
        location: "",
        requiresApproval: true,
      });
      fetchEvents();
    } catch (error) {
      showToast.error(error.message || "Unable to create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Society Events
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Discover upcoming activities, RSVP, and share your own ideas.
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
              No events scheduled. Be the first to create one!
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
                        Hosted by {event.createdBy?.name || "Resident"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={
                          event.viewerStatus === "INTERESTED"
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() =>
                          handleParticipation(event.id, "INTERESTED")
                        }
                      >
                        Interested
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          event.viewerStatus === "GOING"
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() => handleParticipation(event.id, "GOING")}
                      >
                        Going
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
                    {event.status === "PENDING" && (
                      <span className="px-2 py-0.5 text-xs uppercase tracking-wide rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)]">
                        Pending approval
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Propose an event
          </h2>
          <form className="space-y-4" onSubmit={handleCreateEvent}>
            <input
              type="text"
              placeholder="Event title"
              required
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
            <textarea
              required
              rows={3}
              placeholder="Describe the event idea"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
            <input
              type="datetime-local"
              required
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
            <input
              type="text"
              placeholder="Location"
              required
              value={form.location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location: event.target.value }))
              }
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            />
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                id="requires-approval-citizen"
                checked={form.requiresApproval}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    requiresApproval: event.target.checked,
                  }))
                }
                className="h-4 w-4 border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <label htmlFor="requires-approval-citizen">
                Requires committee approval
              </label>
            </div>
            <Button type="submit" fullWidth loading={saving}>
              Submit Event
            </Button>
          </form>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
            Admins review all submissions. Officers and admins publish directly.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default Events;
