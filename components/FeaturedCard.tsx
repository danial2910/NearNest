import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Property } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { formatPrice } from "../lib/utils";

const BLURHASH = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

export default function FeaturedCard({
  property,
  onPress,
}: {
  property: Property;
  onPress?: (property: Property) => void;
}) {
  const label = [
    property.title,
    property.type,
    formatPrice(property.price),
    `${property.bedrooms} bedrooms`,
    `${property.bathrooms} bathrooms`,
    `${property.address}, ${property.city}`,
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
      className="mr-4 w-64 overflow-hidden rounded-2xl bg-white active:opacity-90"
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
          style={{ width: "100%", height: 160 }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <View className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1">
          <Text className="font-rubik-semibold text-xs capitalize text-primary">
            {property.type}
          </Text>
        </View>

        {!property.is_sold && (
          <View className="absolute right-3 top-3 rounded-full bg-red-500 px-3 py-1">
            <Text className="font-rubik-semibold text-xs text-white">Sold</Text>
          </View>
        )}
      </View>

      <View className="gap-1 p-4">
        <Text
          numberOfLines={1}
          className="font-rubik-semibold text-base text-neutral-900"
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
            {property.address}, {property.city}
          </Text>
        </View>

        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-rubik-bold text-base text-primary">
            {formatPrice(property.price)}
          </Text>

          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons
                name="bed-outline"
                size={14}
                color="#9CA3AF"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text className="text-sm text-neutral-500">{property.bedrooms}</Text>
            </View>

            <View className="flex-row items-center gap-1">
              <Ionicons
                name="water-outline"
                size={14}
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
