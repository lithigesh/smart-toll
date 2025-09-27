const { createClient } = require('@supabase/supabase-js');const { createClient } = require('@supabase/supabase-js');const { createClient } = require('@supabase/supabase-js');



const supabase = createClient(

  process.env.SUPABASE_URL,

  process.env.SUPABASE_SERVICE_ROLE_KEY,const supabase = createClient(const supabase = createClient(

  {

    auth: {  process.env.SUPABASE_URL,  process.env.SUPABASE_URL,

      autoRefreshToken: false,

      persistSession: false  process.env.SUPABASE_SERVICE_ROLE_KEY,  process.env.SUPABASE_SERVICE_ROLE_KEY,

    }

  }  {  {

);

    auth: {    auth: {

class TollRoadZone {

  /**      autoRefreshToken: false,      autoRefreshToken: false,

   * Find toll zones containing a GPS point using PostGIS

   * @param {number} latitude - GPS latitude      persistSession: false      persistSession: false

   * @param {number} longitude - GPS longitude

   * @returns {Promise<Array>} - Array of zones containing the point    }    }

   */

  static async findZonesContainingPoint(latitude, longitude) {  }  }

    const { data, error } = await supabase.rpc('detect_zone_membership', {

      input_lat: latitude,););

      input_lon: longitude

    });



    if (error) {class TollRoadZone {class TollRoadZone {

      console.error('Error detecting zone membership:', error);

      throw error;  /**  /**

    }

   * Get all active toll road zones   * Get all active toll road zones

    return data || [];

  }   * @returns {Promise<Array>} - Array of toll road zones   * @returns {Promise<Array>} - Array of toll road zones



  /**   */   */

   * Find the primary toll zone containing a point (returns first match)

   * @param {number} latitude - GPS latitude    static async getAll() {  static async getAll() {

   * @param {number} longitude - GPS longitude

   * @returns {Promise<Object|null>} - First zone containing the point or null    const { data, error } = await supabase    const { data, error } = await supabase

   */

  static async findZoneContainingPoint(latitude, longitude) {      .from('toll_road_zones')      .from('toll_road_zones')

    const zones = await this.findZonesContainingPoint(latitude, longitude);

    return zones && zones.length > 0 ? zones[0] : null;      .select(`      .select(`

  }

        *,        *,

  /**

   * Get all active toll road zones        toll_roads (        toll_roads (

   * @returns {Promise<Array>} - Array of toll road zones

   */          id,          id,

  static async getAll() {

    const { data, error } = await supabase          name,          name,

      .from('toll_road_zones')

      .select(`          rate_per_km,          rate_per_km,

        *,

        toll_roads (          minimum_fare,          minimum_fare,

          id,

          name,          is_active          is_active

          rate_per_km,

          minimum_fare,        )        )

          is_active

        )      `)      `)

      `)

      .eq('is_active', true)      .eq('is_active', true)      .eq('is_active', true)

      .order('name');

          .order('name');      .order('name');

    if (error) {

      console.error('Error fetching toll road zones:', error);        

      throw error;

    }    if (error) {    if (error) {

    

    return data;      console.error('Error fetching toll road zones:', error);      console.error('Error fetching toll road zones:', error);

  }

      throw error;      throw error;

  /**

   * Get toll road zone by ID    }    }

   * @param {string} zoneId - Zone ID

   * @returns {Promise<Object|null>} - Toll road zone or null        

   */

  static async getById(zoneId) {    return data;    return data;

    const { data, error } = await supabase

      .from('toll_road_zones')  }  }

      .select(`

        *,

        toll_roads (

          id,  /**  /**

          name,

          rate_per_km,   * Get toll road zone by ID   * Get toll road zone by ID

          minimum_fare,

          is_active   * @param {string} zoneId - Zone ID   * @param {string} zoneId - Zone ID

        )

      `)   * @returns {Promise<Object|null>} - Toll road zone or null   * @returns {Promise<Object|null>} - Toll road zone or null

      .eq('id', zoneId)

      .single();   */   */

    

    if (error && error.code !== 'PGRST116') {  static async getById(zoneId) {  static async getById(zoneId) {

      console.error('Error fetching toll road zone:', error);

      throw error;    const { data, error } = await supabase    const { data, error } = await supabase

    }

          .from('toll_road_zones')      .from('toll_road_zones')

    return data;

  }      .select(`      .select(`



  /**        *,        *,

   * Get zones with their toll roads and rates

   * @returns {Promise<Array>} - Zones with complete rate information        toll_roads (        toll_roads (

   */

  static async getZonesWithRates() {          id,          id,

    const { data, error } = await supabase

      .from('toll_road_zones')          name,          name,

      .select(`

        id,          rate_per_km,          rate_per_km,

        name,

        description,          minimum_fare,          minimum_fare,

        is_active,

        created_at,          is_active          is_active

        toll_roads (

          id,        )        )

          name,

          rate_per_km,      `)      `)

          minimum_fare,

          is_active,      .eq('id', zoneId)      .eq('id', zoneId)

          vehicle_type_rates (

            id,      .single();      .single();

            vehicle_type,

            rate_per_km        

          )

        )    if (error && error.code !== 'PGRST116') {    if (error && error.code !== 'PGRST116') {

      `)

      .eq('is_active', true)      console.error('Error fetching toll road zone:', error);      console.error('Error fetching toll road zone:', error);

      .order('name');

      throw error;      throw error;

    if (error) {

      console.error('Error fetching zones with rates:', error);    }    }

      throw error;

    }        



    return data || [];    return data;    return data;

  }

}  }  }



module.exports = TollRoadZone;

  /**  /**

   * Find toll zones containing a GPS point using PostGIS   * Find toll zones containing a GPS point using PostGIS

   * @param {number} latitude - GPS latitude   * @param {number} latitude - GPS latitude

   * @param {number} longitude - GPS longitude   * @param {number} longitude - GPS longitude

   * @returns {Promise<Array>} - Array of zones containing the point   * @returns {Promise<Array>} - Array of zones containing the point

   */   */

  static async findZonesContainingPoint(latitude, longitude) {  static async findZonesContainingPoint(latitude, longitude) {

    const { data, error } = await supabase.rpc('detect_zone_membership', {    const { data, error } = await supabase.rpc('detect_zone_membership', {

      input_lat: latitude,      input_lat: latitude,

      input_lon: longitude      input_lon: longitude

    });    });



    if (error) {    if (error) {

      console.error('Error detecting zone membership:', error);      console.error('Error detecting zone membership:', error);

      throw error;      throw error;

    }    }



    return data || [];    return data || [];

  }  }



  /**  /**

   * Find the primary toll zone containing a point (returns first match)   * Find the primary toll zone containing a point (returns first match)

   * @param {number} latitude - GPS latitude     * @param {number} latitude - GPS latitude  

   * @param {number} longitude - GPS longitude   * @param {number} longitude - GPS longitude

   * @returns {Promise<Object|null>} - First zone containing the point or null   * @returns {Promise<Object|null>} - First zone containing the point or null

   */   */

  static async findZoneContainingPoint(latitude, longitude) {  static async findZoneContainingPoint(latitude, longitude) {

    const zones = await this.findZonesContainingPoint(latitude, longitude);    const zones = await this.findZonesContainingPoint(latitude, longitude);

    return zones && zones.length > 0 ? zones[0] : null;    return zones && zones.length > 0 ? zones[0] : null;

  }  }



  /**  /**

   * Get zones with their toll roads and rates   * Check if a point is within a specific zone

   * @returns {Promise<Array>} - Zones with complete rate information   * @param {string} zoneId - Zone ID

   */   * @param {number} latitude - GPS latitude

  static async getZonesWithRates() {   * @param {number} longitude - GPS longitude

    const { data, error } = await supabase   * @returns {Promise<boolean>} - True if point is within zone

      .from('toll_road_zones')   */

      .select(`  static async isPointInZone(zoneId, latitude, longitude) {

        id,    const { data, error } = await supabase.rpc('st_within', {

        name,      point: `SRID=4326;POINT(${longitude} ${latitude})`,

        description,      polygon_id: zoneId

        is_active,    });

        created_at,

        toll_roads (    if (error) {

          id,      console.error('Error checking point in zone:', error);

          name,      throw error;

          rate_per_km,    }

          minimum_fare,

          is_active,    return data === true;

          vehicle_type_rates (  }

            id,

            vehicle_type,  /**

            rate_per_km   * Get zones with their toll roads and rates

          )   * @returns {Promise<Array>} - Zones with complete rate information

        )   */

      `)  static async getZonesWithRates() {

      .eq('is_active', true)    const { data, error } = await supabase

      .order('name');      .from('toll_road_zones')

      .select(`

    if (error) {        id,

      console.error('Error fetching zones with rates:', error);        name,

      throw error;        description,

    }        is_active,

        created_at,

    return data || [];        toll_roads (

  }          id,

          name,

  /**          rate_per_km,

   * Convert coordinates array to PostGIS polygon WKT format          minimum_fare,

   * @param {Array} coordinates - Array of [longitude, latitude] pairs          is_active,

   * @returns {string} - PostGIS polygon WKT string          vehicle_type_rates (

   */            id,

  static coordinatesToPolygonWKT(coordinates) {            vehicle_type,

    if (!coordinates || coordinates.length < 3) {            rate_per_km

      throw new Error('Polygon must have at least 3 coordinates');          )

    }        )

      `)

    // Ensure polygon is closed (first and last points are the same)      .eq('is_active', true)

    const firstPoint = coordinates[0];      .order('name');

    const lastPoint = coordinates[coordinates.length - 1];

    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {    if (error) {

      coordinates.push(firstPoint);      console.error('Error fetching zones with rates:', error);

    }      throw error;

    }

    const wktCoords = coordinates

      .map(coord => `${coord[0]} ${coord[1]}`)    return data || [];

      .join(', ');  }



    return `SRID=4326;POLYGON((${wktCoords}))`;  /**

  }   * Create a new toll road zone

   * @param {Object} zoneData - Zone data

  /**   * @param {string} zoneData.name - Zone name

   * Get nearby zones within distance   * @param {string} zoneData.description - Zone description

   * @param {number} latitude - Center latitude   * @param {Array} zoneData.polygon_coordinates - Array of [lon, lat] coordinates

   * @param {number} longitude - Center longitude     * @returns {Promise<Object>} - Created zone

   * @param {number} radiusKm - Radius in kilometers   */

   * @returns {Promise<Array>} - Nearby zones  static async create(zoneData) {

   */    // Convert coordinates array to PostGIS polygon format

  static async getNearbyZones(latitude, longitude, radiusKm = 10) {    const polygonWKT = this.coordinatesToPolygonWKT(zoneData.polygon_coordinates);

    const { data, error } = await supabase.rpc('get_nearby_zones', {    

      center_lat: latitude,    const { data, error } = await supabase

      center_lon: longitude,      .from('toll_road_zones')

      radius_km: radiusKm      .insert({

    });        name: zoneData.name,

        description: zoneData.description,

    if (error) {        zone_polygon: polygonWKT,

      console.error('Error getting nearby zones:', error);        is_active: true,

      throw error;        created_at: new Date().toISOString()

    }      })

      .select()

    return data || [];      .single();

  }

}    if (error) {

      console.error('Error creating toll road zone:', error);

module.exports = TollRoadZone;      throw error;
    }

    return data;
  }

  /**
   * Update toll road zone
   * @param {string} zoneId - Zone ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated zone
   */
  static async update(zoneId, updates) {
    // If polygon coordinates are being updated, convert to WKT
    if (updates.polygon_coordinates) {
      updates.zone_polygon = this.coordinatesToPolygonWKT(updates.polygon_coordinates);
      delete updates.polygon_coordinates;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('toll_road_zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();

    if (error) {
      console.error('Error updating toll road zone:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete toll road zone (soft delete)
   * @param {string} zoneId - Zone ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(zoneId) {
    const { error } = await supabase
      .from('toll_road_zones')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', zoneId);

    if (error) {
      console.error('Error deleting toll road zone:', error);
      throw error;
    }

    return true;
  }

  /**
   * Get zone boundaries as GeoJSON
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object>} - GeoJSON representation of zone
   */
  static async getZoneGeoJSON(zoneId) {
    const { data, error } = await supabase.rpc('st_asgeojson', {
      zone_id: zoneId
    });

    if (error) {
      console.error('Error getting zone GeoJSON:', error);
      throw error;
    }

    return JSON.parse(data);
  }

  /**
   * Convert coordinates array to PostGIS polygon WKT format
   * @param {Array} coordinates - Array of [longitude, latitude] pairs
   * @returns {string} - PostGIS polygon WKT string
   */
  static coordinatesToPolygonWKT(coordinates) {
    if (!coordinates || coordinates.length < 3) {
      throw new Error('Polygon must have at least 3 coordinates');
    }

    // Ensure polygon is closed (first and last points are the same)
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push(firstPoint);
    }

    const wktCoords = coordinates
      .map(coord => `${coord[0]} ${coord[1]}`)
      .join(', ');

    return `SRID=4326;POLYGON((${wktCoords}))`;
  }

  /**
   * Get nearby zones within distance
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude  
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>} - Nearby zones
   */
  static async getNearbyZones(latitude, longitude, radiusKm = 10) {
    const { data, error } = await supabase.rpc('get_nearby_zones', {
      center_lat: latitude,
      center_lon: longitude,
      radius_km: radiusKm
    });

    if (error) {
      console.error('Error getting nearby zones:', error);
      throw error;
    }

    return data || [];
  }
}

module.exports = TollRoadZone;
    
    return data || null;
  }

  /**
   * Check if a GPS point is within any toll zone
   * Uses PostGIS ST_Within function
   * @param {number} latitude - GPS latitude
   * @param {number} longitude - GPS longitude
   * @returns {Promise<Object|null>} - Toll zone if point is within, null otherwise
   */
  static async findZoneContainingPoint(latitude, longitude) {
    try {
      // Use PostGIS function to check if point is within any toll zone polygon
      const { data, error } = await supabase.rpc('find_toll_zone_for_point', {
        lat: latitude,
        lon: longitude
      });

      if (error) {
        console.error('Error checking point in toll zones:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in findZoneContainingPoint:', error);
      throw error;
    }
  }

  /**
   * Get toll zones within a specific area (bounding box)
   * @param {Object} bounds - Bounding box coordinates
   * @param {number} bounds.north - North boundary
   * @param {number} bounds.south - South boundary  
   * @param {number} bounds.east - East boundary
   * @param {number} bounds.west - West boundary
   * @returns {Promise<Array>} - Array of toll zones within bounds
   */
  static async getZonesInBounds({ north, south, east, west }) {
    try {
      const { data, error } = await supabase.rpc('get_zones_in_bounds', {
        north_lat: north,
        south_lat: south,
        east_lon: east,
        west_lon: west
      });

      if (error) {
        console.error('Error fetching zones in bounds:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getZonesInBounds:', error);
      throw error;
    }
  }

  /**
   * Create a new toll road zone
   * @param {Object} zoneData - Zone data
   * @returns {Promise<Object>} - Created zone
   */
  static async create(zoneData) {
    const { data, error } = await supabase
      .from('toll_road_zones')
      .insert(zoneData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating toll road zone:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Update toll road zone
   * @param {string} zoneId - Zone ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated zone
   */
  static async update(zoneId, updates) {
    const { data, error } = await supabase
      .from('toll_road_zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating toll road zone:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Delete toll road zone (soft delete - set is_active to false)
   * @param {string} zoneId - Zone ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(zoneId) {
    const { error } = await supabase
      .from('toll_road_zones')
      .update({ is_active: false })
      .eq('id', zoneId);
    
    if (error) {
      console.error('Error deleting toll road zone:', error);
      throw error;
    }
    
    return true;
  }
}

module.exports = TollRoadZone;