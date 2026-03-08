"""Minimap world-to-pixel config (from README). Minimap images are 1024x1024."""

MAP_CONFIG = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473},
    "GrandRift": {"scale": 581, "origin_x": -290, "origin_z": -290},
    "Lockdown": {"scale": 1000, "origin_x": -500, "origin_z": -500},
}

MINIMAP_SIZE = 1024


def world_to_pixel(x: float, z: float, map_id: str) -> tuple[int, int] | None:
    """Convert world (x, z) to minimap pixel (px, py). Returns None if map_id unknown.
    Pixels are clamped to [0, MINIMAP_SIZE-1] so out-of-bounds world coords don't break rendering."""
    cfg = MAP_CONFIG.get(map_id)
    if not cfg:
        return None
    u = (x - cfg["origin_x"]) / cfg["scale"]
    v = (z - cfg["origin_z"]) / cfg["scale"]
    pixel_x = int(u * MINIMAP_SIZE)
    pixel_y = int((1 - v) * MINIMAP_SIZE)
    # Clamp to valid minimap range (handles out-of-bounds world coords)
    pixel_x = max(0, min(MINIMAP_SIZE - 1, pixel_x))
    pixel_y = max(0, min(MINIMAP_SIZE - 1, pixel_y))
    return (pixel_x, pixel_y)
