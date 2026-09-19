import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PropertyType, useFilterStore } from "../store/filterStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { colors, shadows } from "../lib/theme";

// Pasted values like "5,000" or "RM5000" would become NaN; keep digits only.
const digitsOnly = (text: string) => text.replace(/\D/g, "");

const TYPES: { label: string; value: PropertyType }[] = [
  { label: "All", value: null },
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Villa", value: "villa" },
  { label: "Studio", value: "studio" },
];

const BEDS = [
  { label: "Any", value: null },
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4+", value: 4 },
];

const PRICE_PRESETS = [
  { label: "Under RM5M", min: null, max: 5000000 },
  { label: "RM5M – RM10M", min: 5000000, max: 10000000 },
  { label: "RM10M – RM20M", min: 10000000, max: 20000000 },
  { label: "Above RM20M", min: 20000000, max: null },
];

const chip = (active: boolean) =>
  `px-4 py-2 rounded-full border ${
    active ? "bg-primary border-primary" : "bg-white border-neutral-200"
  }`;

const chipText = (active: boolean) =>
  `font-rubik-semibold text-sm ${active ? "text-white" : "text-neutral-600"}`;

const priceToText = (value: number | null) => (value != null ? String(value) : "");

export default function FilterModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    type,
    bedrooms,
    minPrice,
    maxPrice,
    setType,
    setBedrooms,
    setMinPrice,
    setMaxPrice,
  } = useFilterStore();

  const insets = useSafeAreaInsets();

  // The sheet edits a draft; nothing reaches the store until Apply.
  const [draftType, setDraftType] = useState<PropertyType>(type);
  const [draftBedrooms, setDraftBedrooms] = useState<number | null>(bedrooms);
  const [localMin, setLocalMin] = useState(priceToText(minPrice));
  const [localMax, setLocalMax] = useState(priceToText(maxPrice));

  // Re-seed from the store each time the sheet opens, so a cancelled edit
  // does not survive into the next open.
  useEffect(() => {
    if (visible) {
      setDraftType(type);
      setDraftBedrooms(bedrooms);
      setLocalMin(priceToText(minPrice));
      setLocalMax(priceToText(maxPrice));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const shadow = shadows.subtle;

  const draftMin = localMin ? Number(localMin) : null;
  const draftMax = localMax ? Number(localMax) : null;
  const priceError =
    draftMin != null && draftMax != null && draftMin > draftMax
      ? "Min price must be less than max price."
      : null;

  const activeCount = [draftType, draftBedrooms, draftMin, draftMax].filter(
    (v) => v !== null,
  ).length;

  const handleReset = () => {
    setDraftType(null);
    setDraftBedrooms(null);
    setLocalMin("");
    setLocalMax("");
  };

  const handleApply = () => {
    setType(draftType);
    setBedrooms(draftBedrooms);
    setMinPrice(draftMin);
    setMaxPrice(draftMax);
    onClose();
  };

  const applyPreset = (min: number | null, max: number | null) => {
    setLocalMin(priceToText(min));
    setLocalMax(priceToText(max));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-neutral-50"
      >
        <View
          className="flex-row items-center justify-between border-b border-neutral-100 bg-white px-5 pb-4"
          style={{ paddingTop: Platform.OS === "android" ? insets.top + 16 : 24 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters without applying"
            hitSlop={12}
            onPress={onClose}
            className="h-11 w-11 items-center justify-center -ml-2 active:opacity-60"
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>

          <Text
            accessibilityRole="header"
            className="font-rubik-bold text-lg text-neutral-900"
          >
            Filters
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
            disabled={activeCount === 0}
            hitSlop={12}
            onPress={handleReset}
            className="h-11 justify-center active:opacity-60"
          >
            <Text
              className={`font-rubik-semibold text-sm ${
                activeCount === 0 ? "text-neutral-300" : "text-primary"
              }`}
            >
              Reset
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text
            accessibilityRole="header"
            className="font-rubik-bold mb-3 text-base text-neutral-800"
          >
            Property Type
          </Text>

          <View className="mb-6 flex-row flex-wrap gap-2">
            {TYPES.map((item) => {
              const active = draftType === item.value;
              return (
                <Pressable
                  key={String(item.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${item.label} property type`}
                  onPress={() => setDraftType(item.value)}
                  className={`${chip(active)} active:opacity-80`}
                  style={shadow}
                >
                  <Text className={chipText(active)}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            accessibilityRole="header"
            className="font-rubik-bold mb-3 text-base text-neutral-800"
          >
            Bedrooms
          </Text>

          <View className="mb-6 flex-row gap-2">
            {BEDS.map((item) => {
              const active = draftBedrooms === item.value;
              return (
                <Pressable
                  key={String(item.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    item.value == null
                      ? "Any number of bedrooms"
                      : item.value >= 4
                        ? "Four or more bedrooms"
                        : `${item.value} bedrooms`
                  }
                  onPress={() => setDraftBedrooms(item.value)}
                  className={`h-12 flex-1 items-center justify-center rounded-2xl border active:opacity-80 ${
                    active
                      ? "border-primary bg-primary"
                      : "border-neutral-200 bg-white"
                  }`}
                  style={shadow}
                >
                  <Text
                    className={`font-rubik-bold text-sm ${
                      active ? "text-white" : "text-neutral-600"
                    }`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text
            accessibilityRole="header"
            className="font-rubik-bold mb-3 text-base text-neutral-800"
          >
            Price Range (MYR)
          </Text>

          <View className="mb-3 flex-row gap-3">
            {[
              {
                label: "Min Price",
                a11yLabel: "Minimum price in ringgit",
                value: localMin,
                onChange: setLocalMin,
                placeholder: "0",
              },
              {
                label: "Max Price",
                a11yLabel: "Maximum price in ringgit",
                value: localMax,
                onChange: setLocalMax,
                placeholder: "Any",
              },
            ].map(({ label, a11yLabel, value, onChange, placeholder }) => (
              <View key={label} className="flex-1">
                <Text className="font-rubik-medium mb-1.5 text-xs text-neutral-500">
                  {label}
                </Text>
                <View
                  className={`min-h-12 flex-row items-center rounded-2xl border bg-white px-3 ${
                    priceError ? "border-red-300" : "border-neutral-200"
                  }`}
                  style={shadow}
                >
                  <Text className="mr-1 text-sm text-neutral-500">RM</Text>
                  <TextInput
                    className="flex-1 py-3 text-neutral-800"
                    accessibilityLabel={a11yLabel}
                    placeholder={placeholder}
                    placeholderTextColor={colors.icon}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    value={value}
                    onChangeText={(text) => onChange(digitsOnly(text))}
                  />
                </View>
              </View>
            ))}
          </View>

          {priceError && (
            <Text accessibilityRole="alert" className="mb-3 text-sm text-red-600">
              {priceError}
            </Text>
          )}

          <View className="flex-row flex-wrap gap-2">
            {PRICE_PRESETS.map((p) => {
              const active = draftMin === p.min && draftMax === p.max;
              return (
                <Pressable
                  key={p.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Price ${p.label}`}
                  onPress={() => applyPreset(p.min, p.max)}
                  className={`min-h-11 justify-center rounded-full border px-3 active:opacity-80 ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <Text
                    className={`font-rubik-medium text-xs ${
                      active ? "text-primary" : "text-neutral-500"
                    }`}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View
          className="border-t border-neutral-100 bg-white px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeCount > 0
                ? `Apply ${activeCount} filters`
                : "Apply filters"
            }
            accessibilityState={{ disabled: !!priceError }}
            disabled={!!priceError}
            onPress={handleApply}
            className={`h-14 items-center justify-center rounded-2xl bg-primary active:opacity-90 ${
              priceError ? "opacity-40" : ""
            }`}
            style={priceError ? undefined : shadows.primaryButton}
          >
            <Text className="font-rubik-bold text-base text-white">
              Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
