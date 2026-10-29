import hashlib
import json
import math
import re
import xml.etree.ElementTree as ET

from ccpc import BASE, STATES


MAPS = BASE / "assets" / "mapas"
SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


def filled_paths(path):
    root = ET.parse(path).getroot()
    paths = [node for node in root.iter() if node.tag == f"{{{SVG_NS}}}path" and not node.get("style", "").startswith("fill:none")]
    return root, paths


def path_rings(data):
    if set(re.findall(r"[A-Za-z]", data)) - set("MmlZ"):
        raise ValueError("El SVG usa comandos diferentes de los verificados")
    rings, points = [], []
    x = y = 0.0
    start = (x, y)
    for command, values in re.findall(r"([MmlZ])([^MmlZ]*)", data):
        numbers = [float(value) for value in re.findall(r"-?\d+(?:\.\d+)?", values)]
        if command == "Z":
            if points:
                rings.append(points)
            points = []
            x, y = start
            continue
        for index in range(0, len(numbers), 2):
            x, y = (numbers[index], numbers[index + 1]) if command == "M" else (x + numbers[index], y + numbers[index + 1])
            if command in "Mm" and index == 0:
                start = (x, y)
            points.append((x, y))
    return rings


def area_centroid(points):
    cross = [a[0] * b[1] - b[0] * a[1] for a, b in zip(points, points[1:] + points[:1])]
    area = sum(cross) / 2
    if abs(area) < 1e-10:
        raise ValueError("Polígono degenerado")
    center = tuple(sum((a[axis] + b[axis]) * value for a, b, value in zip(points, points[1:] + points[:1], cross)) / (6 * area) for axis in (0, 1))
    return abs(area), center


def point_inside(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def verified_mapping():
    mapping = json.loads((MAPS / "vinculacion_edocve.json").read_text(encoding="utf-8"))
    source = MAPS / mapping["source_file"]
    if hashlib.sha256(source.read_bytes()).hexdigest() != mapping["source_sha256"]:
        raise ValueError("Cambió el SVG original: revisar la vinculación antes de regenerar")
    root, paths = filled_paths(source)
    entities = mapping["entities"]
    if len(entities) != 32 or {entity["edocve"] for entity in entities} != set(STATES):
        raise ValueError("Las 32 claves EDOCVE deben aparecer exactamente una vez")
    indices = [index for entity in entities for index in entity["path_indices"]]
    if len(indices) != len(set(indices)) or sorted(indices) != list(range(len(paths))):
        raise ValueError("Trazos faltantes o duplicados en la vinculación")
    for entity in entities:
        if entity["name"] != STATES[entity["edocve"]] or entity["principal_path"] not in entity["path_indices"]:
            raise ValueError("Entidad o superficie principal inconsistente")
        rings = path_rings(paths[entity["principal_path"]].get("d"))
        principal = max(rings, key=lambda ring: area_centroid(ring)[0])
        center = area_centroid(principal)[1]
        reference = entity["official_reference_svg"]
        if math.dist(center, reference) > 12 or not point_inside(reference, principal):
            raise ValueError(f"La geometría no coincide con la referencia independiente de {entity['name']}")
    return root, paths, entities, mapping


def interactive_svg():
    root, paths, entities, mapping = verified_mapping()
    svg = ET.Element(f"{{{SVG_NS}}}svg", {"viewBox": root.get("viewBox"), "id": "mexico-map", "role": "group", "aria-label": "Mapa de México: selecciona una entidad para explorar sus datos", "preserveAspectRatio": "xMidYMid meet"})
    for entity in entities:
        code = entity["edocve"]
        group = ET.SubElement(svg, f"{{{SVG_NS}}}g", {"id": f"mx-{code:02}", "data-edocve": str(code), "class": "state", "role": "button", "tabindex": "0", "aria-label": entity["name"], "aria-pressed": "false"})
        ET.SubElement(group, f"{{{SVG_NS}}}title").text = entity["name"]
        for index in entity["path_indices"]:
            ET.SubElement(group, f"{{{SVG_NS}}}path", {"d": paths[index].get("d"), "fill-rule": "nonzero", "data-source-path": str(index)})
    return ET.tostring(svg, encoding="unicode")
