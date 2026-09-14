import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../../../../lib/theme";

export default function ProfileScreen() {

  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);


  const handleSignOut = () => {
    Alert.alert("Sign out", "You will need to sign in again to view your saved properties.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/sign-in");
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Could not sign out", "Please check your connection and try again.");
          }
        },
      },
    ]);
  };

  if (!isLoaded || !user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  const handleUpdatingProfile = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to update your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      setIsUpdating(true);

      const base64Image = result.assets[0].base64;
      const uri = result.assets[0].uri;
      const filename = uri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      await user?.setProfileImage({ file: dataUrl });

    } catch (error) {
      console.error("Error updating profile image:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900" accessibilityRole="header">
          Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-6">
          <View className="relative">
            <Image
              source={user.imageUrl}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={user.id}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                marginBottom: 16,
                backgroundColor: "#E5E7EB",
              }}
            />
            <TouchableOpacity
              className="absolute bottom-3 right-0 rounded-full p-2"
              style={{ backgroundColor: colors.primary, ...shadows.control }}
              disabled={isUpdating}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              accessibilityState={{ disabled: isUpdating, busy: isUpdating }}
              onPress={handleUpdatingProfile}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-xl font-bold text-gray-900">
            {user.firstName} {user.lastName}
          </Text>
          <Text className="text-gray-500 mt-1">
            {user.emailAddresses[0].emailAddress}
          </Text>
        </View>

        <View className="bg-white rounded-2xl overflow-hidden" style={shadows.subtle}>
          <MenuItem
            icon="heart-outline"
            label="Saved Properties"
            onPress={() => router.push("/(root)/(tabs)/saved")}
          />
          <Divider />
          <MenuItem
            icon="help-circle-outline"
            label="Help and Support"
            onPress={() => router.push("/(root)/support")}
          />
          <Divider />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            hint="Coming soon"
            onPress={() =>
              Alert.alert("Coming soon", "Notifications are on the way we'll let you know.")
            }
          />
          <Divider />
          <MenuItem
            icon="settings-outline"
            label="Settings"
            hint="Coming soon"
            onPress={() =>
              Alert.alert("Coming soon", "Settings are on the way we'll let you know.")
            }
          />
        </View>

        <View className="bg-white rounded-2xl overflow-hidden mt-4" style={shadows.subtle}>
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            destructive
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 ml-16" />;
}

function MenuItem ({
  icon,
  label,
  hint,
  destructive,
  onPress,
} : {
  icon:keyof typeof Ionicons.glyphMap;
  label:string;
  hint?: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  const tint = destructive ? colors.danger : colors.icon;
  return(
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      className="flex-row items-center gap-4 px-4 py-4"
    >
      <Ionicons name={icon} size={22} color={tint} />
      <Text
        className="flex-1 font-medium text-base"
        style={{ color: destructive ? colors.danger : colors.textMuted }}
      >
        {label}
      </Text>
      {hint ? <Text className="text-gray-400 text-sm">{hint}</Text> : null}
      {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.iconSubtle} />}
    </TouchableOpacity>
  )
}
