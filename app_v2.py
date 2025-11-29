import json
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer

def process_geojson(input_file, output_file):
    # Initialize transformer: UTM 47N (Thailand) -> WGS84
    # EPSG:32647 is UTM Zone 47N
    transformer = Transformer.from_crs("EPSG:32647", "EPSG:4326", always_xy=True)

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        processed_features = []

        for feature in data.get('features', []):
            properties = feature.get('properties', {})
            
            # 2. Process Properties
            lu_des_th = properties.get('LU_DES_TH', '')
            if "ร้าง" in lu_des_th or "Bush" in lu_des_th:
                status = "Carbon Sink"
            else:
                status = "Active Farm"

            # 3. Clean Data
            new_properties = {
                'id': properties.get('id'),
                'status': status,
                'crop_type': lu_des_th,
                'RAI': properties.get('RAI')
            }
            
            if new_properties['id'] is None:
                new_properties['id'] = feature.get('id')

            # 4. Reproject and Centroids
            geom = shape(feature['geometry'])
            
            # Transform geometry to WGS84
            wgs84_geom = transform(transformer.transform, geom)
            
            # Update feature geometry
            feature['geometry'] = mapping(wgs84_geom)

            # Calculate centroid
            centroid = wgs84_geom.centroid
            new_properties['lat'] = centroid.y
            new_properties['lng'] = centroid.x

            # Update feature
            feature['properties'] = new_properties
            processed_features.append(feature)

        data['features'] = processed_features

        # 5. Output
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Successfully processed {len(processed_features)} features. Saved to {output_file}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    process_geojson('rotational-farming.json', 'minified_farms.json')
