import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Property } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "../lib/utils";
import { colors, shadows } from "../lib/theme";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export default function PropertyCard({
  property,
  onPress,
  onToggleSave,
  isSaved = false,
  // Off by default: a heart with no handler is a dead control.
  showSave = false,
}: {
  property: Property;
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

  const canSave = showSave && !!onToggleSave;

  return (
    // The save button is a sibling of the card button, never nested inside it,
    // so screen readers can reach both.
    <View className="mb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={onPress ? "Opens property details" : undefined}
        disabled={!onPress}
        onPress={() => onPress?.(property)}
        className="overflow-hidden rounded-2xl bg-white active:opacity-90"
        style={shadows.card}
      >
        <View>
          <Image
            source={property.images?.[0]}
            placeholder={{ blurhash: BLURHASH }}
            contentFit="cover"
            transition={200}
            recyclingKey={property.id}
            cachePolicy="memory-disk"
            style={{ width: "100%", height: 200 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />

          {property.is_sold && (
            <View className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1">
              <Text className="font-rubik-semibold text-xs text-white">Sold</Text>
            </View>
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
              color={colors.iconSubtle}
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
                  color={colors.iconSubtle}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text className="text-sm text-neutral-500">{property.bedrooms}</Text>
              </View>

              <View className="flex-row items-center gap-1">
                <Ionicons
                  name="water-outline"
                  size={16}
                  color={colors.iconSubtle}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text className="text-sm text-neutral-500">{property.bathrooms}</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>

      {canSave && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isSaved }}
          accessibilityLabel={
            isSaved ? `Remove ${property.title} from saved` : `Save ${property.title}`
          }
          onPress={() => onToggleSave?.(property)}
          className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-white/90 active:opacity-70"
        >
          <Ionicons
            name={isSaved ? "heart" : "heart-outline"}
            size={20}
            color={isSaved ? colors.danger : colors.icon}
          />
        </Pressable>
      )}
    </View>
  );
}
