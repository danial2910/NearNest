import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import ImageViewing from "react-native-image-viewing";
import { useUserStore } from "../../../../store/userStore";
import { Property } from "../../../../types";
import { useSupabase } from "../../../../hooks/useSupabase";
import { supabase } from "../../../../lib/supabase";
import { useSavedProperty } from "../../../../hooks/useSavedProperty";
import { formatPrice } from "../../../../lib/utils";
import { colors, shadows } from "../../../../lib/theme";
import { SUPPORT_PHONE_DISPLAY, whatsappUrl } from "../../../../lib/contact";

const GALLERY_HEIGHT = 320;
const DESCRIPTION_PREVIEW = 150;
const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

type LoadState = "loading" | "ready" | "not-found" | "error";

export default function PropertyDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const authSupabase = useSupabase();

  const [property, setProperty] = useState<Property | null>(null);
  const [status, setStatus] = useState<LoadState>("loading");
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  const { isSaved, saveLoading, saveError, toggleSave } = useSavedProperty(id ?? "");

  const fetchProperty = useCallback(async () => {
    if (!id) {
      setStatus("not-found");
      return;
    }

    setStatus("loading");
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setStatus("error");
    } else if (!data) {
      setStatus("not-found");
    } else {
      setProperty(data);
      setStatus("ready");
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(root)/(tabs)");
  };

  if (status !== "ready" || !property) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <View className="px-4 pt-2">
          <RoundButton icon="arrow-back" label="Go back" onPress={goBack} />
        </View>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          {status === "loading" ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name={status === "error" ? "cloud-offline-outline" : "home-outline"}
                size={48}
                color={colors.emptyIcon}
              />
              <Text className="font-rubik-semibold text-center text-base text-neutral-800">
                {status === "error"
                  ? "We could not load this property."
                  : "This property is no longer listed."}
              </Text>
              {status === "error" && (
                <Pressable
                  accessibilityRole="button"
                  onPress={fetchProperty}
                  className="mt-1 h-11 justify-center rounded-xl bg-primary px-5 active:opacity-80"
                >
                  <Text className="font-rubik-semibold text-white">Try again</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>
    );
  }

  const images = property.images ?? [];
  const description = property.description ?? "";
  const isLongDesc = description.length > DESCRIPTION_PREVIEW;
  const displayDesc =
    expanded || !isLongDesc
      ? description
      : `${description.slice(0, DESCRIPTION_PREVIEW).trimEnd()}…`;
  const hasLocation =
    Number.isFinite(property.latitude) && Number.isFinite(property.longitude);
  const fullAddress = [property.address, property.city].filter(Boolean).join(", ");

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
    property.longitude - 0.003
  }%2C${property.latitude - 0.003}%2C${property.longitude + 0.003}%2C${
    property.latitude + 0.003
  }&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`;

  const handleContact = async () => {
    const message = `Hello there! I am interested in this property: ${property.title}`;
    const url = whatsappUrl(message);
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Could not open WhatsApp", `You can reach the agent at ${SUPPORT_PHONE_DISPLAY}.`);
    }
  };

  const runAdminAction = async (action: () => PromiseLike<{ error: unknown }>, onDone: () => void) => {
    setAdminBusy(true);
    const { error } = await action();
    setAdminBusy(false);
    if (error) {
      Alert.alert("Something went wrong", "The change was not saved. Please try again.");
    } else {
      onDone();
    }
  };

  const handleMarkSold = () => {
    Alert.alert("Mark as sold?", "Buyers will see this listing as sold.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Sold",
        onPress: () =>
          runAdminAction(
            () => authSupabase.from("properties").update({ is_sold: true }).eq("id", property.id),
            () => setProperty((prev) => (prev ? { ...prev, is_sold: true } : prev)),
          ),
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete this property?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          runAdminAction(
            () => authSupabase.from("properties").delete().eq("id", property.id),
            () => router.replace("/(root)/(tabs)"),
          ),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Gallery */}
        <View style={{ height: GALLERY_HEIGHT }} className="bg-neutral-100">
          <FlatList
            data={images}
            keyExtractor={(uri, i) => `${i}-${uri}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onGalleryScroll}
            renderItem={({ item, index }) => (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel={`Photo ${index + 1} of ${images.length}, open full screen`}
                onPress={() => setImageViewerVisible(true)}
              >
                <Image
                  source={item}
                  placeholder={{ blurhash: BLURHASH }}
                  contentFit="cover"
                  transition={200}
                  style={{ width, height: GALLERY_HEIGHT }}
                />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={{ width, height: GALLERY_HEIGHT }} className="items-center justify-center">
                <Ionicons name="image-outline" size={40} color={colors.emptyIcon} />
              </View>
            }
          />

          {images.length > 1 && (
            <View
              className="absolute bottom-3 right-4 rounded-full bg-black/60 px-3 py-1"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Text className="font-rubik-medium text-xs text-white">
                {activeIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          {property.is_sold && (
            <View className="absolute bottom-3 left-4 rounded-full bg-red-500 px-3 py-1">
              <Text className="font-rubik-semibold text-xs text-white">Sold</Text>
            </View>
          )}

          {/* Floating back + save */}
          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-4"
            style={{ top: insets.top + 8 }}
          >
            <RoundButton icon="arrow-back" label="Go back" onPress={goBack} />
            <RoundButton
              icon={isSaved ? "heart" : "heart-outline"}
              iconColor={isSaved ? colors.danger : colors.text}
              label={isSaved ? "Remove from saved" : "Save property"}
              selected={isSaved}
              disabled={saveLoading}
              onPress={toggleSave}
            />
          </View>
        </View>

        <View className="px-5 pt-5">
          {saveError && (
            <Text accessibilityRole="alert" className="mb-3 text-sm text-red-600">
              {saveError}
            </Text>
          )}

          {/* Badges */}
          <View className="mb-3 flex-row flex-wrap gap-2">
            <Badge className="bg-primary/10" textClassName="text-primary capitalize" label={property.type} />
            {property.is_featured && (
              <Badge className="bg-amber-50" textClassName="text-amber-700" label="Featured" />
            )}
          </View>

          <Text accessibilityRole="header" className="font-rubik-bold mb-1 text-2xl text-neutral-900">
            {property.title}
          </Text>
          <Text className="font-rubik-bold mb-5 text-xl text-primary">
            {formatPrice(property.price)}
          </Text>

          {/* Specs */}
          <View className="mb-6 flex-row rounded-2xl border border-neutral-100 bg-neutral-50 py-4">
            <SpecItem icon="bed-outline" label="Beds" value={property.bedrooms} />
            <View className="w-px bg-neutral-200" />
            <SpecItem icon="water-outline" label="Baths" value={property.bathrooms} />
            <View className="w-px bg-neutral-200" />
            <SpecItem
              icon="expand-outline"
              label="Area"
              value={property.area_sqft != null ? `${property.area_sqft.toLocaleString()} ft²` : "—"}
            />
          </View>

          {description.length > 0 && (
            <>
              <Text accessibilityRole="header" className="font-rubik-bold mb-2 text-base text-neutral-900">
                Description
              </Text>
              <Text className="text-sm leading-6 text-neutral-600">{displayDesc}</Text>
              {isLongDesc && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setExpanded((v) => !v)}
                  className="min-h-11 justify-center self-start active:opacity-60"
                >
                  <Text className="font-rubik-semibold text-sm text-primary">
                    {expanded ? "Show less" : "Read more"}
                  </Text>
                </Pressable>
              )}
              <View className="h-4" />
            </>
          )}

          <Text accessibilityRole="header" className="font-rubik-bold mb-2 text-base text-neutral-900">
            Location
          </Text>
          <View className="mb-4 flex-row items-center gap-2">
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.icon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text className="flex-1 text-sm text-neutral-600">{fullAddress}</Text>
          </View>

          {hasLocation && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open full map"
              onPress={() =>
                router.push({
                  pathname: "/(root)/property/map",
                  params: {
                    latitude: property.latitude,
                    longitude: property.longitude,
                    title: property.title,
                    address: fullAddress,
                  },
                })
              }
              className="mb-6 overflow-hidden rounded-2xl active:opacity-90"
              style={{ height: 200 }}
            >
              {/* The WebView is non-interactive; the Pressable owns the tap. */}
              <View pointerEvents="none" style={{ flex: 1 }}>
                <WebView source={{ uri: mapUrl }} style={{ flex: 1 }} scrollEnabled={false} />
              </View>
              <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-full bg-white/90 px-3 py-1">
                <Ionicons name="expand-outline" size={12} color={colors.textMuted} />
                <Text className="font-rubik-medium text-xs text-neutral-700">Tap to expand</Text>
              </View>
            </Pressable>
          )}

          {!property.is_sold && (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens WhatsApp"
              onPress={handleContact}
              className="mb-4 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-90"
              style={shadows.primaryButton}
            >
              <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
              <Text className="font-rubik-bold text-base text-white">Contact Agent</Text>
            </Pressable>
          )}

          {isAdmin && (
            <View className="flex-row gap-3">
              {!property.is_sold && (
                <Pressable
                  accessibilityRole="button"
                  disabled={adminBusy}
                  onPress={handleMarkSold}
                  className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 active:opacity-80"
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.warning} />
                  <Text className="font-rubik-semibold text-amber-700">Mark Sold</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={adminBusy}
                onPress={handleDelete}
                className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 active:opacity-80"
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text className="font-rubik-semibold text-red-600">Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <ImageViewing
        images={images.map((uri) => ({ uri }))}
        imageIndex={activeIndex}
        onRequestClose={() => setImageViewerVisible(false)}
        visible={imageViewerVisible}
      />
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  iconColor = colors.text,
  selected,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-70"
      style={shadows.card}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
    </Pressable>
  );
}

function Badge({
  label,
  className,
  textClassName,
}: {
  label: string;
  className: string;
  textClassName: string;
}) {
  return (
    <View className={`rounded-full px-3 py-1 ${className}`}>
      <Text className={`font-rubik-semibold text-xs ${textClassName}`}>{label}</Text>
    </View>
  );
}

function SpecItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View
      className="flex-1 items-center gap-1"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text className="font-rubik-bold text-sm text-neutral-900">{value}</Text>
      <Text className="text-xs text-neutral-500">{label}</Text>
    </View>
  );
}
