import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../../../lib/theme";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  whatsappUrl,
} from "../../../lib/contact";

export default function SupportScreen() {
  const router = useRouter();

  const open = async (url: string, fallback: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Could not open that app", fallback);
    }
  };

  const phoneFallback = `You can still reach us at ${SUPPORT_PHONE_DISPLAY}.`;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center gap-3 px-5 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900" accessibilityRole="header">
          Help & Support
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-base text-gray-500 leading-6 mb-6">
          Questions about a listing, your account, or anything else? Pick whichever
          way is easiest and we will answer all three.
        </Text>

        <View className="bg-white rounded-2xl overflow-hidden" style={shadows.subtle}>
          <ContactRow
            icon="call-outline"
            label="Call us"
            value={SUPPORT_PHONE_DISPLAY}
            accessibilityLabel={`Call us at ${SUPPORT_PHONE_DISPLAY}`}
            onPress={() => open(`tel:${SUPPORT_PHONE_TEL}`, phoneFallback)}
          />
          <Divider />
          <ContactRow
            icon="logo-whatsapp"
            label="WhatsApp"
            value={SUPPORT_PHONE_DISPLAY}
            accessibilityLabel={`Message us on WhatsApp at ${SUPPORT_PHONE_DISPLAY}`}
            onPress={() =>
              open(whatsappUrl("Hello! I have a question about NearNest."), phoneFallback)
            }
          />
          <Divider />
          <ContactRow
            icon="mail-outline"
            label="Email us"
            value={SUPPORT_EMAIL}
            accessibilityLabel={`Email us at ${SUPPORT_EMAIL}`}
            onPress={() =>
              open(
                `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("NearNest support")}`,
                `You can still email us at ${SUPPORT_EMAIL}.`,
              )
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Divider() {
  return <View className="h-px bg-gray-100 ml-16" />;
}

function ContactRow({
  icon,
  label,
  value,
  accessibilityLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center gap-4 px-4 py-4"
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View className="flex-1">
        <Text className="text-gray-900 font-medium text-base">{label}</Text>
        <Text className="text-gray-500 text-sm mt-0.5">{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.iconSubtle} />
    </TouchableOpacity>
  );
}
