import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSupabase } from "../../../../hooks/useSupabase";

const TYPES = ["apartment", "house", "villa", "studio"] as const;
type PropertyType = (typeof TYPES)[number];

const MIN_PRICE = 1;
const MAX_PRICE = 999_999_999;
const MAX_PHOTOS = 6;
const BUCKET = "property-images";

const PRIMARY = "#0E4D92";
const MUTED = "#6B7280";

const inputClass =
  "bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 font-rubik";
const inputErrorClass =
  "bg-white border border-red-400 rounded-2xl px-4 py-3 text-gray-800 font-rubik";
const labelClass = "text-sm font-rubik-semibold text-gray-700 mb-1.5";
const sectionClass = "mb-5";
const helpClass = "text-xs font-rubik text-gray-500 mt-1.5 ml-1";
const errorClass = "text-xs font-rubik-medium text-red-600 mt-1.5 ml-1";

/** One photo, one record. The preview and the uploaded URL never drift apart. */
interface Photo {
  id: string;
  uri: string;
  url?: string;
  status: "uploading" | "ready" | "failed";
  /** Storage object key, kept so an abandoned upload can be cleaned up. */
  path?: string;
  /** Held only until the upload succeeds, then dropped to free memory. */
  base64?: string;
}

interface FormState {
  title: string;
  description: string;
  price: string;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  areaSqft: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  is_featured: boolean;
}

type FieldKey = "photos" | "title" | "price" | "address" | "city";
type Errors = Partial<Record<FieldKey, string>>;

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  price: "",
  type: "apartment",
  bedrooms: 1,
  bathrooms: 1,
  areaSqft: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  is_featured: false,
};

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Supabase Storage needs an ArrayBuffer on React Native — Blob, File and
 * FormData all fail there. A tight loop beats Uint8Array.from with a callback.
 */
const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export default function CreateScreen() {
  const router = useRouter();
  const authSupabase = useSupabase();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<FieldKey, number>>>({});

  const uploading = photos.some((p) => p.status === "uploading");

  const updateForm = (fields: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...fields }));

  const clearError = (key: FieldKey) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  /** Clearing on edit keeps an error from outliving the fix that resolved it. */
  const setField = (key: keyof FormState, value: string) => {
    updateForm({ [key]: value } as Partial<FormState>);
    clearError(key as FieldKey);
  };

  const trackOffset =
    (key: FieldKey) => (e: { nativeEvent: { layout: { y: number } } }) => {
      offsets.current[key] = e.nativeEvent.layout.y;
    };

  const removeFromStorage = (paths: string[]) => {
    if (paths.length === 0) return;
    // Best effort: a failed cleanup must never block the user.
    authSupabase.storage
      .from(BUCKET)
      .remove(paths)
      .catch((error) => console.warn("Storage cleanup failed:", error));
  };

  const uploadPhoto = async (photo: Photo) => {
    const path = `property_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

    try {
      if (!photo.base64) throw new Error("Image data missing for " + photo.id);

      const { error } = await authSupabase.storage
        .from(BUCKET)
        .upload(path, base64ToBytes(photo.base64), {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) throw error;

      const { data } = authSupabase.storage.from(BUCKET).getPublicUrl(path);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? {
                ...p,
                status: "ready" as const,
                url: data.publicUrl,
                path,
                base64: undefined,
              }
            : p
        )
      );
    } catch (error) {
      console.error("Upload error:", error);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, status: "failed" as const } : p
        )
      );
    }
  };

  const handlePickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Photo access needed",
        "NearNest needs access to your photo library to add listing photos. You can turn this on in Settings."
      );
      return;
    }

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: remaining,
    });

    if (result.canceled) return;

    const picked: Photo[] = result.assets.map((asset, i) => ({
      id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      uri: asset.uri,
      status: "uploading",
      base64: asset.base64 ?? undefined,
    }));

    setPhotos((prev) => [...prev, ...picked]);
    clearError("photos");

    // Two at a time: decoding is JS-thread work, so more in flight buys
    // nothing and holds more decoded bytes in memory at once.
    for (let i = 0; i < picked.length; i += 2) {
      await Promise.all(picked.slice(i, i + 2).map(uploadPhoto));
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.path) removeFromStorage([target.path]);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleRetryPhoto = (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "uploading" as const } : p))
    );
    uploadPhoto({ ...target, status: "uploading" });
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location access needed",
          "NearNest needs your location to fill in the coordinates. You can also type them in by hand."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      updateForm({
        latitude: String(location.coords.latitude),
        longitude: String(location.coords.longitude),
      });
    } catch {
      Alert.alert(
        "Could not find your location",
        "Check that location services are on, or enter the coordinates by hand."
      );
    } finally {
      setDetectingLocation(false);
    }
  };

  const validate = (): Errors => {
    const next: Errors = {};
    const readyPhotos = photos.filter((p) => p.status === "ready");

    if (readyPhotos.length === 0)
      next.photos = "Add at least one photo of the property.";
    if (!form.title.trim()) next.title = "Give the listing a title.";

    const priceNum = Number(form.price);
    if (!form.price.trim()) next.price = "Enter a price.";
    else if (Number.isNaN(priceNum))
      next.price = "Use digits only, with no symbols.";
    else if (priceNum < MIN_PRICE)
      next.price = `Price must be at least ${money(MIN_PRICE)}.`;
    else if (priceNum > MAX_PRICE)
      next.price = `Price cannot be more than ${money(MAX_PRICE)}.`;

    if (!form.address.trim()) next.address = "Enter the street address.";
    if (!form.city.trim()) next.city = "Enter the city.";

    return next;
  };

  const handleSubmit = async () => {
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Scroll to the first problem so the message is never off-screen.
      const order: FieldKey[] = ["photos", "title", "price", "address", "city"];
      const first = order.find((key) => key in found);
      const y = first ? offsets.current[first] : undefined;
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
      return;
    }

    setSubmitting(true);

    const { error } = await authSupabase.from("properties").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      type: form.type,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      area_sqft: form.areaSqft ? Number(form.areaSqft) : null,
      address: form.address.trim(),
      city: form.city.trim(),
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      images: photos.filter((p) => p.status === "ready").map((p) => p.url!),
      is_featured: form.is_featured,
      is_sold: false,
    });

    if (error) {
      setSubmitting(false);
      console.error("Insert error:", error);
      Alert.alert(
        "Could not publish the listing",
        "Your details are still here. Check your connection and try again."
      );
      return;
    }

    setSubmitting(false);
    setSubmitted(true);

    // Confirm in place, then hand over — no modal to dismiss.
    setTimeout(() => {
      setForm(INITIAL_FORM);
      setPhotos([]);
      setErrors({});
      setSubmitted(false);
      router.replace("/(root)/(tabs)");
    }, 900);
  };

  const submitDisabled = submitting || uploading || submitted;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <View className="px-5 pt-4 pb-3">
          <Text
            className="text-2xl font-rubik-bold text-gray-900"
            accessibilityRole="header"
          >
            Add Property
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Capped so the form does not stretch across a tablet. */}
          <View className="w-full max-w-[560px] self-center">
            <View className={sectionClass} onLayout={trackOffset("photos")}>
              <Text className={labelClass}>
                Photos{" "}
                <Text className="text-gray-500 font-rubik">
                  (up to {MAX_PHOTOS})
                </Text>
              </Text>

              <View className="flex-row flex-wrap gap-3">
                {photos.map((photo, index) => (
                  <View key={photo.id} className="relative">
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: 96, height: 96, borderRadius: 16 }}
                      contentFit="cover"
                      accessibilityLabel={
                        index === 0
                          ? "Cover photo"
                          : `Property photo ${index + 1} of ${photos.length}`
                      }
                    />

                    {photo.status === "uploading" && (
                      <View className="absolute inset-0 rounded-2xl bg-black/40 items-center justify-center">
                        <ActivityIndicator size="small" color="white" />
                      </View>
                    )}

                    {photo.status === "failed" && (
                      <TouchableOpacity
                        onPress={() => handleRetryPhoto(photo.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Photo ${index + 1} failed to upload. Try again.`}
                        className="absolute inset-0 rounded-2xl bg-black/60 items-center justify-center"
                      >
                        <Ionicons name="refresh" size={20} color="white" />
                        <Text className="text-white text-xs font-rubik-medium mt-1">
                          Retry
                        </Text>
                      </TouchableOpacity>
                    )}

                    {index === 0 && photo.status === "ready" && (
                      <View className="absolute bottom-1 left-1 bg-primary px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-rubik-semibold">
                          Cover
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleRemovePhoto(photo.id)}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <TouchableOpacity
                    onPress={handlePickImages}
                    accessibilityRole="button"
                    accessibilityLabel={`Add photos. ${photos.length} of ${MAX_PHOTOS} added.`}
                    className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-gray-300 items-center justify-center"
                  >
                    <Ionicons name="camera-outline" size={22} color={MUTED} />
                    <Text className="text-gray-500 text-xs font-rubik mt-1">
                      Add
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {errors.photos && (
                <Text className={errorClass}>{errors.photos}</Text>
              )}
            </View>

            <View className={sectionClass} onLayout={trackOffset("title")}>
              <Text className={labelClass}>Title</Text>
              <TextInput
                className={errors.title ? inputErrorClass : inputClass}
                placeholder="e.g. Modern White House in KL"
                placeholderTextColor={MUTED}
                value={form.title}
                onChangeText={(v) => setField("title", v)}
                accessibilityLabel="Listing title"
                returnKeyType="next"
              />
              {errors.title && <Text className={errorClass}>{errors.title}</Text>}
            </View>

            <View className={sectionClass}>
              <Text className={labelClass}>Description</Text>
              <TextInput
                className={inputClass}
                style={{ minHeight: 96 }}
                placeholder="Describe the property..."
                placeholderTextColor={MUTED}
                value={form.description}
                onChangeText={(v) => setField("description", v)}
                accessibilityLabel="Property description"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className={sectionClass} onLayout={trackOffset("price")}>
              <Text className={labelClass}>Price (MYR)</Text>
              <TextInput
                className={errors.price ? inputErrorClass : inputClass}
                placeholder="e.g. 3500000"
                placeholderTextColor={MUTED}
                value={form.price}
                onChangeText={(v) => setField("price", v)}
                accessibilityLabel="Price in ringgit"
                keyboardType="number-pad"
              />
              {errors.price ? (
                <Text className={errorClass}>{errors.price}</Text>
              ) : (
                <Text className={helpClass}>
                  Between {money(MIN_PRICE)} and {money(MAX_PRICE)}
                </Text>
              )}
            </View>

            <View className={sectionClass}>
              <Text className={labelClass}>Property type</Text>
              <View
                className="flex-row flex-wrap gap-2"
                accessibilityRole="radiogroup"
              >
                {TYPES.map((t) => {
                  const selected = form.type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => updateForm({ type: t })}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t}
                      className={`px-4 py-3 rounded-full border ${
                        selected
                          ? "bg-primary border-primary"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-rubik-semibold capitalize ${
                          selected ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="flex-row gap-4 mb-5">
              <Counter
                label="Bedrooms"
                value={form.bedrooms}
                onChange={(v) => updateForm({ bedrooms: v })}
              />
              <Counter
                label="Bathrooms"
                value={form.bathrooms}
                onChange={(v) => updateForm({ bathrooms: v })}
              />
            </View>

            <View className={sectionClass}>
              <Text className={labelClass}>Area (sq ft)</Text>
              <TextInput
                className={inputClass}
                placeholder="e.g. 1200"
                placeholderTextColor={MUTED}
                value={form.areaSqft}
                onChangeText={(v) => setField("areaSqft", v)}
                accessibilityLabel="Area in square feet"
                keyboardType="number-pad"
              />
            </View>

            <View className={sectionClass} onLayout={trackOffset("address")}>
              <Text className={labelClass}>Address</Text>
              <TextInput
                className={errors.address ? inputErrorClass : inputClass}
                placeholder="Street address"
                placeholderTextColor={MUTED}
                value={form.address}
                onChangeText={(v) => setField("address", v)}
                accessibilityLabel="Street address"
                textContentType="fullStreetAddress"
              />
              {errors.address && (
                <Text className={errorClass}>{errors.address}</Text>
              )}
            </View>

            <View className={sectionClass} onLayout={trackOffset("city")}>
              <Text className={labelClass}>City</Text>
              <TextInput
                className={errors.city ? inputErrorClass : inputClass}
                placeholder="e.g. Kuala Lumpur"
                placeholderTextColor={MUTED}
                value={form.city}
                onChangeText={(v) => setField("city", v)}
                accessibilityLabel="City"
                textContentType="addressCity"
              />
              {errors.city && <Text className={errorClass}>{errors.city}</Text>}
            </View>

            <View className={sectionClass}>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className={labelClass}>Coordinates</Text>
                <TouchableOpacity
                  onPress={handleDetectLocation}
                  disabled={detectingLocation}
                  accessibilityRole="button"
                  accessibilityLabel="Detect location and fill in coordinates"
                  accessibilityState={{
                    busy: detectingLocation,
                    disabled: detectingLocation,
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-2.5 rounded-full"
                >
                  {detectingLocation ? (
                    <ActivityIndicator size="small" color={PRIMARY} />
                  ) : (
                    <Ionicons name="locate-outline" size={14} color={PRIMARY} />
                  )}
                  <Text className="text-primary text-xs font-rubik-semibold">
                    {detectingLocation ? "Detecting..." : "Detect location"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-3">
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="Latitude"
                  placeholderTextColor={MUTED}
                  value={form.latitude}
                  onChangeText={(v) => setField("latitude", v)}
                  accessibilityLabel="Latitude"
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  className={`${inputClass} flex-1`}
                  placeholder="Longitude"
                  placeholderTextColor={MUTED}
                  value={form.longitude}
                  onChangeText={(v) => setField("longitude", v)}
                  accessibilityLabel="Longitude"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <Text className={helpClass}>
                Optional — used to place the listing on the map.
              </Text>
            </View>

            <View className="mb-6">
              <Toggle
                label="Featured property"
                description="Show this in the featured section on Home"
                value={form.is_featured}
                onChange={(v) => updateForm({ is_featured: v })}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitDisabled}
              accessibilityRole="button"
              accessibilityLabel="List property"
              accessibilityState={{ disabled: submitDisabled, busy: submitting }}
              className="bg-primary rounded-2xl py-4 items-center justify-center"
              style={{
                minHeight: 52,
                shadowColor: PRIMARY,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.22,
                shadowRadius: 14,
                elevation: 4,
                opacity: submitDisabled && !submitted ? 0.6 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : submitted ? (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                  <Text className="text-white font-rubik-bold text-base">
                    Listed
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-rubik-bold text-base">
                  {uploading ? "Uploading photos..." : "List property"}
                </Text>
              )}
            </TouchableOpacity>

            {uploading && (
              <Text className="text-xs font-rubik text-gray-500 mt-2 text-center">
                You can keep filling in details while photos upload.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Counter = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <View className="flex-1">
    <Text className={labelClass}>{label}</Text>
    <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <TouchableOpacity
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        accessibilityState={{ disabled: value <= 1 }}
        className="w-12 h-12 items-center justify-center"
      >
        <Ionicons
          name="remove"
          size={18}
          color={value <= 1 ? "#D1D5DB" : "#374151"}
        />
      </TouchableOpacity>
      <Text
        className="flex-1 text-center text-gray-800 font-rubik-bold text-base"
        accessibilityLabel={`${label}: ${value}`}
      >
        {value}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label.toLowerCase()}`}
        className="w-12 h-12 items-center justify-center"
      >
        <Ionicons name="add" size={18} color="#374151" />
      </TouchableOpacity>
    </View>
  </View>
);

const Toggle = ({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <View
    className={`flex-row items-center justify-between p-4 rounded-2xl border ${
      value ? "bg-primary/5 border-primary/30" : "bg-white border-gray-200"
    }`}
  >
    <View className="flex-1 mr-3">
      <Text
        className={`font-rubik-semibold ${value ? "text-primary" : "text-gray-700"}`}
      >
        {label}
      </Text>
      {description ? (
        <Text className="text-xs font-rubik text-gray-500 mt-0.5">
          {description}
        </Text>
      ) : null}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: "#D1D5DB", true: PRIMARY }}
      thumbColor="#FFFFFF"
    />
  </View>
);
