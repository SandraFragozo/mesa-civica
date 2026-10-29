import hashlib
import math
import unittest
import xml.etree.ElementTree as ET

from ccpc import STATES
from ccpc.mapa import MAPS, SVG_NS, area_centroid, filled_paths, interactive_svg, path_rings, point_inside, verified_mapping


class SvgMappingTests(unittest.TestCase):
    def test_exactly_32_entities_and_all_84_pieces_once(self):
        _, paths, entities, _ = verified_mapping()
        self.assertEqual(len(entities), 32)
        self.assertEqual({entity["edocve"] for entity in entities}, set(range(1, 33)))
        indices = [index for entity in entities for index in entity["path_indices"]]
        self.assertEqual(len(indices), len(set(indices)))
        self.assertEqual(sorted(indices), list(range(84)))
        self.assertEqual(len(paths), 84)

    def test_independent_inegi_centroids_inside_the_correct_mainland(self):
        _, paths, entities, mapping = verified_mapping()
        affine = mapping["affine_lonlat_to_svg"]
        for entity in entities:
            lon, lat = entity["official_centroid_lonlat"]
            point = [lon * affine[0][axis] + lat * affine[1][axis] + affine[2][axis] for axis in (0, 1)]
            self.assertLess(math.dist(point, entity["svg_centroid"]), 12, entity["name"])
            owners = []
            for candidate in entities:
                rings = path_rings(paths[candidate["principal_path"]].get("d"))
                ring = max(rings, key=lambda value: area_centroid(value)[0])
                if point_inside(point, ring):
                    owners.append(candidate["edocve"])
            self.assertEqual(owners, [entity["edocve"]], entity["name"])

    def test_borders_match_grayscale_and_extra_islet_is_recognized(self):
        _, gray, entities, mapping = verified_mapping()
        path = MAPS / mapping["borders_source_file"]
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), mapping["borders_source_sha256"])
        _, borders = filled_paths(path)
        self.assertEqual(len(borders), 85)
        for index, source in enumerate(gray):
            points_a = [point for ring in path_rings(source.get("d")) for point in ring]
            points_b = [point for ring in path_rings(borders[index].get("d")) for point in ring]
            for axis in (0, 1):
                for operation in (min, max):
                    self.assertLess(abs(operation(point[axis] for point in points_a) - operation(point[axis] for point in points_b)), 2)
        extra = mapping["borders_extra_path"]
        a = area_centroid(path_rings(borders[extra["index"]].get("d"))[0])[1]
        b = area_centroid(path_rings(gray[extra["equivalent_grayscale_path"]].get("d"))[0])[1]
        self.assertLess(math.dist(a, b), 2)
        self.assertIn(extra["equivalent_grayscale_path"], next(entity for entity in entities if entity["edocve"] == 3)["path_indices"])

    def test_islands_and_small_central_states_are_not_swapped(self):
        _, _, entities, _ = verified_mapping()
        mapping = {entity["edocve"]: entity for entity in entities}
        self.assertEqual(mapping[9]["principal_path"], 83)
        self.assertEqual(mapping[15]["principal_path"], 72)
        self.assertEqual(mapping[17]["principal_path"], 74)
        self.assertEqual(mapping[6]["path_indices"], [34, 35, 36, 37])
        self.assertEqual(mapping[18]["path_indices"], [38, 39, 40, 41, 42])

    def test_rendered_svg_has_unique_accessible_state_groups(self):
        root = ET.fromstring(interactive_svg())
        groups = root.findall(f"{{{SVG_NS}}}g")
        self.assertEqual(len(groups), 32)
        self.assertEqual(len({group.get("id") for group in groups}), 32)
        for group in groups:
            code = int(group.get("data-edocve"))
            self.assertEqual(group.get("aria-label"), STATES[code])
            self.assertEqual(group.get("tabindex"), "0")
            self.assertGreater(len(group.findall(f"{{{SVG_NS}}}path")), 0)


if __name__ == "__main__":
    unittest.main()
