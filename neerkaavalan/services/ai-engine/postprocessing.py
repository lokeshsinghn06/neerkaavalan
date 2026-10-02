
import cv2
import numpy as np


DEFAULT_MIN_GARBAGE_AREA = 300


def extract_garbage_objects(
    mask,
    min_garbage_area=DEFAULT_MIN_GARBAGE_AREA
):
    """
    Extract individual garbage regions from a binary mask.

    Returns:
        garbage_objects: list of dictionaries
        labels: connected-component label image
    """

    binary_mask = (
        (mask > 0).astype(np.uint8)
    )

    num_labels, labels, stats, centroids = (
        cv2.connectedComponentsWithStats(
            binary_mask,
            connectivity=8
        )
    )

    garbage_objects = []

    for label in range(1, num_labels):

        area = int(
            stats[label, cv2.CC_STAT_AREA]
        )

        if area < min_garbage_area:
            continue

        x = int(
            stats[label, cv2.CC_STAT_LEFT]
        )

        y = int(
            stats[label, cv2.CC_STAT_TOP]
        )

        w = int(
            stats[label, cv2.CC_STAT_WIDTH]
        )

        h = int(
            stats[label, cv2.CC_STAT_HEIGHT]
        )

        cx = int(
            round(centroids[label][0])
        )

        cy = int(
            round(centroids[label][1])
        )

        garbage_objects.append({
            "label": label,
            "area": area,
            "cx": cx,
            "cy": cy,
            "x": x,
            "y": y,
            "w": w,
            "h": h
        })

    return garbage_objects, labels


def create_garbage_gps_records(
    garbage_objects,
    drone_lat,
    drone_lon,
    altitude,
    heading,
    hfov,
    image_width,
    image_height
):
    """
    Convert detected garbage centroids into GPS coordinates.
    """

    from gps_mapping import pixel_to_gps

    garbage_gps = []

    for index, obj in enumerate(
        garbage_objects,
        start=1
    ):

        lat, lon = pixel_to_gps(
            obj["cx"],
            obj["cy"],
            image_width,
            image_height,
            drone_lat,
            drone_lon,
            altitude,
            heading,
            hfov
        )

        garbage_gps.append({
            "id": f"G{index}",
            "latitude": lat,
            "longitude": lon,
            "pixel_x": obj["cx"],
            "pixel_y": obj["cy"],
            "area_pixels": obj["area"]
        })

    return garbage_gps
