import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Property } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "../lib/utils";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export default function PropertyCard({
  property,
  onPress,
  onToggleSave,
  isSaved = true,
  showSave = true,
}: {
  property: Property;
  // TODO: wire to the property detail route once that screen exists.
  onPress?: (property: Property) => void;
  onToggleSave?: (property: Property) => void;
  isSaved?: boolean;
  showSave?: boolean;
}) {
  const label = [
    property.title,
    formatPrice(property.price),
    `${property.bedrooms} bedrooms`,
    `${property.bathrooms} bathrooms`,
    property.city,
    property.is_sold ? "Sold" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={() => onPress?.(property)}
      className="mb-4 overflow-hidden rounded-2xl bg-white active:opacity-90"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
      }}
    >
      <View className="relative">
        <Image
          source={property.images?.[0]}
          placeholder={{ blurhash: BLURHASH }}
          contentFit="cover"
          transition={200}
          style={{ width: "100%", height: 200 }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        {property.is_sold && (
          <View className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1">
            <Text className="font-rubik-semibold text-xs text-white">Sold</Text>
          </View>
        )}

        {showSave && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={isSaved ? "Remove from saved" : "Save property"}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => onToggleSave?.(property)}
            className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-white/90 active:opacity-70"
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={20}
              color={isSaved ? "#EF4444" : "#6B7280"}
            />
          </Pressable>
        )}
      </View>

      <View className="gap-1 p-4">
        <Text
          numberOfLines={1}
          className="font-rubik-semibold text-lg text-neutral-900"
        >
          {property.title}
        </Text>

        <View className="flex-row items-center gap-1">
          <Ionicons
            name="location-outline"
            size={14}
            color="#9CA3AF"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text numberOfLines={1} className="flex-1 text-sm text-neutral-500">
            {property.city}
          </Text>
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-rubik-bold text-lg text-primary">
            {formatPrice(property.price)}
          </Text>

          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1">
              <Ionicons
                name="bed-outline"
                size={16}
                color="#9CA3AF"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text className="text-sm text-neutral-500">{property.bedrooms}</Text>
            </View>

            <View className="flex-row items-center gap-1">
              <Ionicons
                name="water-outline"
                size={16}
                color="#9CA3AF"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text className="text-sm text-neutral-500">{property.bathrooms}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
