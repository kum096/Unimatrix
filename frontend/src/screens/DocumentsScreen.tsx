import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, buildApiUrl } from "../services/api";
import { getUser } from "../store/userStore";
import { COLORS } from "../theme/colors";
import {
  DocumentClassLevel,
  DocumentRecord,
  RootStackParamList,
  User,
} from "../types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Documents">;

type PickedFile = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
};

type LocalDocument = DocumentRecord & {
  localUri?: string;
};

const documentsStoreKey = "localDocuments";
const levels: Array<DocumentClassLevel | "all"> = ["all", "1", "2", "3", "4", "5"];
const classLevels: DocumentClassLevel[] = ["1", "2", "3", "4", "5"];
const categories = ["All", "Slides", "Past questions", "Assignments", "Books", "Media"];

function formatSize(size: number): string {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function inferCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Media";
  if (mimeType.startsWith("audio/")) return "Media";
  if (mimeType.startsWith("video/")) return "Media";
  if (mimeType.includes("presentation")) return "Slides";
  return "All";
}

function makeLocalDoc(
  file: PickedFile,
  user: User | null,
  classLevel: DocumentClassLevel,
): LocalDocument {
  const id = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const mimeType = file.mimeType ?? "application/octet-stream";

  return {
    id,
    filename: file.name,
    originalName: file.name,
    uploadedBy: user?.name ?? "unknown",
    size: file.size ?? 0,
    mimeType,
    url: "",
    timestamp: Date.now(),
    classLevel,
    category: inferCategory(mimeType),
    localUri: file.uri,
  };
}

export default function DocumentsScreen({ navigation }: Props) {
  const [docs, setDocs] = useState<LocalDocument[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<DocumentClassLevel | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [uploadLevel, setUploadLevel] = useState<DocumentClassLevel>("1");
  const [preview, setPreview] = useState<LocalDocument | null>(null);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      const matchesSearch = `${doc.originalName} ${doc.uploadedBy} ${doc.category}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesLevel = selectedLevel === "all" || doc.classLevel === selectedLevel;
      const matchesCategory =
        selectedCategory === "All" || doc.category === selectedCategory;

      return matchesSearch && matchesLevel && matchesCategory;
    });
  }, [docs, search, selectedCategory, selectedLevel]);

  const loadDocs = async () => {
    const [remoteResponse, localValue] = await Promise.all([
      api.get<DocumentRecord[]>("/documents").catch(() => ({ data: [] })),
      AsyncStorage.getItem(documentsStoreKey),
    ]);
    const localDocs = localValue ? (JSON.parse(localValue) as LocalDocument[]) : [];
    const remoteDocs: LocalDocument[] = remoteResponse.data.map((doc, index) => ({
      ...doc,
      classLevel: doc.classLevel ?? ((String((index % 5) + 1) as DocumentClassLevel)),
      category: doc.category ?? "All",
    }));
    const merged = new Map<string, LocalDocument>();

    for (const doc of remoteDocs) merged.set(doc.filename, doc);
    for (const doc of localDocs) merged.set(doc.id, doc);

    setDocs(
      Array.from(merged.values()).sort(
        (first, second) => second.timestamp - first.timestamp,
      ),
    );
  };

  useEffect(() => {
    getUser().then(setUser).catch(() => undefined);
    loadDocs()
      .catch(() => Alert.alert("Cannot load library", "Check the backend server."))
      .finally(() => setLoading(false));
  }, []);

  const persistLocalDocs = async (items: LocalDocument[]) => {
    const localOnly = items.filter((doc) => doc.localUri);
    await AsyncStorage.setItem(documentsStoreKey, JSON.stringify(localOnly));
  };

  const upload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0] as PickedFile;
    const optimisticDoc = makeLocalDoc(file, user, uploadLevel);
    const nextDocs = [optimisticDoc, ...docs];
    const form = new FormData();

    setDocs(nextDocs);
    await persistLocalDocs(nextDocs);

    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
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
      Alert.alert(
        "Saved locally",
        "Backend upload for non-PDF documents will be wired in the next backend pass.",
      );
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: LocalDocument) => {
    const url = doc.localUri ?? buildApiUrl(doc.url);

    if (!url) {
      Alert.alert("No preview available", "This file has no readable URL yet.");
      return;
    }

    await Linking.openURL(url);
  };

  const deleteLocalDocument = async (doc: LocalDocument) => {
    const nextDocs = docs.filter((item) => item.id !== doc.id);
    setDocs(nextDocs);
    setPreview(null);
    await persistLocalDocs(nextDocs);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{filteredDocs.length} visible files</Text>
        </View>
      </View>

      <TextInput
        placeholder="Search documents, uploader, category"
        placeholderTextColor={COLORS.muted}
        style={styles.search}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
        {levels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.filterChip, selectedLevel === level && styles.activeChip]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text style={styles.filterText}>
              {level === "all" ? "All levels" : `Level ${level}`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.activeChip,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={styles.filterText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.uploadPanel}>
        <View style={styles.levelSelector}>
          {classLevels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                uploadLevel === level && styles.activeLevelButton,
              ]}
              onPress={() => setUploadLevel(level)}
            >
              <Text style={styles.levelText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          disabled={uploading}
          style={[styles.uploadButton, uploading && styles.disabled]}
          onPress={upload}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.uploadText}>Upload to Level {uploadLevel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredDocs}
          keyExtractor={(item) => item.id || item.filename}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              tintColor={COLORS.primary}
              onRefresh={() => loadDocs().catch(() => undefined)}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No files match this view.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.docCard} onPress={() => setPreview(item)}>
              <View style={styles.docIcon}>
                <Text style={styles.docIconText}>
                  {item.mimeType.includes("pdf") ? "PDF" : "DOC"}
                </Text>
              </View>
              <View style={styles.docInfo}>
                <Text numberOfLines={1} style={styles.docTitle}>
                  {item.originalName}
                </Text>
                <Text style={styles.docMeta}>
                  Level {item.classLevel ?? "1"} · {item.category ?? "All"} ·{" "}
                  {formatSize(item.size)}
                </Text>
                <Text style={styles.docUploader}>Shared by {item.uploadedBy}</Text>
              </View>
              <Text style={styles.previewText}>Preview</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal transparent visible={!!preview} animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}>
              <Text style={styles.previewTitle}>{preview?.originalName}</Text>
              <TouchableOpacity onPress={() => setPreview(null)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.previewBody}>
              <Text style={styles.previewBadge}>In-app preview shell</Text>
              <Text style={styles.previewDescription}>
                {preview?.mimeType} · Level {preview?.classLevel ?? "1"} ·{" "}
                {formatSize(preview?.size ?? 0)}
              </Text>
              <Text style={styles.previewNote}>
                Full inline rendering for PDFs, images, audio, and video will be wired
                with the backend media service. For now this opens the file URL or
                cached local file.
              </Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.openButton} onPress={() => preview && openDocument(preview)}>
                <Text style={styles.openText}>Open file</Text>
              </TouchableOpacity>
              {preview?.localUri && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteLocalDocument(preview)}
                >
                  <Text style={styles.deleteText}>Delete local</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingTop: 52,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  back: {
    color: COLORS.primary,
    fontWeight: "900",
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  search: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    padding: 12,
  },
  filterRow: {
    marginTop: 10,
    maxHeight: 40,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activeChip: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  uploadPanel: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  levelSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  levelButton: {
    alignItems: "center",
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  activeLevelButton: {
    backgroundColor: COLORS.secondary,
  },
  levelText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  uploadButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.65,
  },
  uploadText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  loader: {
    marginTop: 28,
  },
  list: {
    gap: 12,
    paddingBottom: 28,
    paddingTop: 14,
  },
  empty: {
    color: COLORS.muted,
    marginTop: 24,
    textAlign: "center",
  },
  docCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  docIcon: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  docIconText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  docMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  docUploader: {
    color: COLORS.faint,
    fontSize: 12,
    marginTop: 3,
  },
  previewText: {
    color: COLORS.primary,
    fontWeight: "900",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.72)",
    flex: 1,
    justifyContent: "flex-end",
  },
  previewCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
  },
  previewTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  previewTitle: {
    color: COLORS.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
  },
  closeText: {
    color: COLORS.danger,
    fontWeight: "900",
  },
  previewBody: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    minHeight: 190,
    padding: 16,
  },
  previewBadge: {
    color: COLORS.primary,
    fontWeight: "900",
  },
  previewDescription: {
    color: COLORS.text,
    fontWeight: "800",
    marginTop: 12,
  },
  previewNote: {
    color: COLORS.muted,
    lineHeight: 20,
    marginTop: 12,
  },
  previewActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  openButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    flex: 1,
    padding: 14,
  },
  openText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  deleteButton: {
    alignItems: "center",
    borderColor: COLORS.danger,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  deleteText: {
    color: COLORS.danger,
    fontWeight: "900",
  },
});
