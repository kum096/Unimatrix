import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getSocket } from "../services/socket";
import { getUser } from "../store/userStore";
import { COLORS } from "../theme/colors";
import { Message, RootStackParamList, User } from "../types/app";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ navigation }: Props) {
  const socket = useMemo(() => getSocket(), []);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(socket.connected);

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
        roomId: "general",
      });
    });

    const addMessage = (msg: Message) => {
      setMessages((currentMessages) => [...currentMessages, msg]);
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
  }, [navigation, socket]);

  const send = () => {
    const cleanMessage = message.trim();
    const cleanRecipient = recipient.trim();

    if (!user || !cleanMessage) {
      return;
    }

    socket.emit("send_message", {
      from: user.name,
      roomId: "general",
      message: cleanMessage,
      ...(cleanRecipient ? { to: cleanRecipient } : {}),
    });

    setMessage("");
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
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={connected ? styles.online : styles.offline}>
            {connected ? "Connected" : "Disconnected"}
          </Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No messages yet. Send one from this phone.</Text>
        }
        renderItem={({ item }) => {
          const mine = item.from === user?.name;

          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.meta}>
                {item.roomType === "direct" ? "Private" : "General"} · {item.from}
              </Text>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          autoCapitalize="words"
          placeholder="Private to, optional"
          placeholderTextColor={COLORS.muted}
          style={styles.recipientInput}
          value={recipient}
          onChangeText={setRecipient}
        />
        <View style={styles.row}>
          <TextInput
            multiline
            placeholder="Message"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
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
  online: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: "700",
  },
  offline: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    flexGrow: 1,
    gap: 10,
    paddingBottom: 16,
  },
  empty: {
    color: COLORS.muted,
    marginTop: 24,
    textAlign: "center",
  },
  bubble: {
    borderRadius: 10,
    maxWidth: "86%",
    padding: 12,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },
  message: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
  },
  composer: {
    gap: 10,
  },
  recipientInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    padding: 12,
  },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    flex: 1,
    maxHeight: 110,
    minHeight: 50,
    padding: 12,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  sendText: {
    color: COLORS.text,
    fontWeight: "800",
  },
});
