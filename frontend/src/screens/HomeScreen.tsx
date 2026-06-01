import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { COLORS } from "../theme/colors";

export default function HomeScreen({navigation}:any) {

  return (
    <View style={styles.container}>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Chat")}
      >
        <Text style={styles.text}>
          💬 Chats
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Documents")}
      >
        <Text style={styles.text}>
          📚 Documents
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:COLORS.background,
    padding:20,
  },

  card:{
    backgroundColor:COLORS.surface,
    padding:30,
    borderRadius:20,
    marginBottom:20,
  },

  text:{
    color:"white",
    fontSize:18,
    fontWeight:"600",
  },
});