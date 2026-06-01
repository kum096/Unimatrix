import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { useState } from "react";

import { api } from "../services/api";
import { saveUser } from "../store/userStore";
import { COLORS } from "../theme/colors";

export default function LoginScreen({navigation}:any) {

  const [name,setName] = useState("");
  const [studentId,setStudentId] = useState("");

  const login = async () => {

    const res = await api.post(
      "/auth/login",
      {
        name,
        studentId,
      }
    );

    await saveUser(res.data.user);

    navigation.replace("Home");
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>
        UniMatrix
      </Text>

      <TextInput
        placeholder="Name"
        placeholderTextColor="#888"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Student ID"
        placeholderTextColor="#888"
        style={styles.input}
        value={studentId}
        onChangeText={setStudentId}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={login}
      >
        <Text style={styles.buttonText}>
          Continue
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:COLORS.background,
    justifyContent:"center",
    padding:24,
  },

  title:{
    color:"white",
    fontSize:34,
    fontWeight:"700",
    marginBottom:40,
  },

  input:{
    backgroundColor:COLORS.surface,
    color:"white",
    padding:16,
    borderRadius:12,
    marginBottom:15,
  },

  button:{
    backgroundColor:COLORS.primary,
    padding:16,
    borderRadius:12,
  },

  buttonText:{
    color:"white",
    textAlign:"center",
    fontWeight:"700",
  },
});