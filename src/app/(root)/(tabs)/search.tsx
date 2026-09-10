import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFilterStore } from "../../../../store/filterStore";
import { Property } from "../../../../types";
import { Ionicons } from "@expo/vector-icons";
import FilterModal from "../../../../components/FilterModal";
import { formatPrice } from "../../../../lib/utils";
import { supabase } from "../../../../lib/supabase";
import PropertyCard from "../../../../components/PropertyCard";

const TABLET_MIN_WIDTH = 768;
const SEARCH_DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns = width >= TABLET_MIN_WIDTH ? 2 : 1;

  const { openFilters } = useLocalSearchParams<{ openFilters?: string }>();

  const {
    search,
    type,
    bedrooms,
    minPrice,
    maxPrice,
    setSearch,
    setType,
    setBedrooms,
    setMinPrice,
    setMaxPrice,
  } = useFilterStore();

  const activeFilterCount = [
    type != null,
    bedrooms != null,
    minPrice != null,
    maxPrice != null,
  ].filter(Boolean).length;

  // Responses can land out of order; only the newest request may write state.
  const requestId = useRef(0);

  const fetchResult = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++requestId.current;

      if (!silent) setLoading(true);
      setError(null);

      let query = supabase.from("properties").select("*");

      const term = search.trim();
      if (term) {
        query = query.or(`title.ilike.%${term}%,city.ilike.%${term}%`);
      }
      if (type) {
        query = query.eq("type", type);
      }
      if (bedrooms != null) {
        // 4 is the "4+" bucket in FilterModal, so it must not be an exact match.
        query =
          bedrooms >= 4 ? query.gte("bedrooms", 4) : query.eq("bedrooms", bedrooms);
      }
      if (minPrice != null) {
        query = query.gte("price", minPrice);
      }
      if (maxPrice != null) {
        query = query.lte("price", maxPrice);
      }

      const { data, error: queryError } = await query.order("created_at", {
        ascending: false,
      });

      // A newer request has started; discard this response.
      if (id !== requestId.current) return;

      if (queryError) {
        setError("We could not run that search. Check your connection and try again.");
      } else {
        setResults(data ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [search, type, bedrooms, minPrice, maxPrice],
  );

  // Debounced so typing does not fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(fetchResult, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fetchResult]);

  useEffect(() => {
    if (openFilters === "true") {
      setShowFilters(true);
    }
  }, [openFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResult({ silent: true });
  }, [fetchResult]);

  const renderItem = useCallback(
    ({ item }: { item: Property }) => (
      <View style={{ flex: 1 / numColumns }}>
        <PropertyCard property={item} />
      </View>
    ),
    [numColumns],
  );

  const clearPrice = useCallback(() => {
    setMinPrice(null);
    setMaxPrice(null);
  }, [setMinPrice, setMaxPrice]);

  const priceLabel =
    minPrice != null && maxPrice != null
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : minPrice != null
        ? `From ${formatPrice(minPrice)}`
        : `Up to ${formatPrice(maxPrice!)}`;

  const ListEmpty = () => {
    if (loading) {
      return (
        <View className="items-center py-20">
          <ActivityIndicator size="large" color="#0E4D92" />
        </View>
      );
    }

    if (error) {
      return (
        <View className="items-center gap-3 px-8 py-20">
          <Ionicons name="cloud-offline-outline" size={48} color="#A3A3A3" />
          <Text className="text-center text-base text-neutral-600">{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => fetchResult()}
            className="mt-1 h-11 justify-center rounded-xl bg-primary px-5 active:opacity-80"
          >
            <Text className="font-rubik-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="items-center py-20">
        <Ionicons name="search-outline" size={48} color="#A3A3A3" />
        <Text className="font-rubik-semibold mt-4 text-base text-neutral-700">
          No properties found
        </Text>
        <Text className="mt-1 text-sm text-neutral-500">
          Try a different search or adjust filters
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-neutral-50">
      <View className="px-5 pb-4 pt-4">
        <Text
          accessibilityRole="header"
          className="font-rubik-bold text-2xl text-neutral-900"
        >
          Find Property
        </Text>
      </View>

      {/* Search + filter */}
      <View className="flex-row items-center gap-3 px-5">
        <View
          className="h-12 flex-1 flex-row items-center gap-3 rounded-2xl bg-white px-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color="#9CA3AF"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <TextInput
            className="flex-1 text-base text-neutral-800"
            accessibilityLabel="Search by title or city"
            placeholder="Search by title or city"
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={12}
              onPress={() => setSearch("")}
              className="active:opacity-60"
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0
              ? `Filters, ${activeFilterCount} active`
              : "Filters"
          }
          onPress={() => setShowFilters(true)}
          className={`h-12 w-12 items-center justify-center rounded-2xl active:opacity-80 ${
            activeFilterCount > 0 ? "bg-primary" : "bg-white"
          }`}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? "#fff" : "#374151"}
          />
          {activeFilterCount > 0 && (
            <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-red-500">
              <Text className="font-rubik-bold text-[10px] text-white">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2 px-5">
          {type && (
            <View className="flex-row items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <Text className="font-rubik-semibold text-xs capitalize text-primary">
                {type}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${type} filter`}
                hitSlop={10}
                onPress={() => setType(null)}
                className="active:opacity-60"
              >
                <Ionicons name="close" size={14} color="#0E4D92" />
              </Pressable>
            </View>
          )}

          {bedrooms != null && (
            <View className="flex-row items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <Ionicons
                name="bed-outline"
                size={12}
                color="#0E4D92"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text className="font-rubik-semibold text-xs text-primary">
                {bedrooms >= 4
                  ? "4+ beds"
                  : `${bedrooms} bed${bedrooms > 1 ? "s" : ""}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove bedrooms filter"
                hitSlop={10}
                onPress={() => setBedrooms(null)}
                className="active:opacity-60"
              >
                <Ionicons name="close" size={14} color="#0E4D92" />
              </Pressable>
            </View>
          )}

          {(minPrice != null || maxPrice != null) && (
            <View className="flex-row items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <Ionicons
                name="pricetag-outline"
                size={12}
                color="#0E4D92"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text className="font-rubik-semibold text-xs text-primary">
                {priceLabel}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove price filter"
                hitSlop={10}
                onPress={clearPrice}
                className="active:opacity-60"
              >
                <Ionicons name="close" size={14} color="#0E4D92" />
              </Pressable>
            </View>
          )}
        </View>
      )}

      <FlatList
        // numColumns cannot change on a mounted list; remount when it does.
        key={numColumns}
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        ListHeaderComponent={
          <Text
            accessibilityLiveRegion="polite"
            className="mb-4 text-sm text-neutral-500"
          >
            {loading
              ? "Searching…"
              : `${results.length} ${results.length === 1 ? "property" : "properties"} found`}
          </Text>
        }
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0E4D92"
            colors={["#0E4D92"]}
          />
        }
      />

      <FilterModal visible={showFilters} onClose={() => setShowFilters(false)} />
    </SafeAreaView>
  );
}
