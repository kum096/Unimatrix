import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, buildApiUrl } from "../services/api";
import { getUser } from "../store/userStore";
import { COLORS } from "../theme/colors";
import { DocumentRecord, RootStackParamList, User } from "../types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Documents">;

type PickedPdf = {
  uri: string;
  name: string;
  mimeType?: string;
};

export default function DocumentsScreen({ navigation }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadDocs = async () => {
    const res = await api.get<DocumentRecord[]>("/documents");
    setDocs(res.data);
  };

  useEffect(() => {
    getUser().then(setUser).catch(() => undefined);
    loadDocs().catch(() => {
      Alert.alert("Cannot load documents", "Check that the backend is running.");
    }).finally(() => setLoading(false));
  }, []);

  const upload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const file = result.assets[0] as PickedPdf;
    const form = new FormData();

    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/pdf",
    } as unknown as Blob);
    form.append("uploadedBy", user?.name ?? "unknown");

    try {
      setUploading(true);
      await api.post("/documents/upload", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      await loadDocs();
    } catch {
      Alert.alert("Upload failed", "Only PDFs up to 50MB are accepted.");
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: DocumentRecord) => {
    const url = buildApiUrl(doc.url);
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert("Cannot open PDF", url);
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{docs.length} PDFs available</Text>
        </View>
      </View>

      <TouchableOpacity
        disabled={uploading}
        style={[styles.uploadButton, uploading && styles.disabled]}
        onPress={upload}
      >
        {uploading ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <Text style={styles.uploadText}>Upload PDF</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={docs}
          keyExtractor={(item) => item.filename}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              tintColor={COLORS.primary}
              onRefresh={() => loadDocs().catch(() => undefined)}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No PDFs yet. Upload one from this phone.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.docCard} onPress={() => openDocument(item)}>
              <Text numberOfLines={1} style={styles.docTitle}>
                {item.originalName}
              </Text>
              <Text style={styles.docMeta}>
                {item.uploadedBy} · {(item.size / 1024).toFixed(1)} KB
              </Text>
              <Text style={styles.openText}>Open PDF</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingTop: 54,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    marginBottom: 18,
  },
  back: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  uploadButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 52,
  },
  disabled: {
    opacity: 0.65,
  },
  uploadText: {
    color: COLORS.text,
    fontWeight: "800",
  },
  loader: {
    marginTop: 28,
  },
  list: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  empty: {
    color: COLORS.muted,
    marginTop: 24,
    textAlign: "center",
  },
  docCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  docTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  docMeta: {
    color: COLORS.muted,
    marginTop: 6,
  },
  openText: {
    color: COLORS.primary,
    fontWeight: "800",
    marginTop: 12,
  },
});
