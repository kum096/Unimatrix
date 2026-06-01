import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
} from "react-native";

import { useEffect,useState } from "react";

import { socket } from "../services/socket";

export default function ChatScreen() {

  const [message,setMessage] = useState("");
  const [messages,setMessages] = useState<any[]>([]);

  useEffect(() => {

    socket.connect();

    socket.on(
      "new_message",
      (msg) => {
        setMessages(prev => [...prev,msg]);
      }
    );

    return () => {
      socket.off("new_message");
    };

  },[]);

  const send = () => {

    socket.emit(
      "send_message",
      {
        from:"User",
        message,
      }
    );

    setMessage("");
  };

  return (
    <View style={{flex:1,padding:20}}>

      <FlatList
        data={messages}
        renderItem={({item}) => (
          <Text>
            {item.from}: {item.message}
          </Text>
        )}
      />

      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Message..."
      />

      <TouchableOpacity onPress={send}>
        <Text>Send</Text>
      </TouchableOpacity>

    </View>
  );
}