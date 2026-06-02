import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getSocket } from "../services/socket";
import { getUser } from "../store/userStore";
import { COLORS } from "../theme/colors";
import {
  AttachmentType,
  ChatAttachment,
  ChatThread,
  Message,
  MessageReaction,
  RootStackParamList,
  User,
  UserProfile,
} from "../types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

const chatStoreKey = "localChatMessages";
const threadStoreKey = "localChatThreads";
const emojiChoices = ["👍", "❤️", "😂", "😮", "🙏"];

const demoProfiles: UserProfile[] = [
  {
    id: "B001",
    name: "Brian",
    bio: "Class rep. Shares notes fast.",
    presence: "online",
    lastSeen: "now",
  },
  {
    id: "C002",
    name: "Chiamaka",
    bio: "Level 3 mathematics.",
    presence: "away",
    lastSeen: "8 min ago",
  },
  {
    id: "D004",
    name: "Daniel",
    bio: "Project group coordinator.",
    presence: "offline",
    lastSeen: "1 hour ago",
  },
];

const defaultThreads: ChatThread[] = [
  {
    id: "general",
    type: "group",
    title: "General Class",
    subtitle: "Announcements, notes, questions",
    members: ["Alice", "Brian", "Chiamaka"],
    unread: 0,
    pinned: true,
  },
  {
    id: "community-level-3",
    type: "group",
    title: "Level 3 Community",
    subtitle: "Courses, timetable, shared files",
    members: ["Alice", "Brian", "Daniel"],
    unread: 2,
  },
  {
    id: "direct:B001",
    type: "direct",
    title: "Brian",
    subtitle: "Online",
    members: ["Brian"],
    presence: "online",
    unread: 0,
  },
];

function now(): number {
  return Date.now();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function statusText(status?: Message["status"]): string {
  if (status === "read") return "Read";
  if (status === "delivered") return "Delivered";
  if (status === "sent") return "Sent";
  return "Sending";
}

function inferAttachmentType(mimeType?: string): AttachmentType {
  if (!mimeType) return "document";
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export default function ChatScreen({ navigation }: Props) {
  const socket = useMemo(() => getSocket(), []);
  const listRef = useRef<FlatList<Message>>(null);
  const [user, setUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>(defaultThreads);
  const [activeThreadId, setActiveThreadId] = useState(defaultThreads[0].id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState("");

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0];
  const filteredThreads = threads.filter((thread) =>
    `${thread.title} ${thread.subtitle}`.toLowerCase().includes(search.toLowerCase()),
  );
  const threadMessages = messages.filter((item) => item.roomId === activeThread.id);
  const suggestedUsers = demoProfiles.filter((item) =>
    `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    getUser().then((storedUser) => {
      if (!storedUser) {
        navigation.replace("Login");
        return;
      }

      setUser(storedUser);
      socket.connect();
      socket.emit("join_room", {
        username: storedUser.name,
        roomId: activeThreadId,
      });
    });
  }, [activeThreadId, navigation, socket]);

  useEffect(() => {
    AsyncStorage.getItem(threadStoreKey)
      .then((value) => {
        if (value) setThreads(JSON.parse(value) as ChatThread[]);
      })
      .catch(() => undefined);
    AsyncStorage.getItem(chatStoreKey)
      .then((value) => {
        if (value) setMessages(JSON.parse(value) as Message[]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(threadStoreKey, JSON.stringify(threads)).catch(() => undefined);
  }, [threads]);

  useEffect(() => {
    AsyncStorage.setItem(chatStoreKey, JSON.stringify(messages)).catch(() => undefined);
  }, [messages]);

  useEffect(() => {
    const addMessage = (incoming: Message) => {
      setMessages((current) => {
        if (current.some((item) => item.id === incoming.id)) return current;
        return [...current, { ...incoming, status: "delivered" }];
      });
    };

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("new_message", addMessage);
    socket.on("new_private_message", addMessage);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("new_message", addMessage);
      socket.off("new_private_message", addMessage);
    };
  }, [socket]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [threadMessages.length, activeThreadId]);

  const startDirectChat = (profileItem: UserProfile) => {
    const directId = `direct:${profileItem.id}`;

    setThreads((current) => {
      if (current.some((thread) => thread.id === directId)) return current;
      return [
        {
          id: directId,
          type: "direct",
          title: profileItem.name,
          subtitle: profileItem.bio,
          members: [profileItem.name],
          presence: profileItem.presence,
          unread: 0,
        },
        ...current,
      ];
    });

    setActiveThreadId(directId);
    setSearch("");
  };

  const createGroup = () => {
    const cleanName = groupName.trim();
    const members = groupMemberIds
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!cleanName) return;

    const id = `group:${makeId("community")}`;
    setThreads((current) => [
      {
        id,
        type: "group",
        title: cleanName,
        subtitle: `${members.length + 1} members`,
        members: [user?.name ?? "Me", ...members],
        unread: 0,
      },
      ...current,
    ]);
    setActiveThreadId(id);
    setGroupName("");
    setGroupMemberIds("");
    setGroupModalVisible(false);
  };

  const exitGroup = () => {
    if (activeThread.type !== "group" || activeThread.id === "general") return;
    setThreads((current) => current.filter((thread) => thread.id !== activeThread.id));
    setActiveThreadId("general");
  };

  const appendLocalMessage = (item: Message) => {
    setMessages((current) => [...current, item]);
  };

  const send = () => {
    const cleanMessage = message.trim();
    if (!user || (!cleanMessage && !editing)) return;

    if (editing) {
      setMessages((current) =>
        current.map((item) =>
          item.id === editing.id
            ? { ...item, message: cleanMessage || item.message, edited: true }
            : item,
        ),
      );
      setEditing(null);
      setMessage("");
      return;
    }

    const localMessage: Message = {
      id: makeId("msg"),
      roomId: activeThread.id,
      roomType: activeThread.type,
      from: user.name,
      to: activeThread.type === "direct" ? activeThread.title : undefined,
      message: cleanMessage,
      timestamp: now(),
      status: "read",
      replyToId: replyTo?.id,
    };

    appendLocalMessage(localMessage);
    socket.emit("send_message", {
      from: user.name,
      roomId: activeThread.id,
      message: cleanMessage,
      ...(activeThread.type === "direct" ? { to: activeThread.title } : {}),
    });
    setMessage("");
    setReplyTo(null);
  };

  const addAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !user) return;

    const file = result.assets[0];
    const attachment: ChatAttachment = {
      id: makeId("att"),
      type: inferAttachmentType(file.mimeType),
      name: file.name,
      uri: file.uri,
      size: file.size,
    };

    appendLocalMessage({
      id: makeId("msg"),
      roomId: activeThread.id,
      roomType: activeThread.type,
      from: user.name,
      to: activeThread.type === "direct" ? activeThread.title : undefined,
      message: attachment.type === "photo" ? "Photo" : attachment.name,
      timestamp: now(),
      status: "read",
      attachments: [attachment],
    });
  };

  const sendVoiceNote = () => {
    if (!user) return;
    appendLocalMessage({
      id: makeId("msg"),
      roomId: activeThread.id,
      roomType: activeThread.type,
      from: user.name,
      to: activeThread.type === "direct" ? activeThread.title : undefined,
      message: "Voice note · 0:14",
      timestamp: now(),
      status: "read",
      attachments: [
        {
          id: makeId("voice"),
          type: "voice",
          name: "Voice note",
        },
      ],
    });
  };

  const reactToMessage = (item: Message, emoji: string) => {
    if (!user) return;
    const reaction: MessageReaction = { emoji, by: user.name };
    setMessages((current) =>
      current.map((messageItem) =>
        messageItem.id === item.id
          ? {
              ...messageItem,
              reactions: [...(messageItem.reactions ?? []), reaction],
            }
          : messageItem,
      ),
    );
  };

  const deleteMessage = (item: Message) => {
    setMessages((current) =>
      current.map((messageItem) =>
        messageItem.id === item.id
          ? { ...messageItem, deleted: true, message: "This message was deleted" }
          : messageItem,
      ),
    );
  };

  const forwardMessage = (item: Message) => {
    if (!user) return;
    appendLocalMessage({
      ...item,
      id: makeId("fwd"),
      from: user.name,
      roomId: activeThread.id,
      timestamp: now(),
      forwarded: true,
    });
  };

  const openMessageActions = (item: Message) => {
    Alert.alert("Message actions", item.deleted ? "Deleted message" : item.message, [
      { text: "Reply", onPress: () => setReplyTo(item) },
      { text: "Forward", onPress: () => forwardMessage(item) },
      { text: "Copy", onPress: () => Alert.alert("Copied", item.message) },
      { text: "Edit", onPress: () => { setEditing(item); setMessage(item.message); } },
      { text: "Delete", style: "destructive", onPress: () => deleteMessage(item) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderThread = ({ item }: { item: ChatThread }) => (
    <TouchableOpacity
      style={[styles.threadCard, item.id === activeThread.id && styles.activeThread]}
      onPress={() => setActiveThreadId(item.id)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.title.slice(0, 1).toUpperCase()}</Text>
        {item.presence === "online" && <View style={styles.presenceDot} />}
      </View>
      <View style={styles.threadInfo}>
        <Text numberOfLines={1} style={styles.threadTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.threadSubtitle}>
          {item.subtitle}
        </Text>
      </View>
      {item.unread > 0 && (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.from === user?.name;
    const reply = item.replyToId
      ? messages.find((messageItem) => messageItem.id === item.replyToId)
      : null;

    return (
      <Pressable
        onLongPress={() => openMessageActions(item)}
        style={[styles.bubble, mine ? styles.mine : styles.theirs]}
      >
        {item.forwarded && <Text style={styles.systemLabel}>Forwarded</Text>}
        {reply && (
          <View style={styles.replyBox}>
            <Text numberOfLines={1} style={styles.replyText}>
              Replying to {reply.from}: {reply.message}
            </Text>
          </View>
        )}
        <Text style={styles.meta}>
          {item.from} · {item.roomType === "direct" ? "Private" : activeThread.title}
        </Text>
        <Text style={[styles.messageText, item.deleted && styles.deleted]}>
          {item.message}
          {item.edited ? " (edited)" : ""}
        </Text>
        {item.attachments?.map((attachment) => (
          <View key={attachment.id} style={styles.attachmentChip}>
            <Text style={styles.attachmentText}>
              {attachment.type.toUpperCase()} · {attachment.name}
            </Text>
          </View>
        ))}
        <View style={styles.messageFooter}>
          <View style={styles.reactions}>
            {item.reactions?.map((reaction, index) => (
              <Text key={`${reaction.emoji}-${index}`} style={styles.reaction}>
                {reaction.emoji}
              </Text>
            ))}
          </View>
          {mine && <Text style={styles.status}>{statusText(item.status)}</Text>}
        </View>
        <View style={styles.quickReactions}>
          {emojiChoices.slice(0, 3).map((emoji) => (
            <TouchableOpacity key={emoji} onPress={() => reactToMessage(item, emoji)}>
              <Text style={styles.quickReaction}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{activeThread.title}</Text>
          <Text style={connected ? styles.online : styles.offline}>
            {activeThread.type === "group"
              ? `${activeThread.members.length} members`
              : connected
                ? "online"
                : "offline"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setProfile(demoProfiles[0])}>
          <Text style={styles.headerAction}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.layout}>
        <View style={styles.sidebar}>
          <TextInput
            placeholder="Search name or ID"
            placeholderTextColor={COLORS.muted}
            style={styles.search}
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.sidebarActions}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => setGroupModalVisible(true)}
            >
              <Text style={styles.smallButtonText}>Create group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={exitGroup}>
              <Text style={styles.smallButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredThreads}
            keyExtractor={(item) => item.id}
            renderItem={renderThread}
            ListFooterComponent={
              search ? (
                <View style={styles.peopleBlock}>
                  <Text style={styles.sectionLabel}>Start chat by ID</Text>
                  {suggestedUsers.map((profileItem) => (
                    <TouchableOpacity
                      key={profileItem.id}
                      style={styles.personRow}
                      onPress={() => startDirectChat(profileItem)}
                    >
                      <Text style={styles.personName}>{profileItem.name}</Text>
                      <Text style={styles.personId}>{profileItem.id}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null
            }
          />
        </View>

        <View style={styles.chatPane}>
          <FlatList
            ref={listRef}
            data={threadMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <Text style={styles.empty}>No messages here yet. Say hello.</Text>
            }
          />
          {(replyTo || editing) && (
            <View style={styles.contextBar}>
              <Text numberOfLines={1} style={styles.contextText}>
                {editing ? "Editing" : `Replying to ${replyTo?.from}`}:{" "}
                {editing?.message ?? replyTo?.message}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setReplyTo(null);
                  setEditing(null);
                  setMessage("");
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.composer}>
            <TouchableOpacity style={styles.toolButton} onPress={addAttachment}>
              <Text style={styles.toolText}>+</Text>
            </TouchableOpacity>
            <TextInput
              multiline
              placeholder="Message, reply, edit, or share..."
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.toolButton} onPress={sendVoiceNote}>
              <Text style={styles.toolText}>Mic</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={send}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal transparent visible={groupModalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create community</Text>
            <TextInput
              placeholder="Group name"
              placeholderTextColor={COLORS.muted}
              style={styles.modalInput}
              value={groupName}
              onChangeText={setGroupName}
            />
            <TextInput
              placeholder="Member IDs, comma separated"
              placeholderTextColor={COLORS.muted}
              style={styles.modalInput}
              value={groupMemberIds}
              onChangeText={setGroupMemberIds}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={createGroup}>
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={!!profile} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setProfile(null)}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {profile?.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName}>{profile?.name}</Text>
            <Text style={styles.profileBio}>{profile?.bio}</Text>
            <Text style={styles.profileMeta}>
              ID {profile?.id} · {profile?.presence} · {profile?.lastSeen}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 48,
  },
  header: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  back: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
  },
  online: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  offline: {
    color: COLORS.faint,
    fontSize: 12,
    fontWeight: "700",
  },
  headerAction: {
    color: COLORS.secondary,
    fontWeight: "800",
  },
  layout: {
    flex: 1,
  },
  sidebar: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    maxHeight: 250,
    padding: 12,
  },
  search: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    padding: 12,
  },
  sidebarActions: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
  },
  smallButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  threadCard: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    padding: 10,
  },
  activeThread: {
    backgroundColor: COLORS.surfaceElevated,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  avatarText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  presenceDot: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.background,
    borderRadius: 5,
    borderWidth: 2,
    bottom: 1,
    height: 11,
    position: "absolute",
    right: 1,
    width: 11,
  },
  threadInfo: {
    flex: 1,
  },
  threadTitle: {
    color: COLORS.text,
    fontWeight: "800",
  },
  threadSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  unread: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    padding: 4,
  },
  unreadText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  peopleBlock: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 10,
  },
  sectionLabel: {
    color: COLORS.faint,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  personRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  personName: {
    color: COLORS.text,
    fontWeight: "700",
  },
  personId: {
    color: COLORS.muted,
  },
  chatPane: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    gap: 10,
    padding: 14,
  },
  empty: {
    color: COLORS.muted,
    marginTop: 28,
    textAlign: "center",
  },
  bubble: {
    borderRadius: 12,
    maxWidth: "88%",
    padding: 12,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.bubbleMine,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.bubbleTheirs,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  systemLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 4,
  },
  replyBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 3,
    borderRadius: 6,
    marginBottom: 8,
    padding: 8,
  },
  replyText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },
  messageText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
  },
  deleted: {
    color: COLORS.muted,
    fontStyle: "italic",
  },
  attachmentChip: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  attachmentText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  messageFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  reactions: {
    flexDirection: "row",
    gap: 4,
  },
  reaction: {
    fontSize: 14,
  },
  status: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  quickReactions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  quickReaction: {
    fontSize: 16,
  },
  contextBar: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  contextText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 12,
  },
  cancelText: {
    color: COLORS.danger,
    fontWeight: "800",
  },
  composer: {
    alignItems: "flex-end",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  toolButton: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  toolText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  input: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: COLORS.text,
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    padding: 12,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  sendText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    width: "100%",
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  modalInput: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    padding: 12,
  },
  modalActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  createText: {
    color: COLORS.text,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
    width: "100%",
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 42,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  profileAvatarText: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
  },
  profileName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 14,
  },
  profileBio: {
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
  },
  profileMeta: {
    color: COLORS.faint,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14,
  },
});
