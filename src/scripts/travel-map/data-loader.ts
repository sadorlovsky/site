import type {
  Trip,
  TripDestination,
  CityFeature,
  CitiesGeoJSON,
} from "./types";
import { DataLoadError } from "./types";

export interface LoadedData {
  cities: CityFeature[];
  visitedCityNames: Set<string>;
  totalTrips: number;
  visitedCitiesCount: number;
}

export class DataLoader {
  private readonly citiesUrl = "/cities.geojson";
  private readonly tripsUrl = "/trips.json";

  /**
   * Loads and processes both cities and trips data
   */
  async loadData(): Promise<LoadedData> {
    try {
      // Load both datasets in parallel
      const [citiesResponse, tripsResponse] = await Promise.all([
        fetch(this.citiesUrl),
        fetch(this.tripsUrl),
      ]);

      // Check for HTTP errors
      this.validateResponses(citiesResponse, tripsResponse);

      // Parse JSON data
      const citiesData: CitiesGeoJSON = await citiesResponse.json();
      const tripsData: Trip[] = await tripsResponse.json();

      // Validate data structure
      this.validateData(citiesData, tripsData);

      // Process visited cities from trips
      const visitedCityNames = this.processVisitedCities(tripsData);

      // Filter only visited cities
      const visitedCities = this.filterVisitedCities(
        citiesData.features,
        visitedCityNames,
      );

      const result: LoadedData = {
        cities: visitedCities,
        visitedCityNames,
        totalTrips: tripsData.length,
        visitedCitiesCount: visitedCities.length,
      };

      return result;
    } catch (error) {
      console.error("Failed to load travel data:", error);
      throw this.createDataLoadError(error);
    }
  }

  /**
   * Validates HTTP responses
   */
  private validateResponses(
    citiesResponse: Response,
    tripsResponse: Response,
  ): void {
    if (!citiesResponse.ok || !tripsResponse.ok) {
      throw new DataLoadError(
        `HTTP error! Cities: ${citiesResponse.status}, Trips: ${tripsResponse.status}`,
        citiesResponse.status || tripsResponse.status,
      );
    }
  }

  /**
   * Validates the structure of loaded data
   */
  private validateData(citiesData: any, tripsData: any): void {
    if (!citiesData?.features || !Array.isArray(citiesData.features)) {
      throw new DataLoadError(
        "Invalid GeoJSON format: missing or invalid features array",
      );
    }

    if (!Array.isArray(tripsData)) {
      throw new DataLoadError("Invalid trips data format: expected array");
    }

    // Validate at least one feature has required structure
    if (citiesData.features.length > 0) {
      const firstFeature = citiesData.features[0];
      if (
        !firstFeature.geometry?.coordinates ||
        !firstFeature.properties?.name
      ) {
        throw new DataLoadError(
          "Invalid GeoJSON feature structure: missing geometry or properties",
        );
      }
    }
  }

  /**
   * Processes trips data to extract visited city names
   */
  private processVisitedCities(tripsData: Trip[]): Set<string> {
    const visitedCityNames = new Set<string>();

    tripsData.forEach((trip: Trip) => {
      // Only process trips that have actually happened (date !== "TBA")
      if (trip.date !== "TBA" && trip.destination) {
        trip.destination.forEach((dest: TripDestination) => {
          // Handle cities with comma-separated names
          const cities = dest.city.split(",").map((c: string) => c.trim());

          cities.forEach((cityName: string) => {
            const normalizedName = this.normalizeCityName(cityName);
            visitedCityNames.add(normalizedName);

            // Add common name variations
            this.addCityVariations(normalizedName, visitedCityNames);
          });
        });
      }
    });

    return visitedCityNames;
  }

  /**
   * Normalizes city names for consistent matching
   */
  private normalizeCityName(cityName: string): string {
    return cityName.toLowerCase().replace(/\s+/g, " ").trim();
  }

  /**
   * Adds common variations of city names to the visited set
   */
  private addCityVariations(
    normalizedName: string,
    visitedCityNames: Set<string>,
  ): void {
    // Saint <-> St. variations
    if (normalizedName.includes("saint ")) {
      visitedCityNames.add(normalizedName.replace("saint ", "st. "));
    }
    if (normalizedName.includes("st. ")) {
      visitedCityNames.add(normalizedName.replace("st. ", "saint "));
    }

    // Add other common variations as needed
    // This is extensible for other city name patterns
  }

  /**
   * Filters cities to only include visited ones
   */
  private filterVisitedCities(
    cities: CityFeature[],
    visitedCityNames: Set<string>,
  ): CityFeature[] {
    return cities.filter((city: CityFeature) => {
      if (!city.geometry?.coordinates || !city.properties?.name) {
        return false;
      }

      const cityName = this.normalizeCityName(city.properties.name);
      const isVisited = this.isCityVisited(cityName, visitedCityNames);

      if (!isVisited) {
        return false;
      }
      return true;
    });
  }

  /**
   * Checks if a city is visited, including common name variations
   */
  private isCityVisited(
    cityName: string,
    visitedCityNames: Set<string>,
  ): boolean {
    // Direct match
    if (visitedCityNames.has(cityName)) {
      return true;
    }

    // Try Saint/St. variations
    if (cityName.includes("saint ")) {
      if (visitedCityNames.has(cityName.replace("saint ", "st. "))) {
        return true;
      }
    }
    if (cityName.includes("st. ")) {
      if (visitedCityNames.has(cityName.replace("st. ", "saint "))) {
        return true;
      }
    }

    // Handle specific common misspellings/variations
    const variations = this.getCityVariations(cityName);
    return variations.some((variation) => visitedCityNames.has(variation));
  }

  /**
   * Returns common variations for specific city names
   */
  private getCityVariations(cityName: string): string[] {
    const variations: string[] = [];

    // Add specific city variations
    switch (cityName) {
      case "delhi":
        variations.push("dehli");
        break;
      case "dehli":
        variations.push("delhi");
        break;
      // Add more city variations as needed
    }

    return variations;
  }

  /**
   * Creates appropriate error based on the original error
   */
  private createDataLoadError(error: unknown): DataLoadError {
    if (error instanceof DataLoadError) {
      return error;
    }

    if (error instanceof TypeError) {
      return new DataLoadError(
        "Data parsing error: Invalid data structure",
        undefined,
        error instanceof Error ? error : undefined,
      );
    }

    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        return new DataLoadError(
          "Network error: Failed to fetch data",
          undefined,
          error,
        );
      }

      return new DataLoadError(
        `Data loading failed: ${error.message}`,
        undefined,
        error,
      );
    }

    return new DataLoadError(
      "Unknown error occurred while loading data",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * Pre-validates URLs before attempting to fetch
   */
  async validateUrls(): Promise<boolean> {
    try {
      const [citiesHead, tripsHead] = await Promise.all([
        fetch(this.citiesUrl, { method: "HEAD" }),
        fetch(this.tripsUrl, { method: "HEAD" }),
      ]);

      return citiesHead.ok && tripsHead.ok;
    } catch {
      return false;
    }
  }

  /**
   * Gets the URLs being used for data loading
   */
  getDataUrls(): { cities: string; trips: string } {
    return {
      cities: this.citiesUrl,
      trips: this.tripsUrl,
    };
  }
}
