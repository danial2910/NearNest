export const formatPrice = (price: number): string => {
    if (price >= 1000000) {
        return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
        return `$${(price / 1000).toFixed(1)}K`;
    }

    return `$${price}`;
}

export const greetingFor = (date: Date): string => {
    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}