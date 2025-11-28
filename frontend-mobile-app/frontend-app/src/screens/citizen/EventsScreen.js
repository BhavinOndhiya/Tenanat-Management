import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { api } from "../../utils/api";
import { Ionicons } from "@expo/vector-icons";

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleParticipation = async (eventId, currentStatus) => {
    try {
      const newStatus = currentStatus === "GOING" ? "NOT_GOING" : "GOING";
      await api.setEventParticipation(eventId, newStatus);
      loadEvents();
    } catch (error) {
      console.error("Error updating participation:", error);
    }
  };

  const renderEvent = ({ item }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}
      </View>
      <Text style={styles.eventDescription}>{item.description}</Text>
      <View style={styles.eventDetails}>
        <View style={styles.eventDetail}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.eventDetailText}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.eventDetail}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.eventDetailText}>
            {new Date(item.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.eventDetail}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.eventDetailText}>{item.location}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.participateButton,
          item.participationStatus === "GOING" &&
            styles.participateButtonActive,
        ]}
        onPress={() => handleParticipation(item.id, item.participationStatus)}
      >
        <Text
          style={[
            styles.participateButtonText,
            item.participationStatus === "GOING" &&
              styles.participateButtonTextActive,
          ]}
        >
          {item.participationStatus === "GOING" ? "Going ✓" : "Mark as Going"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadEvents} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events scheduled</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
    paddingTop: 20,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 8,
  },
  urgentBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  eventDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
  },
  participateButton: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  participateButtonActive: {
    backgroundColor: "#6366f1",
  },
  participateButtonText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "600",
  },
  participateButtonTextActive: {
    color: "#fff",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
  },
});
