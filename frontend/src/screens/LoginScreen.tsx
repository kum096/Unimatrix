import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";
import { loadServerUrl, saveServerUrl, saveUser } from "../store/userStore";
import { COLORS } from "../theme/colors";
import { RootStackParamList, User } from "../types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServerUrl().then(setServerUrl).catch(() => undefined);
  }, []);

  const login = async () => {
    const cleanName = name.trim();
    const cleanStudentId = studentId.trim();

    if (!cleanName || !cleanStudentId || !serverUrl.trim()) {
      Alert.alert("Missing details", "Enter your name, student ID, and server URL.");
      return;
    }

    try {
      setLoading(true);
      await saveServerUrl(serverUrl);

      const res = await api.post<{ user: User }>("/auth/login", {
        name: cleanName,
        studentId: cleanStudentId,
      });

      await saveUser(res.data.user);
      navigation.replace("Home");
    } catch {
      Alert.alert(
        "Connection failed",
        "Start the backend and confirm your phone is on the same Wi-Fi as the laptop.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>UniMatrix</Text>
        <Text style={styles.subtitle}>Offline class chat and PDF sharing.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="words"
          placeholder="Name"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          autoCapitalize="characters"
          placeholder="Student ID"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          value={studentId}
          onChangeText={setStudentId}
        />

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="Backend URL, e.g. http://192.168.43.120:3000"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
        />

        <TouchableOpacity
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={login}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  brand: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    padding: 16,
  },
  button: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 54,
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: "800",
  },
});
