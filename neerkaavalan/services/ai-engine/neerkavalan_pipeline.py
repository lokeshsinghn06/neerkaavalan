
from inference import predict_garbage

from postprocessing import (
    extract_garbage_objects,
    create_garbage_gps_records
)

from route_planning import (
    optimize_garbage_route
)

from visualization import (
    visualize_route
)


def process_neerkavalan(
    image_path,
    drone_lat,
    drone_lon,
    altitude,
    heading,
    hfov,
    threshold=0.5,
    min_garbage_area=300,
    visualize=True
):
    """
    Complete Neerkavalan processing pipeline.

    Image
      -> DeepLabV3+
      -> Garbage mask
      -> Connected components
      -> GPS coordinates
      -> USV waypoints
      -> TSP route
      -> Visualization
    """

    # --------------------------------------------------------
    # 1. AI inference
    # --------------------------------------------------------

    result = predict_garbage(
        image_path,
        threshold=threshold
    )

    # --------------------------------------------------------
    # 2. Garbage objects
    # --------------------------------------------------------

    garbage_objects, labels = (
        extract_garbage_objects(
            result["mask"],
            min_garbage_area
        )
    )

    original = result["original"]

    image_width, image_height = (
        original.size
    )

    # --------------------------------------------------------
    # 3. GPS conversion
    # --------------------------------------------------------

    garbage_gps = (
        create_garbage_gps_records(
            garbage_objects,
            drone_lat,
            drone_lon,
            altitude,
            heading,
            hfov,
            image_width,
            image_height
        )
    )

    # --------------------------------------------------------
    # 4. Route planning
    # --------------------------------------------------------

    (
        waypoints,
        optimized_route,
        total_distance
    ) = optimize_garbage_route(
        garbage_gps
    )

    # Convert optimized route to indices
    route_indices = []

    for point in optimized_route:

        for i, wp in enumerate(
            waypoints
        ):

            if (
                wp["id"]
                ==
                point["id"]
            ):

                route_indices.append(i)
                break

    # --------------------------------------------------------
    # 5. Visualization
    # --------------------------------------------------------

    route_image = None

    if visualize and len(
        waypoints
    ) > 0:

        route_image = visualize_route(
            original,
            garbage_objects,
            labels,
            waypoints,
            route_indices,
            total_distance
        )

    # --------------------------------------------------------
    # 6. Return everything
    # --------------------------------------------------------

    return {

        "original":
            result["original"],

        "probability":
            result["probability"],

        "mask":
            result["mask"],

        "waste_percentage":
            result["waste_percentage"],

        "garbage_objects":
            garbage_objects,

        "garbage_gps":
            garbage_gps,

        "waypoints":
            waypoints,

        "route_indices":
            route_indices,

        "optimized_route":
            optimized_route,

        "total_distance_m":
            total_distance,

        "route_image":
            route_image
    }
