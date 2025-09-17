const { supabase } = require('../config/db');

class TollPassage {
    // Create a new toll passage record
    static async create(passageData) {
        try {
            const { data, error } = await supabase
                .from('toll_passages')
                .insert([{
                    user_id: passageData.user_id,
                    vehicle_id: passageData.vehicle_id,
                    toll_gate_id: passageData.toll_gate_id,
                    charge: passageData.charge,
                    balance_after: passageData.balance_after,
                    passage_timestamp: passageData.passage_timestamp || new Date().toISOString()
                }])
                .select('*')
                .single();

            if (error) {
                throw new Error(`Failed to create toll passage: ${error.message}`);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    // Get toll passages by user ID with pagination
    static async getByUserId(userId, options = {}) {
        try {
            const { page = 1, limit = 10, vehicleId = null, tollGateId = null } = options;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('toll_passages')
                .select(`
                    id,
                    charge,
                    balance_after,
                    passage_timestamp,
                    created_at,
                    vehicles!inner(
                        id,
                        license_plate,
                        make,
                        model,
                        vehicle_type
                    ),
                    toll_gates!inner(
                        id,
                        name,
                        location,
                        toll_amount
                    )
                `)
                .eq('user_id', userId)
                .order('passage_timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            // Apply filters if provided
            if (vehicleId) {
                query = query.eq('vehicle_id', vehicleId);
            }

            if (tollGateId) {
                query = query.eq('toll_gate_id', tollGateId);
            }

            const { data, error, count } = await query;

            if (error) {
                throw new Error(`Failed to fetch toll passages: ${error.message}`);
            }

            return {
                passages: data || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get toll passages by vehicle ID
    static async getByVehicleId(vehicleId, options = {}) {
        try {
            const { page = 1, limit = 10 } = options;
            const offset = (page - 1) * limit;

            const { data, error, count } = await supabase
                .from('toll_passages')
                .select(`
                    id,
                    charge,
                    balance_after,
                    passage_timestamp,
                    created_at,
                    users!inner(
                        id,
                        name,
                        email
                    ),
                    toll_gates!inner(
                        id,
                        name,
                        location,
                        toll_amount
                    )
                `, { count: 'exact' })
                .eq('vehicle_id', vehicleId)
                .order('passage_timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw new Error(`Failed to fetch toll passages by vehicle: ${error.message}`);
            }

            return {
                passages: data || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get toll passages by toll gate ID (for toll gate analytics)
    static async getByTollGateId(tollGateId, options = {}) {
        try {
            const { page = 1, limit = 10, startDate = null, endDate = null } = options;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('toll_passages')
                .select(`
                    id,
                    charge,
                    balance_after,
                    passage_timestamp,
                    created_at,
                    users!inner(
                        id,
                        name,
                        email
                    ),
                    vehicles!inner(
                        id,
                        license_plate,
                        make,
                        model,
                        vehicle_type
                    )
                `, { count: 'exact' })
                .eq('toll_gate_id', tollGateId)
                .order('passage_timestamp', { ascending: false })
                .range(offset, offset + limit - 1);

            // Apply date filters if provided
            if (startDate) {
                query = query.gte('passage_timestamp', startDate);
            }

            if (endDate) {
                query = query.lte('passage_timestamp', endDate);
            }

            const { data, error, count } = await query;

            if (error) {
                throw new Error(`Failed to fetch toll passages by toll gate: ${error.message}`);
            }

            return {
                passages: data || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get recent toll passages (for dashboard)
    static async getRecent(limit = 5) {
        try {
            const { data, error } = await supabase
                .from('toll_passages')
                .select(`
                    id,
                    charge,
                    balance_after,
                    passage_timestamp,
                    users!inner(
                        id,
                        name,
                        email
                    ),
                    vehicles!inner(
                        id,
                        license_plate,
                        make,
                        model
                    ),
                    toll_gates!inner(
                        id,
                        name,
                        location
                    )
                `)
                .order('passage_timestamp', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(`Failed to fetch recent toll passages: ${error.message}`);
            }

            return data || [];
        } catch (error) {
            throw error;
        }
    }

    // Get toll passage statistics for a user
    static async getUserStats(userId, period = '30 days') {
        try {
            const startDate = new Date();
            const days = period === '7 days' ? 7 : period === '30 days' ? 30 : 90;
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('toll_passages')
                .select('charge, toll_gate_id, passage_timestamp')
                .eq('user_id', userId)
                .gte('passage_timestamp', startDate.toISOString());

            if (error) {
                throw new Error(`Failed to fetch toll passage stats: ${error.message}`);
            }

            const passages = data || [];
            const totalAmount = passages.reduce((sum, passage) => sum + parseFloat(passage.charge), 0);
            const totalPassages = passages.length;
            const uniqueTollGates = new Set(passages.map(p => p.toll_gate_id)).size;

            return {
                period,
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                totalPassages,
                uniqueTollGates,
                averagePerPassage: totalPassages > 0 ? parseFloat((totalAmount / totalPassages).toFixed(2)) : 0
            };
        } catch (error) {
            throw error;
        }
    }

    // Get toll passage by ID
    static async getById(passageId) {
        try {
            const { data, error } = await supabase
                .from('toll_passages')
                .select(`
                    id,
                    charge,
                    balance_after,
                    passage_timestamp,
                    created_at,
                    users!inner(
                        id,
                        name,
                        email
                    ),
                    vehicles!inner(
                        id,
                        license_plate,
                        make,
                        model,
                        vehicle_type
                    ),
                    toll_gates!inner(
                        id,
                        name,
                        location,
                        toll_amount
                    )
                `)
                .eq('id', passageId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // No rows found
                }
                throw new Error(`Failed to fetch toll passage: ${error.message}`);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    // Delete a toll passage (admin only)
    static async delete(passageId) {
        try {
            const { error } = await supabase
                .from('toll_passages')
                .delete()
                .eq('id', passageId);

            if (error) {
                throw new Error(`Failed to delete toll passage: ${error.message}`);
            }

            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TollPassage;