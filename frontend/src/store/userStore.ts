import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SERVER_URL, setApiBaseUrl } from "../services/api";
import { User } from "../types/app";

const userKey = "user";
const serverUrlKey = "serverUrl";

export async function saveUser(user: User): Promise<void> {
  await AsyncStorage.setItem(userKey, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const user = await AsyncStorage.getItem(userKey);
  return user ? (JSON.parse(user) as User) : null;
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(userKey);
}

export async function saveServerUrl(url: string): Promise<void> {
  const normalizedUrl = setApiBaseUrl(url);
  await AsyncStorage.setItem(serverUrlKey, normalizedUrl);
}

export async function loadServerUrl(): Promise<string> {
  const storedUrl = await AsyncStorage.getItem(serverUrlKey);
  const url = storedUrl ?? DEFAULT_SERVER_URL;
  return setApiBaseUrl(url);
}
