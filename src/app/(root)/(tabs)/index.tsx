import { useUser } from '@clerk/expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { Property } from '../../../../types';
import { Ionicons } from '@expo/vector-icons';
import FeaturedCard from '../../../../components/FeaturedCard';
import PropertyCard from '../../../../components/PropertyCard';
import { greetingFor } from '../../../../lib/utils';

/** Re-fetching on every tab focus is wasteful; only refetch once the data is stale. */
const STALE_AFTER_MS = 60_000;
const TABLET_MIN_WIDTH = 768;

function FeaturedSkeleton() {
    return (
        <View className="mr-4 h-64 w-64 overflow-hidden rounded-2xl bg-neutral-200" />
    );
}

export default function HomeScreen() {
    const { user } = useUser();
    const router = useRouter();
    const { width } = useWindowDimensions();

    const [featured, setFeatured] = useState<Property[]>([]);
    const [recommended, setRecommended] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lastFetchedAt = useRef(0);
    const inFlight = useRef(false);

    const numColumns = width >= TABLET_MIN_WIDTH ? 2 : 1;
    const greeting = useMemo(() => greetingFor(new Date()), []);

    const fetchProperties = useCallback(async ({ silent = false } = {}) => {
        if (inFlight.current) return;
        inFlight.current = true;

        if (!silent) setLoading(true);
        setError(null);

        const [featuredResult, recommendedResult] = await Promise.all([
            supabase
                .from('properties')
                .select('*')
                .eq('is_featured', true)
                .order('created_at', { ascending: false }),
            supabase
                .from('properties')
                .select('*')
                .eq('is_featured', false)
                .order('created_at', { ascending: false }),
        ]);

        if (featuredResult.error || recommendedResult.error) {
            setError('We could not load properties. Check your connection and try again.');
        } else {
            setFeatured(featuredResult.data ?? []);
            setRecommended(recommendedResult.data ?? []);
            lastFetchedAt.current = Date.now();
        }

        setLoading(false);
        setRefreshing(false);
        inFlight.current = false;
    }, []);

    useFocusEffect(
        useCallback(() => {
            const isStale = Date.now() - lastFetchedAt.current > STALE_AFTER_MS;
            if (isStale) {
                fetchProperties({ silent: lastFetchedAt.current !== 0 });
            }
        }, [fetchProperties]),
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchProperties({ silent: true });
    }, [fetchProperties]);

    const goToSearch = useCallback(
        () => router.push('/(root)/(tabs)/search'),
        [router],
    );

    const openProperty = useCallback(
        (property: Property) =>
            router.push({
                pathname: '/(root)/property/[id]',
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

    const ListHeader = (
        <View>
            {/* Brand + greeting */}
            <View className="flex-row items-center gap-3 px-5 pb-6 pt-2">
                <View
                    accessible
                    accessibilityRole="header"
                    accessibilityLabel="NearNest, find your next home"
                    className="flex-1 flex-row items-center gap-3"
                >
                    <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                        <Image
                            source={require('../../../../assets/images/logo.png')}
                            contentFit="contain"
                            style={{ width: 60, height: 60 }}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                        />
                    </View>

                    <View className="flex-1">
                        <Text
                            numberOfLines={1}
                            className="font-rubik-bold text-2xl text-primary"
                        >
                            NearNest
                        </Text>
                        <Text numberOfLines={1} className="text-xs text-neutral-500">
                            Find your next home
                        </Text>
                    </View>
                </View>

                <View accessible className="max-w-[45%] items-end">
                    <Text numberOfLines={1} className="text-sm text-neutral-500">
                        {greeting} 👋
                    </Text>
                    {!!user?.firstName && (
                        <Text
                            numberOfLines={1}
                            className="font-rubik-bold text-xl text-neutral-900"
                        >
                            {user.firstName}
                        </Text>
                    )}
                </View>
            </View>

            {/* Search */}
            <View className="mx-5 mb-6 flex-row items-center gap-2">
                <Pressable
                    accessibilityRole="search"
                    accessibilityLabel="Search for properties"
                    onPress={goToSearch}
                    className="h-12 flex-1 flex-row items-center gap-2 rounded-xl bg-neutral-100 px-4 active:opacity-70"
                >
                    <Ionicons
                        name="search-outline"
                        size={20}
                        color="#9CA3AF"
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                    />
                    <Text className="flex-1 text-sm text-neutral-500">
                        Search for properties
                    </Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Filter properties"
                    onPress={goToSearch}
                    className="h-12 w-12 items-center justify-center rounded-xl bg-primary active:opacity-80"
                >
                    <Ionicons name="options-outline" size={22} color="white" />
                </Pressable>
            </View>

            {/* Featured */}
            {(loading || featured.length > 0) && (
                <View className="mb-2">
                    <Text
                        accessibilityRole="header"
                        className="font-rubik-bold px-5 pb-3 text-2xl text-neutral-900"
                    >
                        Featured
                    </Text>

                    {loading ? (
                        <View className="flex-row px-5">
                            <FeaturedSkeleton />
                            <FeaturedSkeleton />
                        </View>
                    ) : (
                        <FlatList
                            data={featured}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <FeaturedCard property={item} onPress={openProperty} />
                            )}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20 }}
                        />
                    )}
                </View>
            )}

            <Text
                accessibilityRole="header"
                className="font-rubik-bold px-5 pb-3 pt-4 text-2xl text-neutral-900"
            >
                Recommended
            </Text>
        </View>
    );

    const ListEmpty = () => {
        if (loading) {
            return (
                <View className="items-center py-16">
                    <ActivityIndicator size="small" color="#0E4D92" />
                </View>
            );
        }

        if (error) {
            return (
                <View className="items-center gap-3 px-8 py-16">
                    <Ionicons name="cloud-offline-outline" size={40} color="#9CA3AF" />
                    <Text className="text-center text-base text-neutral-500">
                        {error}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Try again"
                        onPress={() => fetchProperties()}
                        className="mt-1 h-11 justify-center rounded-xl bg-primary px-5 active:opacity-80"
                    >
                        <Text className="font-rubik-semibold text-white">Try again</Text>
                    </Pressable>
                </View>
            );
        }

        return (
            <View className="items-center gap-3 px-8 py-16">
                <Ionicons name="home-outline" size={40} color="#9CA3AF" />
                <Text className="text-center text-base text-neutral-500">
                    No properties listed yet. Pull down to refresh, or search for a city.
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search properties"
                    onPress={goToSearch}
                    className="mt-1 h-11 justify-center rounded-xl bg-primary px-5 active:opacity-80"
                >
                    <Text className="font-rubik-semibold text-white">Search properties</Text>
                </Pressable>
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-white">
            <FlatList
                // numColumns cannot change on a mounted list; remount when it does.
                key={numColumns}
                data={recommended}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                columnWrapperStyle={numColumns > 1 ? { gap: 16 } : undefined}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 20,
                    paddingBottom: 100,
                }}
                ListHeaderComponent={ListHeader}
                ListHeaderComponentStyle={{ marginHorizontal: -20 }}
                renderItem={renderItem}
                ListEmptyComponent={ListEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#0E4D92"
                        colors={['#0E4D92']}
                    />
                }
            />
        </SafeAreaView>
    );
}
