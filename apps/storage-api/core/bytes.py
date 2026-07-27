SI_UNITS = ("B", "kB", "MB", "GB", "TB", "PB")


def format_bytes(value: int) -> str:
    """Format a non-negative byte count for user-facing prose."""
    if value < 0:
        raise ValueError("Byte counts cannot be negative.")
    if value < 1_000:
        return f"{value} B"

    amount = float(value)
    unit_index = 0
    while amount >= 1_000 and unit_index < len(SI_UNITS) - 1:
        amount /= 1_000
        unit_index += 1

    rendered = f"{amount:.1f}".removesuffix(".0")
    return f"{rendered} {SI_UNITS[unit_index]}"
