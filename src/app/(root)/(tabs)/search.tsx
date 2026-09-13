import { useLocalSearchParams, useRouter } from "expo-router";
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
import { colors, shadows } from "../../../../lib/theme";
import PropertyCard from "../../../../components/PropertyCard";

const TABLET_MIN_WIDTH = 768;
const SEARCH_DEBOUNCE_MS = 300;

function FilterChip({
  icon,
  label,
  removeLabel,
  onRemove,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  // The whole chip is the remove target so it clears the 44pt minimum.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={removeLabel}
      onPress={onRemove}
      className="min-h-11 flex-row items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 active:opacity-60"
    >
      {icon && (
        <Ionicons
          name={icon}
          size={12}
          color={colors.primary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      <Text className="font-rubik-semibold text-xs capitalize text-primary">
        {label}
      </Text>
      <Ionicons name="close" size={14} color={colors.primary} />
    </Pressable>
  );
}

function getPriceLabel(minPrice: number | null, maxPrice: number | null) {
  if (minPrice != null && maxPrice != null) {
    return `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`;
  }
  if (minPrice != null) return `From ${formatPrice(minPrice)}`;
  if (maxPrice != null) return `Up to ${formatPrice(maxPrice)}`;
  return null;
}

export default function SearchScreen() {
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns = width >= TABLET_MIN_WIDTH ? 2 : 1;

  const router = useRouter();
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

  const openProperty = useCallback(
    (property: Property) =>
      router.push({
        pathname: "/(root)/property/[id]",
        params: { id: property.id },
      }),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Property }) => (
      <View style={{ flex: 1 / numColumns }}>
        <PropertyCard property={item} onPress={openProperty} />
      </View>
    ),
    [numColumns, openProperty],
  );

  const clearPrice = useCallback(() => {
    setMinPrice(null);
    setMaxPrice(null);
  }, [setMinPrice, setMaxPrice]);

  const priceLabel = getPriceLabel(minPrice, maxPrice);
  const hasResults = results.length > 0;

  // Rendered as an element, not an inline component, so it does not remount
  // (and restart the spinner) on every render.
  let emptyState;
  if (loading) {
    emptyState = (
      <View className="items-center py-20">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (error) {
    emptyState = (
      <View className="items-center gap-3 px-8 py-20">
        <Ionicons name="cloud-offline-outline" size={48} color={colors.emptyIcon} />
        <Text className="text-center text-base text-neutral-600">{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => fetchResult()}
          className="mt-1 h-11 justify-center rounded-xl bg-primary px-5 active:opacity-80"
        >
          <Text className="font-rubik-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  } else {
    emptyState = (
      <View className="items-center py-20">
        <Ionicons name="search-outline" size={48} color={colors.emptyIcon} />
        <Text className="font-rubik-semibold mt-4 text-base text-neutral-700">
          No properties found
        </Text>
        <Text className="mt-1 text-sm text-neutral-500">
          Try a different search or adjust filters
        </Text>
      </View>
    );
  }

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
          className="min-h-12 flex-1 flex-row items-center gap-3 rounded-2xl bg-white px-4"
          style={shadows.control}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.iconSubtle}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <TextInput
            className="flex-1 py-3 text-base text-neutral-800"
            accessibilityLabel="Search by title or city"
            placeholder="Search by title or city"
            placeholderTextColor={colors.icon}
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
              hitSlop={13}
              onPress={() => setSearch("")}
              className="active:opacity-60"
            >
              <Ionicons name="close-circle" size={18} color={colors.iconSubtle} />
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
          style={shadows.control}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? colors.white : colors.textMuted}
          />
          {activeFilterCount > 0 && (
            <View
              className="absolute -right-1 -top-1 min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Text
                maxFontSizeMultiplier={1.4}
                className="font-rubik-bold text-[10px] text-white"
              >
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
            <FilterChip
              label={type}
              removeLabel={`Remove ${type} filter`}
              onRemove={() => setType(null)}
            />
          )}

          {bedrooms != null && (
            <FilterChip
              icon="bed-outline"
              label={
                bedrooms >= 4 ? "4+ beds" : `${bedrooms} bed${bedrooms > 1 ? "s" : ""}`
              }
              removeLabel="Remove bedrooms filter"
              onRemove={() => setBedrooms(null)}
            />
          )}

          {priceLabel && (
            <FilterChip
              icon="pricetag-outline"
              label={priceLabel}
              removeLabel="Remove price filter"
              onRemove={clearPrice}
            />
          )}
        </View>
      )}

      {/* Refresh failures while stale results are showing */}
      {error && hasResults && (
        <View
          accessibilityRole="alert"
          className="mx-5 mt-3 flex-row items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
        >
          <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
          <Text className="flex-1 text-sm text-red-700">
            Showing earlier results. {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => fetchResult()}
            className="min-h-11 justify-center active:opacity-60"
          >
            <Text className="font-rubik-semibold text-sm text-red-700">Retry</Text>
          </Pressable>
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
        ListEmptyComponent={emptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <FilterModal visible={showFilters} onClose={() => setShowFilters(false)} />
    </SafeAreaView>
  );
}
