import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  Switch,
} from "react-native";
import { api } from "../../utils/api";
import { showToast } from "../../utils/toast";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    requiresApproval: true,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleParticipation = async (eventId, status) => {
    try {
      await api.setEventParticipation(eventId, status);
      showToast.success(`Marked as ${status.toLowerCase()}`);
      fetchEvents();
    } catch (error) {
      showToast.error(error.message || "Unable to update status");
    }
  };

  const handleCreateEvent = async () => {
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Society Events</Text>
          <Text style={styles.subtitle}>
            Discover upcoming activities, RSVP, and share your own ideas.
          </Text>
        </View>

        <View style={styles.layout}>
          <Card style={styles.eventsCard} padding="md">
            {loading ? (
              <Loader />
            ) : events.length === 0 ? (
              <Text style={styles.emptyText}>
                No events scheduled. Be the first to create one!
              </Text>
            ) : (
              <View style={styles.eventsList}>
                {events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventMeta}>
                          {new Date(event.date).toLocaleString()} ·{" "}
                          {event.location}
                        </Text>
                        <Text style={styles.eventHost}>
                          Hosted by {event.createdBy?.name || "Resident"}
                        </Text>
                      </View>
                      <View style={styles.eventActions}>
                        <Button
                          size="sm"
                          variant={
                            event.viewerStatus === "INTERESTED"
                              ? "primary"
                              : "secondary"
                          }
                          onPress={() =>
                            handleParticipation(event.id, "INTERESTED")
                          }
                          style={styles.participationButton}
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
                          onPress={() => handleParticipation(event.id, "GOING")}
                          style={styles.participationButton}
                        >
                          Going
                        </Button>
                      </View>
                    </View>
                    <Text style={styles.eventDescription}>
                      {event.description}
                    </Text>
                    <View style={styles.eventStats}>
                      <Text style={styles.eventStat}>
                        Interested: {event.participants?.interested || 0}
                      </Text>
                      <Text style={styles.eventStat}>
                        Going: {event.participants?.going || 0}
                      </Text>
                      {event.status === "PENDING" && (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingText}>
                            Pending approval
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.formCard} padding="md">
            <Text style={styles.formTitle}>Propose an event</Text>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Event title"
                value={form.title}
                onChangeText={(text) => setForm({ ...form, title: text })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the event idea"
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Date and time (YYYY-MM-DDTHH:mm)"
                value={form.date}
                onChangeText={(text) => setForm({ ...form, date: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Location"
                value={form.location}
                onChangeText={(text) => setForm({ ...form, location: text })}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  Requires committee approval
                </Text>
                <Switch
                  value={form.requiresApproval}
                  onValueChange={(value) =>
                    setForm({ ...form, requiresApproval: value })
                  }
                />
              </View>
              <Button
                onPress={handleCreateEvent}
                fullWidth
                loading={saving}
                style={styles.submitButton}
              >
                Submit Event
              </Button>
            </View>
            <Text style={styles.formFooter}>
              Admins review all submissions. Officers and admins publish
              directly.
            </Text>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  layout: {
    gap: 16,
  },
  eventsCard: {
    marginBottom: 16,
  },
  eventsList: {
    gap: 16,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventInfo: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  eventHost: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  eventActions: {
    flexDirection: "row",
    gap: 8,
  },
  participationButton: {
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  eventStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "center",
  },
  eventStat: {
    fontSize: 14,
    color: "#6B7280",
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
  },
  pendingText: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#92400E",
  },
  formCard: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  submitButton: {
    marginTop: 8,
  },
  formFooter: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 48,
  },
});
