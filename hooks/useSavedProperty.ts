import { useAuth } from "@clerk/expo";
import { useSupabase } from "./useSupabase";
import { useEffect, useState } from "react";

export function useSavedProperty(propertyId: string, onUnsave?: () => void) {
    const { userId } = useAuth();
    const authSupabase = useSupabase();

    const [isSaved, setIsSaved] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || !propertyId) return;

        let cancelled = false;
        (async () => {
            // maybeSingle: "not saved" is a normal result, not an error.
            const { data } = await authSupabase
                .from("saved_properties")
                .select("id")
                .eq("user_clerk_id", userId)
                .eq("property_id", propertyId)
                .maybeSingle();

            if (!cancelled) setIsSaved(!!data);
        })();

        return () => {
            cancelled = true;
        };
    }, [propertyId, userId]);

    const toggleSave = async () => {
        if (!userId || !propertyId || saveLoading) return;

        setSaveLoading(true);
        setSaveError(null);

        const wasSaved = isSaved;
        // Optimistic: flip now, roll back if the write fails.
        setIsSaved(!wasSaved);

        const { error } = wasSaved
            ? await authSupabase
                .from("saved_properties")
                .delete()
                .eq("user_clerk_id", userId)
                .eq("property_id", propertyId)
            : await authSupabase.from("saved_properties").insert({
                user_clerk_id: userId,
                property_id: propertyId,
            });

        if (error) {
            setIsSaved(wasSaved);
            setSaveError(wasSaved ? "Could not remove from saved." : "Could not save this property.");
        } else if (wasSaved) {
            onUnsave?.();
        }

        setSaveLoading(false);
    };

    return { isSaved, saveLoading, saveError, toggleSave };
}
