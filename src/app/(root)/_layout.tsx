import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useUserSync } from "../../../hooks/useUserSync";

export default function RootGroupLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  useUserSync();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  // Property screens draw their own floating headers, so the native header
  // stays hidden; the Stack still provides edge-swipe / predictive back.
  return <Stack screenOptions={{ headerShown: false }} />;
}
