
import cv2
import numpy as np
import matplotlib.pyplot as plt


def visualize_route(
    original,
    garbage_objects,
    labels,
    waypoints,
    route_indices,
    total_distance
):
    """
    Draw garbage regions, optimized route and
    numbered collection stops.

    Returns:
        route_image in RGB format.
    """

    # PIL -> NumPy RGB if necessary
    if hasattr(original, "convert"):
        route_image = np.array(
            original.convert("RGB")
        )
    else:
        route_image = np.array(
            original
        ).copy()

    # --------------------------------------------------------
    # Draw garbage regions
    # --------------------------------------------------------

    for wp in waypoints:

        x = int(
            wp["pixel_x"]
        )

        y = int(
            wp["pixel_y"]
        )

        matching_object = None

        for obj in garbage_objects:

            if (
                obj["cx"] == x
                and
                obj["cy"] == y
            ):

                matching_object = obj
                break

        if matching_object is None:
            continue

        label = matching_object[
            "label"
        ]

        object_mask = (
            labels == label
        )

        # Safety check
        if (
            object_mask.shape[:2]
            !=
            route_image.shape[:2]
        ):

            object_mask = cv2.resize(
                object_mask.astype(
                    np.uint8
                ),
                (
                    route_image.shape[1],
                    route_image.shape[0]
                ),
                interpolation=cv2.INTER_NEAREST
            ).astype(bool)

        # RGB overlay
        overlay = route_image.copy()

        overlay[object_mask] = (
            255,
            0,
            0
        )

        route_image = cv2.addWeighted(
            route_image,
            0.65,
            overlay,
            0.35,
            0
        )

    # --------------------------------------------------------
    # Draw optimized route
    # --------------------------------------------------------

    for i in range(
        len(route_indices) - 1
    ):

        current = waypoints[
            route_indices[i]
        ]

        next_point = waypoints[
            route_indices[i + 1]
        ]

        x1 = int(
            current["pixel_x"]
        )

        y1 = int(
            current["pixel_y"]
        )

        x2 = int(
            next_point["pixel_x"]
        )

        y2 = int(
            next_point["pixel_y"]
        )

        cv2.arrowedLine(
            route_image,
            (x1, y1),
            (x2, y2),
            (0, 255, 255),
            4,
            tipLength=0.08
        )

    # --------------------------------------------------------
    # Draw numbered waypoints
    # --------------------------------------------------------

    for order, index in enumerate(
        route_indices
    ):

        wp = waypoints[index]

        x = int(
            wp["pixel_x"]
        )

        y = int(
            wp["pixel_y"]
        )

        # Waypoint
        cv2.circle(
            route_image,
            (x, y),
            9,
            (255, 255, 0),
            -1
        )

        # Black border
        cv2.circle(
            route_image,
            (x, y),
            13,
            (0, 0, 0),
            2
        )

        # STOP number
        cv2.putText(
            route_image,
            f"STOP {order + 1}",
            (x + 15, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 0),
            2,
            cv2.LINE_AA
        )

    # --------------------------------------------------------
    # Display
    # --------------------------------------------------------

    # Note: plt.show() is not called here so the server can run headlessly.
    # The route_image numpy array is returned for further use (e.g. base64 encoding).

    return route_image
