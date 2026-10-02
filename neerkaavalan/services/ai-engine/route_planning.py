
import math
import numpy as np


def haversine_distance(
    lat1,
    lon1,
    lat2,
    lon2
):
    """
    Haversine distance between two GPS coordinates.

    Returns distance in metres.
    """

    R = 6371000.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    dlat = math.radians(
        lat2 - lat1
    )

    dlon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1_rad)
        *
        math.cos(lat2_rad)
        *
        math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


def create_distance_matrix(
    waypoints
):
    """
    Create pairwise GPS distance matrix.
    """

    n = len(waypoints)

    if n == 0:
        raise ValueError(
            "No garbage waypoints found."
        )

    distance_matrix = np.zeros(
        (n, n)
    )

    for i in range(n):

        for j in range(n):

            if i != j:

                distance_matrix[i][j] = (
                    haversine_distance(
                        waypoints[i]["latitude"],
                        waypoints[i]["longitude"],
                        waypoints[j]["latitude"],
                        waypoints[j]["longitude"]
                    )
                )

    return distance_matrix


def shortest_tsp_route(
    distance_matrix
):
    """
    Dynamic-programming TSP route.

    Starts from the first garbage waypoint
    and visits all remaining waypoints.

    Does not return to the starting waypoint.
    """

    n = len(distance_matrix)

    if n == 0:
        return [], 0

    if n == 1:
        return [0], 0

    dp = {}
    parent = {}

    start = 0

    # --------------------------------------------------------
    # Start from first garbage point
    # --------------------------------------------------------

    for node in range(1, n):

        mask = (
            (1 << start)
            |
            (1 << node)
        )

        dp[(mask, node)] = (
            distance_matrix[start][node]
        )

        parent[(mask, node)] = start

    # --------------------------------------------------------
    # Build routes
    # --------------------------------------------------------

    for size in range(3, n + 1):

        for mask in range(1 << n):

            if not (
                mask & (1 << start)
            ):
                continue

            if mask.bit_count() != size:
                continue

            for last in range(1, n):

                if not (
                    mask & (1 << last)
                ):
                    continue

                previous_mask = (
                    mask ^ (1 << last)
                )

                best_distance = float(
                    "inf"
                )

                best_previous = None

                for previous in range(
                    1,
                    n
                ):

                    if previous == last:
                        continue

                    if not (
                        previous_mask
                        &
                        (1 << previous)
                    ):
                        continue

                    previous_state = (
                        previous_mask,
                        previous
                    )

                    if previous_state not in dp:
                        continue

                    candidate = (
                        dp[previous_state]
                        +
                        distance_matrix[
                            previous
                        ][last]
                    )

                    if (
                        candidate
                        <
                        best_distance
                    ):

                        best_distance = candidate

                        best_previous = previous

                if best_previous is not None:

                    dp[(mask, last)] = (
                        best_distance
                    )

                    parent[(mask, last)] = (
                        best_previous
                    )

    # --------------------------------------------------------
    # Find best final node
    # --------------------------------------------------------

    full_mask = (
        (1 << n) - 1
    )

    best_distance = float(
        "inf"
    )

    best_last = None

    for last in range(1, n):

        state = (
            full_mask,
            last
        )

        if state in dp:

            if (
                dp[state]
                <
                best_distance
            ):

                best_distance = dp[state]

                best_last = last

    # --------------------------------------------------------
    # Reconstruct route
    # --------------------------------------------------------

    if best_last is None:
        return [0], 0

    route = [best_last]

    current = best_last

    mask = full_mask

    while current != start:

        previous = parent[
            (mask, current)
        ]

        route.append(previous)

        mask = (
            mask
            ^ (1 << current)
        )

        current = previous

    route.reverse()

    return route, best_distance


def optimize_garbage_route(
    garbage_gps
):
    """
    Generate the optimized USV collection route.
    """

    waypoints = []

    for point in garbage_gps:

        waypoints.append({
            "id": point["id"],
            "latitude": point["latitude"],
            "longitude": point["longitude"],
            "pixel_x": point["pixel_x"],
            "pixel_y": point["pixel_y"],
            "area_pixels": point["area_pixels"]
        })

    if len(waypoints) == 0:
        return [], [], 0

    distance_matrix = (
        create_distance_matrix(
            waypoints
        )
    )

    route_indices, total_distance = (
        shortest_tsp_route(
            distance_matrix
        )
    )

    optimized_route = [
        waypoints[index]
        for index in route_indices
    ]

    return (
        waypoints,
        optimized_route,
        total_distance
    )
