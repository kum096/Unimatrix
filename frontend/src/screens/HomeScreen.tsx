import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { resetSocket } from "../services/socket";
import { clearUser, getUser } from "../store/userStore";
import { COLORS } from "../theme/colors";
import { RootStackParamList, User } from "../types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser().then(setUser).catch(() => undefined);
  }, []);

  const logout = async () => {
    resetSocket();
    await clearUser();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name ?? "S").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.label}>UniMatrix workspace</Text>
          <Text style={styles.title}>{user?.name ?? "Student"}</Text>
          <Text style={styles.subtitle}>ID {user?.studentId ?? "not loaded"}</Text>
        </View>
      </View>

      <View style={styles.statusGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>Live</Text>
          <Text style={styles.statLabel}>LAN backend</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Class levels</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryCard} onPress={() => navigation.navigate("Chat")}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardIconText}>C</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Messages</Text>
          <Text style={styles.cardText}>
            Direct chats, communities, replies, reactions, files, and voice-note UI.
          </Text>
        </View>
        <Text style={styles.cardArrow}>Open</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.navigate("Documents")}
      >
        <View style={[styles.cardIcon, styles.docIcon]}>
          <Text style={styles.cardIconText}>D</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Document Library</Text>
          <Text style={styles.cardText}>
            Upload, classify by level, search, preview, and open shared files.
          </Text>
        </View>
        <Text style={styles.cardArrow}>Open</Text>
      </TouchableOpacity>

      <View style={styles.notePanel}>
        <Text style={styles.noteTitle}>Demo checklist</Text>
        <Text style={styles.noteText}>
          Start backend, start Expo LAN, login with laptop IP, then test chat and
          document sharing from phones.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 18,
    paddingTop: 56,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 22,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
  },
  profileText: {
    flex: 1,
  },
  label: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.faint,
    fontWeight: "700",
  },
  statusGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  primaryCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    padding: 16,
  },
  cardIcon: {
    alignItems: "center",
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  docIcon: {
    backgroundColor: COLORS.secondary,
  },
  cardIconText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  cardText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  cardArrow: {
    color: COLORS.primary,
    fontWeight: "900",
  },
  notePanel: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    padding: 16,
  },
  noteTitle: {
    color: COLORS.text,
    fontWeight: "900",
    marginBottom: 6,
  },
  noteText: {
    color: COLORS.muted,
    lineHeight: 20,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: "auto",
    padding: 16,
  },
  logoutText: {
    color: COLORS.text,
    fontWeight: "900",
  },
});
