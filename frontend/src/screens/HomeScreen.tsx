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
      <View style={styles.header}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.title}>{user?.name ?? "Student"}</Text>
      </View>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Chat")}>
        <Text style={styles.cardTitle}>Chats</Text>
        <Text style={styles.cardText}>Group messages and private conversations.</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Documents")}
      >
        <Text style={styles.cardTitle}>Documents</Text>
        <Text style={styles.cardText}>Upload, refresh, and open shared PDFs.</Text>
      </TouchableOpacity>

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
    padding: 20,
    paddingTop: 64,
  },
  header: {
    marginBottom: 28,
  },
  label: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "800",
    marginTop: 6,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    padding: 20,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  cardText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: "auto",
    padding: 16,
  },
  logoutText: {
    color: COLORS.text,
    fontWeight: "800",
  },
});
