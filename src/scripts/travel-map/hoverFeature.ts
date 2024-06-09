// import type { MapGeoJSONFeature } from "maplibre-gl";

// let hoveredFeature: MapGeoJSONFeature | undefined = undefined;

// map.on("mousemove", "countries-fill", (e) => {
//   if (e.features?.length && e.features.length > 0) {
//     const feature = e.features[0];

//     if (hoveredFeature) {
//       map.setFeatureState(
//         {
//           source: hoveredFeature.source,
//           sourceLayer: hoveredFeature.sourceLayer,
//           id: hoveredFeature.id,
//         },
//         { hover: false }
//       );
//     }

//     hoveredFeature = feature;

//     map.setFeatureState(
//       {
//         source: feature.source,
//         sourceLayer: feature.sourceLayer,
//         id: feature.id,
//       },
//       { hover: true }
//     );
//   }
// });

// map.on("mouseleave", "countries-fill", () => {
//   if (hoveredFeature) {
//     map.setFeatureState(
//       {
//         source: hoveredFeature.source,
//         sourceLayer: hoveredFeature.sourceLayer,
//         id: hoveredFeature.id,
//       },
//       { hover: false }
//     );
//   }
//   hoveredFeature = undefined;
// });
