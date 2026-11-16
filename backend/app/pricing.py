def calculate_booking_price(hourly_rate: int, duration_minutes: int, session_type: str) -> int:
    """Prorate minutes, apply the group discount, then round half up to rubles."""
    percent = 70 if session_type == "group" else 100
    # Integer arithmetic avoids floating-point and Python's ties-to-even rounding.
    return (hourly_rate * duration_minutes * percent + 3000) // 6000
