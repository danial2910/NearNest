import { useAuth } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

export default function ProfileScreen() {

  const {signOut} = useAuth();

  const router = useRouter();

  const handleSignOut = async () => {
    try{
    await signOut();
    router.replace("/sign-in");
    } catch (error) {
    console.error("Error signing out:", error);
  }
};

  return (
    <SafeAreaView className="flex-1 items-center justify-center">
      <Text>Profile</Text>
      <TouchableOpacity
        onPress={handleSignOut}
        className="w-full bg-primary rounded-xl py-4 items-center active:opacity-80 disabled:opacity-50"
      >
        <Text className="text-white text-lg font-semibold">Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
