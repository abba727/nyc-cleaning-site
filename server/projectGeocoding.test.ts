import { describe, expect, it } from "vitest";
import { __testOnly } from "./projectGeocoding";

describe("project coordinate enrichment", () => {
  it("builds CSV safely for address components containing punctuation", () => {
    expect(__testOnly.buildBatchCsv([{
      id: 12,
      address: "12, Example \"Tower\" Plaza",
      city: "New York",
      state: "NY",
      zip: "10001",
    }])).toBe('12,"12, Example ""Tower"" Plaza",New York,NY,10001\n');
  });

  it("keeps matched latitude and longitude in the correct order", () => {
    const result = __testOnly.parseBatchResponse(
      '"12","12 Example Plaza, New York, NY, 10001","Match","Non_Exact","12 EXAMPLE PLZ, NEW YORK, NY, 10001","-73.996521,40.748441","123","L"\n'
      + '"13","Unknown","No_Match","","","","",""\n',
    );

    expect(result).toEqual([{
      id: 12,
      latitude: 40.748441,
      longitude: -73.996521,
    }]);
  });
});
