import {
  View,
  Text,
  Button,
  FlatList,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";

import { useEffect,useState } from "react";

import { api } from "../services/api";

export default function DocumentsScreen() {

  const [docs,setDocs] = useState<any[]>([]);

  const loadDocs = async () => {
    const res = await api.get("/documents");
    setDocs(res.data);
  };

  useEffect(() => {
    loadDocs();
  },[]);

  const upload = async () => {

    const result =
      await DocumentPicker.getDocumentAsync({
        type:"application/pdf",
      });

    if(result.canceled) return;

    const file = result.assets[0];

    const form = new FormData();

    form.append(
      "file",
      {
        uri:file.uri,
        name:file.name,
        type:"application/pdf",
      } as any
    );

    await api.post(
      "/documents/upload",
      form,
      {
        headers:{
          "Content-Type":"multipart/form-data",
        },
      }
    );

    loadDocs();
  };

  return (
    <View style={{flex:1,padding:20}}>

      <Button
        title="Upload PDF"
        onPress={upload}
      />

      <FlatList
        data={docs}
        keyExtractor={(item)=>item.filename}
        renderItem={({item})=>(
          <Text>
            {item.originalName}
          </Text>
        )}
      />

    </View>
  );
}