/**
 * Cancellation policy utility — determines if a booking can be cancelled
 * and calculates the refund amount based on time-until-event tiers.
 */

export const canCancelBooking = (eventStartDate, bookingStatus) => {
  if (bookingStatus === 'cancelled') return { canCancel: false, reason: 'already_cancelled' };
  if (bookingStatus !== 'confirmed')  return { canCancel: false, reason: 'not_confirmed' };

  const now           = new Date();
  const eventStart    = new Date(eventStartDate);
  const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);

  if (hoursUntilEvent < 48) {
    return {
      canCancel: false,
      reason: 'within_48_hours',
      message: 'Cancellation not available within 48 hours of event start',
    };
  }

  return {
    canCancel: true,
    hoursUntilEvent: Math.floor(hoursUntilEvent),
    message: 'You can cancel this booking',
  };
};

export const getRefundAmount = (totalAmount, hoursUntilEvent) => {
  if (hoursUntilEvent >= 168) return { refund: totalAmount,       percent: 100, label: 'Full refund' };
  if (hoursUntilEvent >= 72)  return { refund: totalAmount * 0.75, percent: 75,  label: '75% refund' };
  if (hoursUntilEvent >= 48)  return { refund: totalAmount * 0.50, percent: 50,  label: '50% refund' };
  return { refund: 0, percent: 0, label: 'No refund' };
};

/**
 * Derive price display string from event.ticketTiers or event.ticketTypes array.
 * Fixes the "Free" bug when ticket tiers actually have prices.
 */
export const getEventPriceDisplay = (event) => {
  const tiers = event?.ticketTiers ?? event?.ticketTypes ?? [];
  if (!tiers || tiers.length === 0) return 'Free';

  const prices = tiers
    .filter((t) => t.isActive !== false)
    .map((t) => t.price);

  if (prices.length === 0) return 'Free';

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === 0 && maxPrice === 0) return 'Free';
  if (minPrice === 0) return `Free – ₹${maxPrice}`;
  if (minPrice === maxPrice) return `₹${minPrice}`;
  return `₹${minPrice} onwards`;
};
