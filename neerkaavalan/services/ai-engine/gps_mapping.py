
import math


def pixel_to_gps(
    cx,
    cy,
    image_width,
    image_height,
    drone_lat,
    drone_lon,
    altitude,
    heading,
    hfov
):
    """
    Convert an image pixel coordinate into an estimated
    real-world GPS coordinate.

    Inputs:
        cx, cy       : garbage centroid in pixels
        image_width  : original image width
        image_height : original image height
        drone_lat    : drone latitude
        drone_lon    : drone longitude
        altitude     : drone altitude in metres
        heading      : drone heading in degrees
        hfov         : camera horizontal FOV in degrees

    Returns:
        garbage_lat, garbage_lon
    """

    # --------------------------------------------------------
    # Camera footprint
    # --------------------------------------------------------

    hfov_rad = math.radians(hfov)

    ground_width = (
        2
        * altitude
        * math.tan(hfov_rad / 2)
    )

    ground_height = (
        ground_width
        * image_height
        / image_width
    )

    # --------------------------------------------------------
    # Pixel offset from image centre
    # --------------------------------------------------------

    dx_pixel = (
        cx - image_width / 2
    )

    dy_pixel = (
        cy - image_height / 2
    )

    # --------------------------------------------------------
    # Pixel -> ground distance
    # --------------------------------------------------------

    dx = (
        dx_pixel
        / image_width
        * ground_width
    )

    dy = (
        dy_pixel
        / image_height
        * ground_height
    )

    # --------------------------------------------------------
    # Rotate using drone heading
    # --------------------------------------------------------

    heading_rad = math.radians(
        heading
    )

    east = (
        dx * math.cos(heading_rad)
        -
        dy * math.sin(heading_rad)
    )

    north = (
        -dx * math.sin(heading_rad)
        -
        dy * math.cos(heading_rad)
    )

    # --------------------------------------------------------
    # Convert metres -> latitude / longitude
    # --------------------------------------------------------

    earth_radius = 6378137.0

    delta_lat = (
        north
        / earth_radius
    )

    delta_lon = (
        east
        /
        (
            earth_radius
            * math.cos(
                math.radians(drone_lat)
            )
        )
    )

    garbage_lat = (
        drone_lat
        + math.degrees(delta_lat)
    )

    garbage_lon = (
        drone_lon
        + math.degrees(delta_lon)
    )

    return garbage_lat, garbage_lon
